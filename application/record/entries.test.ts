import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import type { SlotRow } from '@/db/types';
import { emptyParts, saveEntry, undoEntry } from './entries';

const MIN = 60_000;
const T = (hhmm: string) => `2026-11-19T${hhmm}:00.000Z`;
const ms = (hhmm: string) => Date.parse(T(hhmm));

function row(hhmm: string, extra: Partial<SlotRow> = {}): SlotRow {
  return {
    slot_start: T(hhmm),
    tz: 'Asia/Seoul',
    category: 'work',
    note: null,
    source: 'answered',
    answered_at: T(hhmm),
    client_updated_at: T(hhmm),
    ...extra,
  };
}

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  return db;
}

type E = { item_id: string; how: string; start_at: number; end_at: number | null; note: string | null };
const entries = (db: Awaited<ReturnType<typeof setup>>) =>
  db.all<E>("SELECT item_id, how, start_at, end_at, note FROM entry WHERE how NOT IN ('stopwatch', 'pomodoro', 'timer') ORDER BY start_at");

async function addTimer(
  db: Awaited<ReturnType<typeof setup>>,
  id: string,
  start: number,
  end: number | null,
  pauses: [number, number | null][] = [],
) {
  await db.run(
    `INSERT INTO entry (id, item_id, how, start_at, end_at, planned_end_at, tz, note, deleted, updated_at)
     VALUES (?, 'focus', 'stopwatch', ?, ?, NULL, 'Asia/Seoul', NULL, 0, 1)`,
    [id, start, end],
  );
  for (const [s, e] of pauses) await db.run('INSERT INTO pause VALUES (?, ?, ?)', [id, s, e]);
}

describe('saveEntry: 기록 쓰기 입구(T2)', () => {
  it('칸 하나를 30분 기록과 옛 칸에 함께 쓴다(업무 → 집중, 출처 → how)', async () => {
    const db = await setup();
    await saveEntry(db, [row('05:00', { source: 'continued', note: '메일' })]);
    expect(await entries(db)).toEqual([
      { item_id: 'focus', how: 'continued', start_at: ms('05:00'), end_at: ms('05:30'), note: '메일' },
    ]);
    expect(await db.all('SELECT slot_start, category FROM slot')).toEqual([{ slot_start: T('05:00'), category: 'work' }]);
    expect(await db.all('SELECT kind FROM sync_queue')).toEqual([{ kind: 'slot' }]);
  });

  it('같은 칸을 다시 쓰면(고치기·메모) 기록이 하나로 바뀐다', async () => {
    const db = await setup();
    await saveEntry(db, [row('05:00', { category: 'rest' })]);
    await saveEntry(db, [row('05:00', { category: 'exercise', note: '산책' })]);
    expect(await entries(db)).toEqual([
      { item_id: 'exercise', how: 'answered', start_at: ms('05:00'), end_at: ms('05:30'), note: '산책' },
    ]);
  });

  it('타이머가 덮은 부분은 빼고 빈 부분만 쓴다(OVERLAP D12: 15:00~15:47 타이머 뒤 15:30 칸 → 15:47~16:00)', async () => {
    const db = await setup();
    await addTimer(db, 't1', ms('15:00'), ms('15:47'));
    await saveEntry(db, [row('15:30')]);
    expect(await entries(db)).toEqual([
      { item_id: 'focus', how: 'answered', start_at: ms('15:47'), end_at: ms('16:00'), note: null },
    ]);
    // 옛 칸은 그대로 30분(읽는 곳이 옮겨질 때까지)
    expect(await db.all('SELECT slot_start FROM slot')).toEqual([{ slot_start: T('15:30') }]);
  });

  it('진행 중 타이머가 칸 전체를 덮으면 기록은 쓰지 않는다', async () => {
    const db = await setup();
    await addTimer(db, 't1', ms('15:00'), null);
    await saveEntry(db, [row('15:30')]);
    expect(await entries(db)).toEqual([]);
  });

  it('5분 이상 멈춘 틈은 채우고, 5분 미만 멈춤은 세션 안으로 본다(PAUSE)', async () => {
    const db = await setup();
    await addTimer(db, 'long', ms('15:00'), ms('16:00'), [[ms('15:40'), ms('15:50')]]);
    await addTimer(db, 'short', ms('17:00'), ms('18:00'), [[ms('17:40'), ms('17:43')]]);
    await saveEntry(db, [row('15:30'), row('17:30')]);
    expect((await entries(db)).map((e) => [e.start_at, e.end_at])).toEqual([[ms('15:40'), ms('15:50')]]);
  });

  it('지금 멈춤 중인 구간도 채울 수 있다', async () => {
    const db = await setup();
    await addTimer(db, 't1', ms('15:00'), null, [[ms('15:45'), null]]);
    await saveEntry(db, [row('15:30')]);
    expect((await entries(db)).map((e) => [e.start_at, e.end_at])).toEqual([[ms('15:45'), ms('16:00')]]);
  });

  it('여러 칸은 한 트랜잭션: 하나가 실패하면 아무것도 남지 않는다', async () => {
    const db = await setup();
    const bad = { ...row('06:00'), category: 'bogus' } as unknown as SlotRow;
    await expect(saveEntry(db, [row('05:30'), bad])).rejects.toThrow();
    expect(await db.all('SELECT * FROM entry')).toEqual([]);
    expect(await db.all('SELECT * FROM slot')).toEqual([]);
    expect(await db.all('SELECT * FROM sync_queue')).toEqual([]);
  });
});

