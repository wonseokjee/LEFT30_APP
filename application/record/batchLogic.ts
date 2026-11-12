import type { BlockRow, Category, Db, SlotRow } from '@/db/types';
import { blocksBetween, getSetting, logEvent, saveSlots, setSetting } from '@/db/records';
import { localParts, SLOT_MS } from '@/lib/localTime';
import { uuidv4 } from '@/lib/uuid';
import { inQuiet, isPaused, type Pause, type Quiet } from '@/scheduler/plan';
import { blockSlots } from './blockLogic';
import { lastEndedSlot } from './recordLogic';

/*
 * 놓친 칸 묶어서 채우기(CEO UX-3, Eng E4, CP-1). 설계: docs/designs/left30-focus-block.md
 *   13:00–18:00 비어 있어요 (10칸)
 *   [계획대로 · 업무] 또는 [그대로 계속 · 업무]     ← 10칸 모두 같은 값
 *   [6칸 카테고리]
 *   중간에 바뀌었어요 · 따로 채울게요               ← 닫고, 같은 칸은 다시 묻지 않음
 * 최근 10칸(5시간) 안에서 가장 최근의 연속 빈칸 묶음. 방해금지·일시 중지·집중 블록·진행 중 계획 블록·
 * 기록된 칸·따로 채울게요 칸에서 끊긴다. 답 없이 끝난 계획 블록 칸은 넣고 맨 위 버튼을 [계획대로]로 한다.
 */

export const BATCH_MAX = 10;
// 묶음 시트를 띄우는 최소 칸 수. 한 칸은 평소 기록 시트의 "비어 있어요" 줄이 맡는다.
export const BATCH_MIN = 2;
const DEFERRED_KEY = 'batch_deferred';

export type MissedRun = {
  slots: string[]; // 오래된 순
  tz: string;
  plan: Category | null; // CP-1: 묶음 안에 답 없이 끝난 계획 블록이 있으면 그 카테고리
  previous: Category | null; // 묶음 바로 앞 칸의 기록(그대로 계속)
};

export function findMissedRun(params: {
  now: Date;
  tz: string;
  quiet: Quiet;
  pause: Pause | null;
  filled: Map<string, Category>;
  skip: Set<string>;
  planSlots: Map<string, Category>;
}): MissedRun | null {
  const { now, tz } = params;
  const newest = Date.parse(lastEndedSlot(now, tz));
  const usable = (t: number) => {
    const iso = new Date(t).toISOString();
    if (params.filled.has(iso) || params.skip.has(iso)) return false;
    if (inQuiet(localParts(new Date(t), tz), params.quiet)) return false;
    return !isPaused(params.pause, new Date(t + SLOT_MS));
  };
  let i = 0;
  while (i < BATCH_MAX && !usable(newest - i * SLOT_MS)) i++;
  if (i >= BATCH_MAX) return null;
  const run: string[] = [];
  for (; i < BATCH_MAX && usable(newest - i * SLOT_MS); i++) run.unshift(new Date(newest - i * SLOT_MS).toISOString());
  if (run.length < BATCH_MIN) return null;
  const plan = [...run].reverse().map((s) => params.planSlots.get(s)).find((c) => c) ?? null;
  const before = new Date(Date.parse(run[0]) - SLOT_MS).toISOString();
  return { slots: run, tz, plan, previous: params.filled.get(before) ?? null };
}

// 앱을 열 때: DB에서 재료를 모아 묶음을 찾는다.
export async function loadMissedRun(
  db: Db,
  now: Date,
  tz: string,
  quiet: Quiet,
  pause: Pause | null,
): Promise<MissedRun | null> {
  const newest = Date.parse(lastEndedSlot(now, tz));
  const from = new Date(newest - BATCH_MAX * SLOT_MS).toISOString();
  const to = new Date(newest + SLOT_MS).toISOString();
  const rows = await db.all<Pick<SlotRow, 'slot_start' | 'category'>>(
    'SELECT slot_start, category FROM slot WHERE slot_start >= ? AND slot_start < ?',
    [from, to],
  );
  const filled = new Map(rows.map((r) => [r.slot_start, r.category]));
  const skip = new Set(await deferredSlots(db));
  const planSlots = new Map<string, Category>();
  for (const b of await blocksBetween(db, from, to)) {
    if (b.state === 'cancelled') continue;
    const target = isMissedPlan(b) ? 'plan' : 'skip';
    for (const s of blockSlots(b, b.tz)) {
      if (target === 'plan') planSlots.set(s, b.category);
      else skip.add(s);
    }
  }
  return findMissedRun({ now, tz, quiet, pause, filled, skip, planSlots });
}

// 답 없이 끝난 계획 블록만 묶음에 넣는다. 집중 블록과 진행 중·답한 계획 블록 칸은 블록이 맡는다.
function isMissedPlan(b: BlockRow): boolean {
  return b.kind === 'plan' && b.state === 'ended' && b.ended_how === 'no_answer';
}

// 묶음 전체를 한 카테고리로, 한 트랜잭션으로 채운다.
// 시트가 떠 있는 동안 다른 길로 기록된 칸은 덮지 않는다.
export async function fillRun(db: Db, run: MissedRun, category: Category, now: Date): Promise<void> {
  const at = now.toISOString();
  const taken = new Set(
    (
      await db.all<{ slot_start: string }>(
        `SELECT slot_start FROM slot WHERE slot_start IN (${run.slots.map(() => '?').join(',')})`,
        run.slots,
      )
    ).map((r) => r.slot_start),
  );
  await saveSlots(
    db,
    run.slots.filter((s) => !taken.has(s)).map((slot_start) => ({
      slot_start,
      tz: run.tz,
      category,
      note: null,
      source: 'batch' as const,
      answered_at: at,
      client_updated_at: at,
    })),
  );
  await logEvent(db, {
    id: uuidv4(),
    type: 'batch_filled',
    ts: at,
    props: { count: run.slots.length, deferred: false, top: category === run.plan ? 'plan' : category === run.previous ? 'continue' : 'grid' },
  });
}

// "따로 채울게요": 기기에만 기억하고 같은 칸은 다시 묻지 않는다. 묶음 범위(5시간)를 넘은 값은 버린다.
export async function deferRun(db: Db, run: MissedRun, now: Date): Promise<void> {
  const keepFrom = now.getTime() - (BATCH_MAX + 2) * SLOT_MS;
  const kept = (await deferredSlots(db)).filter((s) => Date.parse(s) >= keepFrom);
  await setSetting(db, DEFERRED_KEY, [...new Set([...kept, ...run.slots])]);
  await logEvent(db, {
    id: uuidv4(),
    type: 'batch_filled',
    ts: now.toISOString(),
    props: { count: run.slots.length, deferred: true },
  });
}

async function deferredSlots(db: Db): Promise<string[]> {
  const v = await getSetting<unknown>(db, DEFERRED_KEY);
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];
}
