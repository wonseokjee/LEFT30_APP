import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { getBlock, saveBlock, saveSlot } from '@/db/records';
import type { BlockRow, SlotRow } from '@/db/types';
import { ALL_DAYS } from '@/scheduler/plan';
import {
  activeBlock,
  answerBlock,
  blockSlots,
  conflictingSlots,
  endFocusNow,
  extendBlock,
  focusEnd,
  nextBoundary,
  settleBlocks,
  startFocus,
} from './blockLogic';

const SEOUL = 'Asia/Seoul';
const NIGHT = [{ startMin: 23 * 60, endMin: 7 * 60, days: ALL_DAYS }];
// 2026-10-21(수) 13:41 KST
const NOW = new Date('2026-10-21T04:41:00.000Z');
const z = (hhmmKst: string) => {
  const [h, m] = hhmmKst.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 21, h - 9, m)).toISOString();
};

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  const slots = async () =>
    db.all<Pick<SlotRow, 'slot_start' | 'category' | 'source'>>(
      'SELECT slot_start, category, source FROM slot ORDER BY slot_start',
    );
  return { db, slots };
}

function planBlock(extra: Partial<BlockRow> = {}): BlockRow {
  return {
    id: 'p1',
    kind: 'plan',
    category: 'work',
    title: '보고서',
    start_at: z('14:00'),
    end_at: z('16:00'),
    tz: SEOUL,
    state: 'planned',
    ended_how: null,
    deleted: false,
    client_updated_at: '2026-10-21T00:00:00.000Z',
    ...extra,
  };
}

describe('블록 칸과 길이', () => {
  it('블록 칸은 끝나는 시각이 (시작, 끝]에 드는 30분 칸이다', () => {
    // 13:41–15:00 → 13:30·14:00·14:30 칸
    expect(blockSlots({ start_at: NOW.toISOString(), end_at: z('15:00') }, SEOUL)).toEqual([
      z('13:30'),
      z('14:00'),
      z('14:30'),
    ]);
    // 14:00–16:00 → 14:00·14:30·15:00·15:30 칸
    expect(blockSlots({ start_at: z('14:00'), end_at: z('16:00') }, SEOUL)).toHaveLength(4);
  });

  it('(DR-8) 길이는 다음 30분 경계부터 세고, 방해금지에서 자른다', () => {
    expect(nextBoundary(NOW, SEOUL).toISOString()).toBe(z('14:00'));
    expect(focusEnd(NOW, 1, SEOUL, NIGHT)!.toISOString()).toBe(z('15:00'));
    expect(focusEnd(NOW, 3, SEOUL, NIGHT)!.toISOString()).toBe(z('17:00'));
    // 21:41에 3시간 → 23:00에서 자름
    const late = new Date(z('21:41'));
    expect(focusEnd(late, 3, SEOUL, NIGHT)!.toISOString()).toBe(z('23:00'));
    // 방해금지 안에서는 시작할 수 없다
    expect(focusEnd(new Date('2026-10-21T15:10:00.000Z'), 1, SEOUL, NIGHT)).toBeNull();
  });
});

