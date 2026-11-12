import type { BlockRow, Category, Db, PlanRow, SlotRow } from '@/db/types';
import { CATEGORIES } from '@/db/types';
import { blocksBetween, getBlock, logEvent, saveBlock, undoSlot } from '@/db/records';
import { localParts, MINUTE_MS } from '@/lib/localTime';
import { uuidv4 } from '@/lib/uuid';
import { answerBlock, blockSlots, nextBoundary } from './blockLogic';

/*
 * Todo 탭(계획 블록). 설계: docs/designs/left30-focus-block.md DR-3·4·5·7·9, CP-3.
 * 시트는 하루 안의 분(0~1440)으로 시각을 다루고, 저장할 때 그 날짜·시간대의 UTC 시각으로 바꾼다.
 */

export const DAY_MIN = 24 * 60;
// 서버 block.entity BLOCK_TITLE_MAX와 같다.
export const BLOCK_TITLE_MAX = 100;

// 현지 날짜 + 그날의 분 → UTC 시각. 1440분은 다음 날 0시.
export function atLocal(date: string, minute: number, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const wanted = Date.UTC(y, m - 1, d) + minute * MINUTE_MS;
  let t = wanted;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(t), tz);
    const [py, pm, pd] = p.date.split('-').map(Number);
    const seen = Date.UTC(py, pm - 1, pd) + p.minuteOfDay * MINUTE_MS;
    if (seen === wanted) break;
    t += wanted - seen;
  }
  return new Date(t);
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// 그날 시각(분). 다음 날 0시면 1440.
export function minuteOf(iso: string, date: string, tz: string): number {
  const p = localParts(new Date(iso), tz);
  return p.date === date ? p.minuteOfDay : p.date > date ? DAY_MIN : 0;
}

