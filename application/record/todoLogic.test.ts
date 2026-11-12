import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { getBlock, saveSlot } from '@/db/records';
import type { BlockRow } from '@/db/types';
import { conflictingSlots } from './blockLogic';
import {
  atLocal,
  canCheck,
  checkBlock,
  defaultRange,
  deletePlanBlock,
  importYesterday,
  planBlocksOn,
  restoreBlock,
  savePlanBlock,
  setEnd,
  setStart,
  totalsLine,
  undoCheck,
} from './todoLogic';

const SEOUL = 'Asia/Seoul';
const TODAY = '2026-10-21';
// 2026-10-21(수) 13:41 KST
const NOW = new Date('2026-10-21T04:41:00.000Z');
const z = (hhmmKst: string, day = 21) => {
  const [h, m] = hhmmKst.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, day, h - 9, m)).toISOString();
};

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  const add = (date: string, start: number, end: number, category: BlockRow['category'] = 'work', now = NOW) =>
    savePlanBlock(db, { date, start: start * 60, end: end * 60, category, title: '', tz: SEOUL, now });
  return { db, add };
}

describe('시각 계산', () => {
  it('현지 날짜와 분을 UTC로 바꾸고 1440분은 다음 날 0시다', () => {
    expect(atLocal(TODAY, 14 * 60, SEOUL).toISOString()).toBe(z('14:00'));
    expect(atLocal(TODAY, 1440, SEOUL).toISOString()).toBe(z('00:00', 22));
    expect(atLocal('2026-03-08', 3 * 60, 'America/New_York').toISOString()).toBe('2026-03-08T07:00:00.000Z');
  });

  it('(DR-7) 기본값은 다음 빈 30분부터 1시간, 시작과 끝은 따로 움직인다', () => {
    expect(defaultRange([], TODAY, NOW, SEOUL)).toEqual({ start: 14 * 60, end: 15 * 60 });
    const busy = [{ start_at: z('14:00'), end_at: z('16:00') }];
    expect(defaultRange(busy, TODAY, NOW, SEOUL)).toEqual({ start: 16 * 60, end: 17 * 60 });

    const r = { start: 14 * 60, end: 15 * 60 };
    expect(setStart(r, 14 * 60 + 30)).toEqual({ start: 870, end: 900 });
    expect(setStart(r, 15 * 60)).toEqual({ start: 900, end: 930 });
    expect(setEnd(r, 14 * 60)).toEqual({ start: 840, end: 870 });
    expect(setEnd(r, 25 * 60)).toEqual({ start: 840, end: 1440 });
    expect(setStart(r, 14 * 60 + 20).start).toBe(14 * 60 + 30);
  });
});

describe('계획 블록 저장', () => {
  it('미래 블록은 planned, 다른 계획 블록과 겹치면 저장하지 않는다', async () => {
    const { db, add } = await setup();
    const r = await add(TODAY, 14, 16);
    expect(r.ok && r.block).toMatchObject({ state: 'planned', start_at: z('14:00'), end_at: z('16:00') });
    const clash = await add(TODAY, 15, 17, 'exercise');
    expect(clash).toMatchObject({ ok: false, overlap: { start_at: z('14:00') } });
    expect(await add(TODAY, 16, 17)).toMatchObject({ ok: true });
    expect((await planBlocksOn(db, TODAY, SEOUL)).map((b) => b.start_at)).toEqual([z('14:00'), z('16:00')]);
  });

  it('지나간 시각이면 바로 끝난 블록이 되어 체크할 수 있고, 지우면 목록에서 빠졌다가 되돌린다', async () => {
    const { db, add } = await setup();
    const r = await add(TODAY, 9, 11);
    if (!r.ok) throw new Error('save failed');
    expect(r.block).toMatchObject({ state: 'ended', ended_how: 'no_answer' });
    expect(canCheck(r.block, NOW)).toBe(true);

    await deletePlanBlock(db, r.block, NOW);
    expect(await planBlocksOn(db, TODAY, SEOUL)).toEqual([]);
    await restoreBlock(db, r.block, NOW);
    expect(await planBlocksOn(db, TODAY, SEOUL)).toHaveLength(1);
  });

  it('수정은 자기 자신과 겹쳐도 저장한다', async () => {
    const { add, db } = await setup();
    const r = await add(TODAY, 14, 16);
    if (!r.ok) throw new Error('save failed');
    const edit = await savePlanBlock(db, {
      id: r.block.id,
      date: TODAY,
      start: 15 * 60,
      end: 17 * 60,
      category: 'work',
      title: ' 보고서 ',
      tz: SEOUL,
      now: NOW,
    });
    expect(edit).toMatchObject({ ok: true, block: { id: r.block.id, title: '보고서', end_at: z('17:00') } });
  });
});

