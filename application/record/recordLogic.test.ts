import { openNodeDb } from '@/test/nodeDb';
import { ALL_DAYS } from '@/scheduler/plan';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { saveSlot, undoSlot, wipeLocalData } from '@/db/records';
import type { SlotRow } from '@/db/types';
import {
  continueCandidate,
  dayPrefix,
  emptySlotBefore,
  lastEndedSlot,
  slotRangeLabel,
  sourceFor,
  withRo,
} from './recordLogic';

const SEOUL = 'Asia/Seoul';
const at = (iso: string) => new Date(iso);

function row(slotStart: string, extra: Partial<SlotRow> = {}): SlotRow {
  return {
    slot_start: slotStart,
    tz: SEOUL,
    category: 'work',
    note: null,
    source: 'answered',
    answered_at: slotStart,
    client_updated_at: slotStart,
    ...extra,
  };
}

describe('기록 규칙', () => {
  it('지금 묻는 칸은 가장 최근에 끝난 칸이다', () => {
    // 14:31 KST → 14:00 칸
    expect(lastEndedSlot(at('2026-10-21T05:31:00Z'), SEOUL)).toBe('2026-10-21T05:00:00.000Z');
    // 14:30 정각 → 14:00 칸
    expect(lastEndedSlot(at('2026-10-21T05:30:00Z'), SEOUL)).toBe('2026-10-21T05:00:00.000Z');
    // 카트만두 06:10(+05:45) → 05:30 칸 = 23:45 UTC
    expect(lastEndedSlot(at('2026-10-21T00:25:00Z'), 'Asia/Kathmandu')).toBe('2026-10-20T23:45:00.000Z');
  });

  it('source: 60분 안이면 answered·continued, 지나면 late, 기존 칸은 그대로', () => {
    const s = '2026-10-21T05:00:00.000Z'; // 끝 05:30
    expect(sourceFor(s, at('2026-10-21T06:30:00Z'), null, false)).toBe('answered');
    expect(sourceFor(s, at('2026-10-21T06:30:00Z'), null, true)).toBe('continued');
    expect(sourceFor(s, at('2026-10-21T06:30:01Z'), null, false)).toBe('late');
    expect(sourceFor(s, at('2026-10-21T05:40:00Z'), { source: 'late' }, false)).toBe('late');
    expect(sourceFor(s, at('2026-10-21T05:40:00Z'), { source: 'inferred' }, false)).toBe('answered');
  });

  it('"그대로 계속"은 직전 60분 안 answered·continued 중 가장 최근 칸', () => {
    const s = '2026-10-21T05:00:00.000Z';
    const slots = [
      row('2026-10-21T03:30:00.000Z', { category: 'sleep' }), // 60분 밖
      row('2026-10-21T04:30:00.000Z', { category: 'rest', source: 'late' }),
      row('2026-10-21T04:00:00.000Z', { category: 'exercise' }),
    ];
    expect(continueCandidate(s, slots)?.category).toBe('exercise');
    expect(continueCandidate(s, [row('2026-10-21T04:30:00.000Z', { source: 'late' })])).toBeNull();
  });

  it('빈 칸 안내는 앞 두 칸 중 아직 60분 안이고 방해금지가 아닌 칸', () => {
    const base = {
      slotStart: '2026-10-21T05:00:00.000Z', // 14:00 칸
      now: at('2026-10-21T05:31:00Z'),
      quiet: [],
      tz: SEOUL,
    };
    expect(emptySlotBefore({ ...base, filled: new Set() })).toBe('2026-10-21T04:30:00.000Z');
    // 13:30 칸이 차 있으면 13:00 칸. 14:30 정각은 13:00 칸 종료 후 딱 60분이라 아직 안이다.
    const filled = new Set(['2026-10-21T04:30:00.000Z']);
    expect(emptySlotBefore({ ...base, filled, now: at('2026-10-21T05:30:00Z') })).toBe(
      '2026-10-21T04:00:00.000Z',
    );
    expect(emptySlotBefore({ ...base, filled })).toBeNull();
    // 15:01이면 13:30 칸(14:00 종료)은 60분이 지나 시간표에서만 채운다
    expect(emptySlotBefore({ ...base, filled: new Set(), now: at('2026-10-21T06:01:00Z') })).toBeNull();
    expect(
      emptySlotBefore({ ...base, filled: new Set(), quiet: [{ startMin: 13 * 60, endMin: 14 * 60, days: ALL_DAYS }] }),
    ).toBeNull();
  });

  it('조사 로/으로를 받침에 맞춘다', () => {
    expect(['업무', '수면', '관계', '자기개발', '서울'].map(withRo)).toEqual([
      '업무로',
      '수면으로',
      '관계로',
      '자기개발로',
      '서울로',
    ]);
  });

  it('칸 시간 표시는 현지 시각이다', () => {
    expect(slotRangeLabel('2026-10-21T05:00:00.000Z', SEOUL)).toBe('14:00–14:30');
  });

  it('지난 날 칸은 시트 제목 앞에 날짜를 붙인다', () => {
    const now = at('2026-11-01T01:00:00Z'); // 11/1 10:00 KST
    expect(dayPrefix('2026-11-01T00:00:00.000Z', now, SEOUL)).toBe('');
    expect(dayPrefix('2026-10-31T05:00:00.000Z', now, SEOUL)).toBe('어제 ');
    expect(dayPrefix('2026-10-30T05:00:00.000Z', now, SEOUL)).toBe('10/30 ');
  });
});

describe('되돌리기와 전체 삭제', () => {
  async function setup() {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    return db;
  }

  it('새로 만든 칸을 되돌리면 로컬 행과 보내지 않은 큐 항목이 사라진다', async () => {
    const db = await setup();
    const keep = row('2026-10-21T04:30:00.000Z');
    const saved = row('2026-10-21T05:00:00.000Z');
    await saveSlot(db, keep);
    await saveSlot(db, saved);
    await undoSlot(db, saved, null);
    expect(await db.all('SELECT slot_start FROM slot')).toEqual([{ slot_start: keep.slot_start }]);
    const queued = await db.all<{ payload: string }>('SELECT payload FROM sync_queue');
    expect(queued.map((q) => JSON.parse(q.payload).slot_start)).toEqual([keep.slot_start]);
  });

  it('고친 칸을 되돌리면 이전 값이 더 최신 시각으로 다시 저장된다', async () => {
    const db = await setup();
    const prev = row('2026-10-21T05:00:00.000Z', { category: 'rest' });
    await saveSlot(db, prev);
    const saved = { ...prev, category: 'work' as const, client_updated_at: '2026-10-21T05:31:00.000Z' };
    await saveSlot(db, saved);
    await undoSlot(db, saved, prev);
    const [r] = await db.all<SlotRow>('SELECT * FROM slot');
    expect(r.category).toBe('rest');
    expect(r.client_updated_at > saved.client_updated_at).toBe(true);
  });

  it('회원탈퇴 후 로컬 데이터가 모두 지워진다', async () => {
    const db = await setup();
    await saveSlot(db, row('2026-10-21T05:00:00.000Z'));
    await wipeLocalData(db);
    expect(await db.all('SELECT * FROM slot')).toEqual([]);
    expect(await db.all('SELECT * FROM sync_queue')).toEqual([]);
  });
});