export function hm(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

// 그날의 계획 블록(지우지 않고 집중에 밀리지 않은 것), 시간순.
export async function planBlocksOn(db: Db, date: string, tz: string): Promise<BlockRow[]> {
  const from = atLocal(date, 0, tz).toISOString();
  const to = atLocal(date, DAY_MIN, tz).toISOString();
  const rows = await blocksBetween(db, from, to);
  return rows.filter((b) => b.kind === 'plan' && b.state !== 'cancelled' && b.start_at >= from);
}

// 추가 시트 기본값: 시작은 다음 빈 30분, 끝은 시작 + 1시간(자정까지).
export function defaultRange(
  blocks: Pick<BlockRow, 'start_at' | 'end_at'>[],
  date: string,
  now: Date,
  tz: string,
): { start: number; end: number } {
  const today = localParts(now, tz).date;
  let start = today === date ? minuteOf(nextBoundary(now, tz).toISOString(), date, tz) : 9 * 60;
  const busy = blocks.map((b) => [minuteOf(b.start_at, date, tz), minuteOf(b.end_at, date, tz)]);
  for (let moved = true; moved; ) {
    moved = false;
    for (const [s, e] of busy) {
      if (start >= s && start < e) {
        start = e;
        moved = true;
      }
    }
  }
  start = Math.min(start, DAY_MIN - 30);
  return { start, end: Math.min(start + 60, DAY_MIN) };
}

// 시트 스테퍼: 시작과 끝은 따로 움직인다. 시작을 끝과 같거나 늦게 올리면 끝이 시작 + 30분으로 밀린다.
export function setStart(range: { start: number; end: number }, minute: number) {
  const start = Math.max(0, Math.min(DAY_MIN - 30, roundHalf(minute)));
  return { start, end: range.end <= start ? start + 30 : range.end };
}

export function setEnd(range: { start: number; end: number }, minute: number) {
  return { start: range.start, end: Math.max(range.start + 30, Math.min(DAY_MIN, roundHalf(minute))) };
}

// 시계 피커 값은 가까운 30분으로 맞춘다.
export function roundHalf(minute: number): number {
  return Math.round(minute / 30) * 30;
}

function stateFor(start: Date, end: Date, now: Date): Pick<BlockRow, 'state' | 'ended_how'> {
  if (end.getTime() <= now.getTime()) return { state: 'ended', ended_how: 'no_answer' };
  if (start.getTime() <= now.getTime()) return { state: 'active', ended_how: null };
  return { state: 'planned', ended_how: null };
}

function overlaps(b: Pick<BlockRow, 'start_at' | 'end_at'>, start: string, end: string): boolean {
  return b.start_at < end && b.end_at > start;
}

export type SavePlanResult = { ok: true; block: BlockRow } | { ok: false; overlap: BlockRow };

// 추가·수정 시트 [저장]. 다른 계획 블록과 겹치면 저장하지 않는다(겹침 거절).
export async function savePlanBlock(
  db: Db,
  params: {
    id?: string;
    date: string;
    start: number;
    end: number;
    category: Category;
    title: string;
    tz: string;
    now: Date;
  },
): Promise<SavePlanResult> {
  const { date, tz, now } = params;
  const start = atLocal(date, params.start, tz);
  const end = atLocal(date, params.end, tz);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const others = (await blocksBetween(db, startIso, endIso)).filter(
    (b) => b.kind === 'plan' && b.state !== 'cancelled' && b.id !== params.id,
  );
  if (others.length > 0) return { ok: false, overlap: others[0] };

  const before = params.id ? await getBlock(db, params.id) : null;
  const title = params.title.trim().slice(0, BLOCK_TITLE_MAX);
  // 이미 답한(체크된) 블록은 시각을 고쳐도 상태를 그대로 둔다.
  const answered = before?.ended_how === 'answer' || before?.ended_how === 'checked';
  const block: BlockRow = {
    id: before?.id ?? uuidv4(),
    kind: 'plan',
    category: params.category,
    title: title.length > 0 ? title : null,
    start_at: startIso,
    end_at: endIso,
    tz,
    ...(before && answered ? { state: before.state, ended_how: before.ended_how } : stateFor(start, end, now)),
    deleted: false,
    client_updated_at: now.toISOString(),
  };
  await saveBlock(db, block);
  await logEvent(db, {
    id: uuidv4(),
    type: 'plan_block_set',
    ts: now.toISOString(),
    props: { action: before ? 'edit' : 'add', minutes: params.end - params.start },
  });
  return { ok: true, block };
}

// 지우기(DR-9). 이미 저장된 실제 기록 칸은 남긴다. 되돌리기는 지우기 전 행으로 다시 저장한다.
export async function deletePlanBlock(db: Db, block: BlockRow, now: Date): Promise<BlockRow> {
  await saveBlock(db, { ...block, deleted: true, client_updated_at: now.toISOString() });
  await logEvent(db, { id: uuidv4(), type: 'plan_block_set', ts: now.toISOString(), props: { action: 'delete' } });
  return block;
}

export async function restoreBlock(db: Db, block: BlockRow, now: Date): Promise<void> {
  await saveBlock(db, { ...block, deleted: false, client_updated_at: now.toISOString() });
}

// CP-3 어제 가져오기: 어제 계획 블록을 같은 시각으로 오늘에 복사. 오늘 블록과 겹치면 뺀다.
export async function importYesterday(
  db: Db,
  today: string,
  tz: string,
  now: Date,
): Promise<{ added: number; skipped: number }> {
  const yesterday = shiftDate(today, -1);
  const source = await planBlocksOn(db, yesterday, tz);
  const existing = await planBlocksOn(db, today, tz);
  let added = 0;
  let skipped = 0;
  for (const b of source) {
    const start = atLocal(today, minuteOf(b.start_at, yesterday, b.tz), tz);
    const end = atLocal(today, minuteOf(b.end_at, yesterday, b.tz), tz);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    if (existing.some((e) => overlaps(e, startIso, endIso))) {
      skipped++;
      continue;
    }
    const copy: BlockRow = {
      id: uuidv4(),
      kind: 'plan',
      category: b.category,
      title: b.title,
      start_at: startIso,
      end_at: endIso,
      tz,
      ...stateFor(start, end, now),
      deleted: false,
      client_updated_at: now.toISOString(),
    };
    await saveBlock(db, copy);
    existing.push(copy);
    added++;
  }
  if (added > 0) {
    await logEvent(db, {
      id: uuidv4(),
      type: 'plan_block_set',
      ts: now.toISOString(),
      props: { action: 'import_yesterday', count: added },
    });
  }
  return { added, skipped };
}

// 체크할 수 있는 블록: 끝났고 아직 답하지 않은 것(DR-3). 진행 중·미래 블록은 반응 없음.
export function canCheck(block: BlockRow, now: Date): boolean {
  if (Date.parse(block.end_at) > now.getTime()) return false;
  return block.ended_how !== 'answer' && block.ended_how !== 'checked';
}

export function isChecked(block: BlockRow): boolean {
  return block.ended_how === 'answer' || block.ended_how === 'checked';
}

export type CheckUndo = { block: BlockRow; slots: { saved: SlotRow; previous: SlotRow | null }[] };

// 직접 체크. 되돌리기에 쓰려고 바뀌기 전 칸을 함께 돌려준다.
export async function checkBlock(db: Db, block: BlockRow, now: Date, overwrite: boolean): Promise<CheckUndo> {
  const starts = blockSlots(block, block.tz);
  const before = new Map<string, SlotRow>();
  if (starts.length > 0) {
    const rows = await db.all<SlotRow>(
      `SELECT * FROM slot WHERE slot_start IN (${starts.map(() => '?').join(',')})`,
      starts,
    );
    for (const r of rows) before.set(r.slot_start, r);
  }
  await answerBlock(db, block, now, 'checked', overwrite);
  const after = starts.length
    ? await db.all<SlotRow>(
        `SELECT * FROM slot WHERE slot_start IN (${starts.map(() => '?').join(',')})`,
        starts,
      )
    : [];
  const slots = after
    .filter((s) => {
      const prev = before.get(s.slot_start);
      return !prev || prev.client_updated_at !== s.client_updated_at;
    })
    .map((saved) => ({ saved, previous: before.get(saved.slot_start) ?? null }));
  return { block, slots };
}

export async function undoCheck(db: Db, undo: CheckUndo, now: Date): Promise<void> {
  for (const { saved, previous } of undo.slots) await undoSlot(db, saved, previous);
  await saveBlock(db, { ...undo.block, client_updated_at: now.toISOString() });
}

export type TotalLine = { category: Category; target: number; planned: number };

/*
 * DR-4·5 총량 한 줄. Todo 블록은 총량 목표 안에 든다. 블록 합이 목표보다 크거나 목표가 없으면
 * 목표를 블록 합으로 올려 보여 준다(저장한 목표는 그대로). 0h 카테고리는 뺀다. 분 단위.
 */
export function totalsLine(plan: Pick<PlanRow, 'category' | 'target_minutes'>[], blocks: BlockRow[]): TotalLine[] {
  const planned = new Map<Category, number>();
  for (const b of blocks) {
    const min = (Date.parse(b.end_at) - Date.parse(b.start_at)) / MINUTE_MS;
    planned.set(b.category, (planned.get(b.category) ?? 0) + min);
  }
  const target = new Map(plan.map((p) => [p.category, p.target_minutes]));
  return CATEGORIES.map((c) => {
    const p = planned.get(c) ?? 0;
    return { category: c, target: Math.max(target.get(c) ?? 0, p), planned: p };
  }).filter((l) => l.target > 0);
}

// "6h", "1.5h"
export function hours(minutes: number): string {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

export async function planRowsOn(db: Db, date: string): Promise<PlanRow[]> {
  return db.all<PlanRow>('SELECT * FROM plan WHERE local_date = ?', [date]);
}

// 하루 막대(06–24)에서 블록 위치(0~1).
export const BAR_FROM = 6 * 60;
export function barSpan(block: BlockRow, date: string, tz: string): { left: number; width: number } | null {
  const s = Math.max(BAR_FROM, minuteOf(block.start_at, date, tz));
  const e = minuteOf(block.end_at, date, tz);
  if (e <= s) return null;
  const span = DAY_MIN - BAR_FROM;
  return { left: (s - BAR_FROM) / span, width: (e - s) / span };
}
