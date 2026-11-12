import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { saveBlock, saveSlot } from '@/db/records';
import type { BlockRow, Category } from '@/db/types';
import { ALL_DAYS } from '@/scheduler/plan';
import { deferRun, fillRun, findMissedRun, loadMissedRun } from './batchLogic';
import { answeredPeriods } from './s1';

const SEOUL = 'Asia/Seoul';
const NIGHT = [{ startMin: 23 * 60, endMin: 7 * 60, days: ALL_DAYS }];
const z = (hhmmKst: string) => {
  const [h, m] = hhmmKst.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 21, h - 9, m)).toISOString();
};
// 18:05 → 가장 최근에 끝난 칸은 17:30
const NOW = new Date(z('18:05'));

function base(extra: Partial<Parameters<typeof findMissedRun>[0]> = {}) {
  return {
    now: NOW,
    tz: SEOUL,
    quiet: NIGHT,
    pause: null,
    filled: new Map<string, Category>(),
    skip: new Set<string>(),
    planSlots: new Map<string, Category>(),
    ...extra,
  };
}

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  const slot = (hhmm: string, category: Category) =>
    saveSlot(db, {
      slot_start: z(hhmm),
      tz: SEOUL,
      category,
      note: null,
      source: 'answered',
      answered_at: z(hhmm),
      client_updated_at: z(hhmm),
    });
  return { db, slot };
}

const block = (extra: Partial<BlockRow>): BlockRow => ({
  id: 'b1',
  kind: 'plan',
  category: 'work',
  title: null,
  start_at: z('14:00'),
  end_at: z('16:00'),
  tz: SEOUL,
  state: 'ended',
  ended_how: 'no_answer',
  deleted: false,
  client_updated_at: z('12:00'),
  ...extra,
});

describe('(E4) 놓친 칸 묶음 찾기', () => {
  it('최근 10칸(5시간)까지만 묶고, 바로 앞 기록을 그대로 계속 후보로 준다', () => {
    const run = findMissedRun(base({ filled: new Map([[z('12:30'), 'work' as Category]]) }))!;
    expect(run.slots).toHaveLength(10);
    expect(run.slots[0]).toBe(z('13:00'));
    expect(run.slots[9]).toBe(z('17:30'));
    expect(run.previous).toBe('work');
    expect(run.plan).toBeNull();
  });

  it('기록된 칸에서 끊기고, 최근 칸이 기록돼 있으면 그 앞 묶음을 찾는다', () => {
    const filled = new Map<string, Category>([
      [z('17:30'), 'rest'],
      [z('15:00'), 'work'],
    ]);
    const run = findMissedRun(base({ filled }))!;
    expect(run.slots).toEqual([z('15:30'), z('16:00'), z('16:30'), z('17:00')]);
    expect(run.previous).toBe('work');
  });

  it('방해금지·건너뛸 칸에서 끊기고, 한 칸뿐이면 띄우지 않는다', () => {
    const early = findMissedRun(base({ now: new Date(z('08:05')) }));
    expect(early?.slots).toEqual([z('07:00'), z('07:30')]);
    const skip = new Set([z('17:00')]);
    expect(findMissedRun(base({ skip, filled: new Map([[z('16:30'), 'work' as Category]]) }))).toBeNull();
  });

  it('(CP-1) 답 없이 끝난 계획 블록 칸이 있으면 계획 카테고리를 준다', () => {
    const planSlots = new Map<string, Category>([[z('15:00'), 'exercise']]);
    expect(findMissedRun(base({ planSlots }))!.plan).toBe('exercise');
  });
});

describe('놓친 칸 묶음 저장', () => {
  it('집중 블록과 진행 중 계획 블록 칸은 빼고, 답 없던 계획 블록 칸은 넣는다', async () => {
    const { db, slot } = await setup();
    await slot('13:00', 'sleep');
    await saveBlock(db, block({ id: 'p1' }));
    await saveBlock(db, block({ id: 'f1', kind: 'focus', start_at: z('16:00'), end_at: z('17:00'), ended_how: 'end_now' }));
    const run = (await loadMissedRun(db, NOW, SEOUL, NIGHT, null))!;
    expect(run.slots).toEqual([z('17:00'), z('17:30')]);

    await saveBlock(db, block({ id: 'f1', kind: 'focus', deleted: true, start_at: z('16:00'), end_at: z('17:00') }));
    const withPlan = (await loadMissedRun(db, NOW, SEOUL, NIGHT, null))!;
    expect(withPlan.slots[0]).toBe(z('13:30'));
    expect(withPlan.plan).toBe('work');
    expect(withPlan.previous).toBe('sleep');
  });

  it('한 카테고리로 한 번에 채우고(batch), 따로 채울게요 뒤에는 같은 칸을 다시 묻지 않는다', async () => {
    const { db, slot } = await setup();
    await slot('16:00', 'work');
    const run = (await loadMissedRun(db, NOW, SEOUL, NIGHT, null))!;
    expect(run.slots).toEqual([z('16:30'), z('17:00'), z('17:30')]);
    await fillRun(db, run, 'work', NOW);
    const rows = await db.all<{ source: string }>('SELECT source FROM slot WHERE source = ?', ['batch']);
    expect(rows).toHaveLength(3);

    const { db: db2, slot: slot2 } = await setup();
    await slot2('16:00', 'work');
    const again = (await loadMissedRun(db2, NOW, SEOUL, NIGHT, null))!;
    await deferRun(db2, again, NOW);
    // 따로 채울게요 칸은 빠지고, 그보다 앞의 다른 빈칸 묶음만 남는다.
    const next = (await loadMissedRun(db2, NOW, SEOUL, NIGHT, null))!;
    expect(next.slots.some((s) => again.slots.includes(s))).toBe(false);
    expect(next.slots[next.slots.length - 1]).toBe(z('15:30'));
    const events = await db2.all<{ props: string }>("SELECT props FROM event WHERE type = 'batch_filled'");
    expect(JSON.parse(events[0].props)).toEqual({ count: 3, deferred: true });
  });
});

describe('(S1-COUNT) 답한 시간대 수', () => {
  it('같은 30분 안의 여러 행동은 1곳, 답 없음·따로 채울게요는 세지 않는다', () => {
    const e = (type: string, hhmm: string, props: object = {}) => ({ type, ts: z(hhmm), props }) as never;
    const events = [
      e('ping_answered', '09:01'),
      e('block_started', '09:20'),
      e('plan_block_set', '10:40'),
      e('block_ended', '11:05', { how: 'no_answer' }),
      e('batch_filled', '12:10', { deferred: true }),
      e('batch_filled', '13:10', { deferred: false }),
      e('pause_set', '14:00'),
    ];
    expect(answeredPeriods(events, '2026-10-21', SEOUL)).toBe(3);
  });
});