describe('undoEntry: 기록 직후 되돌리기', () => {
  it('새로 만든 칸을 되돌리면 칸·기록·보내지 않은 큐 항목이 사라진다', async () => {
    const db = await setup();
    const keep = row('04:30');
    const saved = row('05:00');
    await saveEntry(db, [keep]);
    await saveEntry(db, [saved]);
    await undoEntry(db, saved, null);
    expect(await db.all('SELECT slot_start FROM slot')).toEqual([{ slot_start: keep.slot_start }]);
    expect((await entries(db)).map((e) => e.start_at)).toEqual([ms('04:30')]);
    const queued = await db.all<{ payload: string }>('SELECT payload FROM sync_queue');
    expect(queued.map((q) => JSON.parse(q.payload).slot_start)).toEqual([keep.slot_start]);
  });

  it('고친 칸을 되돌리면 이전 값이 더 최신 시각으로 칸과 기록에 다시 저장된다', async () => {
    const db = await setup();
    const prev = row('05:00', { category: 'rest' });
    await saveEntry(db, [prev]);
    const saved = { ...prev, category: 'work' as const, client_updated_at: '2026-11-19T05:31:00.000Z' };
    await saveEntry(db, [saved]);
    await undoEntry(db, saved, prev);
    const [slot] = await db.all<SlotRow>('SELECT * FROM slot');
    expect(slot.category).toBe('rest');
    expect(slot.client_updated_at > saved.client_updated_at).toBe(true);
    expect((await entries(db)).map((e) => e.item_id)).toEqual(['rest']);
  });

  it('되돌리기는 타이머 기록을 지우지 않는다', async () => {
    const db = await setup();
    await addTimer(db, 't1', ms('05:00'), ms('05:10'));
    const saved = row('05:00');
    await saveEntry(db, [saved]);
    await undoEntry(db, saved, null);
    expect(await db.all("SELECT id FROM entry WHERE id = 't1'")).toEqual([{ id: 't1' }]);
    expect(await entries(db)).toEqual([]);
  });
});

describe('emptyParts', () => {
  it.each([
    ['자르는 것 없음', [], [[0, 30]]],
    ['앞부분', [[-5, 10]], [[10, 30]]],
    ['가운데', [[10, 20]], [[0, 10], [20, 30]]],
    ['전부', [[-1, Infinity]], []],
    ['겹친 두 구간', [[5, 15], [10, 20]], [[0, 5], [20, 30]]],
    ['밖', [[30, 40]], [[0, 30]]],
  ] as const)('%s', (_name, cut, expected) => {
    expect(emptyParts([0, 30], cut.map((c) => [c[0], c[1]] as [number, number]))).toEqual(expected);
  });
});

// 기록 쓰기 입구는 하나다(eng 리뷰 1 레드 플래그 6). 앱 코드가 옛 칸 쓰기 함수를 직접 부르면 실패한다.
describe('쓰기 입구 하나', () => {
  const ROOT = join(__dirname, '..');
  const ALLOWED = new Set([join('db', 'records.ts'), join('record', 'entries.ts')]);
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.') || name === 'android' || name === 'ios') continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(path);
    }
  };
  walk(ROOT);

  it('saveSlot·saveSlots·writeSlot은 db/records.ts와 record/entries.ts 밖에서 쓰지 않는다', () => {
    const offenders = files
      .filter((f) => !ALLOWED.has(f.slice(ROOT.length + 1)))
      .filter((f) => /\b(saveSlots?|writeSlot)\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('기록 이전(db/schema.ts)과 타이머 세션(record/timerLogic.ts)만 entry에 직접 INSERT한다', () => {
    const TIMER = join('record', 'timerLogic.ts');
    const offenders = files
      .filter((f) => !ALLOWED.has(f.slice(ROOT.length + 1)) && !f.endsWith(join('db', 'schema.ts')) && !f.endsWith(TIMER))
      .filter((f) => /INSERT\s+INTO\s+entry\b/i.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