describe('집중 블록', () => {
  it('시작하면 active로 저장하고 겹친 계획 블록은 cancelled가 된다', async () => {
    const { db } = await setup();
    await saveBlock(db, planBlock());
    const b = (await startFocus(db, { category: 'self_dev', hours: 1, now: NOW, tz: SEOUL, quiet: NIGHT, id: 'f1' }))!;
    expect(b).toMatchObject({ id: 'f1', kind: 'focus', state: 'active', end_at: z('15:00') });
    expect(await getBlock(db, 'p1')).toMatchObject({ state: 'cancelled' });
    expect(await activeBlock(db, NOW)).toMatchObject({ id: 'f1' });
    const events = await db.all<{ type: string }>('SELECT type FROM event');
    expect(events.map((e) => e.type)).toEqual(['block_started']);
  });

  it('(SPEC-1) 칸을 미리 쓰지 않고, 앱을 열 때 끝난 칸만 채운다', async () => {
    const { db, slots } = await setup();
    await startFocus(db, { category: 'work', hours: 1, now: NOW, tz: SEOUL, quiet: NIGHT, id: 'f1' });
    expect(await slots()).toEqual([]);

    await settleBlocks(db, new Date(z('14:35')));
    expect(await slots()).toEqual([
      { slot_start: z('13:30'), category: 'work', source: 'declared' },
      { slot_start: z('14:00'), category: 'work', source: 'declared' },
    ]);
  });

  it('[끝내기]는 끝난 칸까지만 채우고 진행 중 칸은 남긴다', async () => {
    const { db, slots } = await setup();
    const b = (await startFocus(db, { category: 'work', hours: 2, now: NOW, tz: SEOUL, quiet: NIGHT }))!;
    const ended = await endFocusNow(db, b, new Date(z('14:10')));
    expect(ended).toMatchObject({ state: 'ended', ended_how: 'end_now' });
    expect((await slots()).map((s) => s.slot_start)).toEqual([z('13:30')]);
    expect(await activeBlock(db, new Date(z('14:10')))).toBeNull();
  });

  it('이미 기록된 칸은 덮지 않는다', async () => {
    const { db, slots } = await setup();
    await saveSlot(db, {
      slot_start: z('14:00'),
      tz: SEOUL,
      category: 'rest',
      note: null,
      source: 'answered',
      answered_at: z('14:30'),
      client_updated_at: z('14:30'),
    });
    const b = (await startFocus(db, { category: 'work', hours: 1, now: NOW, tz: SEOUL, quiet: NIGHT }))!;
    await answerBlock(db, b, new Date(z('15:01')));
    expect((await slots()).map((s) => s.category)).toEqual(['work', 'rest', 'work']);
  });

  it('끝 시각이 지나면 awaiting이 되어 끝 시트를 띄우고, 다음 30분 알림 시각까지 답이 없으면 no_answer로 끝난다', async () => {
    const { db, slots } = await setup();
    await startFocus(db, { category: 'work', hours: 1, now: NOW, tz: SEOUL, quiet: NIGHT, id: 'f1' });
    expect(await settleBlocks(db, new Date(z('15:05')))).toEqual({ endSheet: 'f1' });
    expect(await getBlock(db, 'f1')).toMatchObject({ state: 'awaiting' });
    expect(await slots()).toHaveLength(3);

    expect(await settleBlocks(db, new Date(z('15:30')))).toEqual({ endSheet: null });
    expect(await getBlock(db, 'f1')).toMatchObject({ state: 'ended', ended_how: 'no_answer' });
  });

  it('[30분 더]는 끝 시각을 늘리고 active로 돌린다. 방해금지에서는 늘리지 않는다', async () => {
    const { db } = await setup();
    const b = (await startFocus(db, { category: 'work', hours: 1, now: NOW, tz: SEOUL, quiet: NIGHT }))!;
    await settleBlocks(db, new Date(z('15:02')));
    const awaiting = (await getBlock(db, b.id))!;
    const ext = await extendBlock(db, awaiting, new Date(z('15:02')), NIGHT);
    expect(ext).toMatchObject({ state: 'active', end_at: z('15:30') });

    const late = { ...ext, end_at: z('23:00') };
    expect(await extendBlock(db, late, new Date(z('22:50')), NIGHT)).toBe(late);
  });
});

describe('계획 블록', () => {
  it('시작 시각이 되면 active, 끝나도 칸은 비어 있고 끝 시트를 띄운다', async () => {
    const { db, slots } = await setup();
    await saveBlock(db, planBlock());
    await settleBlocks(db, new Date(z('14:10')));
    expect(await getBlock(db, 'p1')).toMatchObject({ state: 'active' });
    expect(await settleBlocks(db, new Date(z('16:05')))).toEqual({ endSheet: 'p1' });
    expect(await slots()).toEqual([]);
  });

  it('[여기서 끝]이면 블록 칸 4개를 declared로 채운다', async () => {
    const { db, slots } = await setup();
    const b = planBlock({ state: 'awaiting' });
    await saveBlock(db, b);
    const done = await answerBlock(db, b, new Date(z('16:05')));
    expect(done).toMatchObject({ state: 'ended', ended_how: 'answer' });
    expect((await slots()).map((s) => s.source)).toEqual(['declared', 'declared', 'declared', 'declared']);
  });

  it('(DR-3) 체크 전 겹침을 찾고, 덮기를 고르면 다른 카테고리 칸도 바꾼다', async () => {
    const { db, slots } = await setup();
    await saveSlot(db, {
      slot_start: z('15:00'),
      tz: SEOUL,
      category: 'rest',
      note: null,
      source: 'late',
      answered_at: z('16:20'),
      client_updated_at: z('16:20'),
    });
    const b = planBlock({ state: 'ended', ended_how: 'no_answer' });
    await saveBlock(db, b);
    expect((await conflictingSlots(db, b)).map((s) => s.slot_start)).toEqual([z('15:00')]);

    await answerBlock(db, b, new Date(z('17:00')), 'checked', true);
    expect((await slots()).map((s) => s.category)).toEqual(['work', 'work', 'work', 'work']);
    expect(await getBlock(db, 'p1')).toMatchObject({ ended_how: 'checked' });
  });
});