describe('(CP-3) 어제 가져오기', () => {
  it('어제 블록을 같은 시각으로 오늘에 복사하고, 오늘 블록과 겹치는 것은 뺀다', async () => {
    const { db, add } = await setup();
    const yesterday = new Date(z('08:00', 20));
    await add('2026-10-20', 9, 11, 'work', yesterday);
    await add('2026-10-20', 19, 20, 'exercise', yesterday);
    await add(TODAY, 19, 21, 'relationship');

    expect(await importYesterday(db, TODAY, SEOUL, NOW)).toEqual({ added: 1, skipped: 1 });
    const today = await planBlocksOn(db, TODAY, SEOUL);
    expect(today.map((b) => [b.start_at, b.category, b.state])).toEqual([
      [z('09:00'), 'work', 'ended'],
      [z('19:00'), 'relationship', 'planned'],
    ]);
  });
});

describe('(DR-3) 직접 체크', () => {
  it('끝난 블록만 체크할 수 있고, 겹침을 고른 뒤 되돌리면 칸과 블록이 원래대로', async () => {
    const { db, add } = await setup();
    const later = await add(TODAY, 14, 16);
    if (!later.ok) throw new Error('save failed');
    expect(canCheck(later.block, NOW)).toBe(false);

    const r = await add(TODAY, 11, 12);
    if (!r.ok) throw new Error('save failed');
    await saveSlot(db, {
      slot_start: z('11:30'),
      tz: SEOUL,
      category: 'rest',
      note: '산책',
      source: 'answered',
      answered_at: z('12:00'),
      client_updated_at: z('12:00'),
    });
    expect((await conflictingSlots(db, r.block)).map((s) => s.category)).toEqual(['rest']);

    const undo = await checkBlock(db, r.block, NOW, true);
    const slots = () => db.all<{ category: string; source: string }>('SELECT category, source FROM slot ORDER BY slot_start');
    expect(await slots()).toEqual([
      { category: 'work', source: 'declared' },
      { category: 'work', source: 'declared' },
    ]);
    expect(await getBlock(db, r.block.id)).toMatchObject({ ended_how: 'checked' });

    await undoCheck(db, undo, NOW);
    expect(await slots()).toEqual([{ category: 'rest', source: 'answered' }]);
    expect(await getBlock(db, r.block.id)).toMatchObject({ ended_how: 'no_answer' });
  });
});

describe('(DR-4·5) 총량 한 줄', () => {
  it('블록 합이 목표보다 크거나 목표가 없으면 목표를 블록 합으로 올리고 0h는 뺀다', () => {
    const block = (category: BlockRow['category'], s: string, e: string) =>
      ({ category, start_at: z(s), end_at: z(e) }) as BlockRow;
    const lines = totalsLine(
      [
        { category: 'work', target_minutes: 360 },
        { category: 'rest', target_minutes: 0 },
      ],
      [block('work', '09:00', '12:00'), block('exercise', '19:00', '20:30')],
    );
    expect(lines).toEqual([
      { category: 'exercise', target: 90, planned: 90 },
      { category: 'work', target: 360, planned: 180 },
    ]);
  });
});
