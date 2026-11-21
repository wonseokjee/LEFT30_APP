import { CATEGORY_LABEL, TIMER_HOWS, type BlockRow, type Db, type EntryHow, type PauseRow } from '@/db/types';
import { localParts, MINUTE_MS } from '@/lib/localTime';
import { emptyParts } from './entries';
import { cycleMs, type PomodoroCfg } from './timerLogic';
import { daySlots, shiftDate } from './timetable';

/*
 * 시간표 = 구간 타임라인(T4, left30-visual.md 4.3a, timer-modes TIMELINE·PAUSE·BREAK).
 *
 *  entry + pause + pomodoro ──buildColumn──▶ 블록(그날 0시부터 분), 계획 상자
 *
 *  - 알림 답(타이머 아닌 기록)이 같은 항목으로 맞닿아 이어지면 한 덩어리. 출처가 다르면(알림 답 → 타이머) 따로.
 *  - 멈춤: 1분 미만은 없는 셈, 1~5분은 블록 안 옅은 구간, 5분 이상(또는 지금 멈춤 중)은 빈 틈 + 앞뒤 조각을 점선으로 잇고
 *    뒤 조각에는 이름을 쓰지 않는다. 뽀모도로 휴식도 옅은 구간(BREAK A).
 *  - 15분 미만 블록은 이름 없이(D28). 진행 중 블록은 지금까지 자란다.
 *  - 계획 상자: 기록이 없는 곳에만, 15분 미만으로 남는 조각은 그리지 않는다(D27).
 */

const TIMERS = new Set<string>(TIMER_HOWS);
const SOFT_MIN_MS = MINUTE_MS;
const GAP_MIN_MS = 5 * MINUTE_MS;
const NAME_MIN = 15;
const PLAN_MIN = 15;
export const DAY_MIN = 24 * 60;

type Span = [number, number];

export type TimelineEntry = {
  id: string;
  name: string; // 항목 이름
  item_id: string;
  root_id: string; // 카테고리 항목(세부 항목이면 부모)
  how: EntryHow;
  start_at: number;
  end_at: number | null;
  pauses: Pick<PauseRow, 'start_at' | 'end_at'>[];
  pomodoro: PomodoroCfg | null;
};

export type TimelineBlock = {
  key: string;
  entryIds: string[];
  itemId: string;
  name: string;
  how: EntryHow;
  timer: boolean;
  from: number; // 그날 0시부터 분(소수 가능)
  to: number;
  soft: Span[]; // 옅게 칠할 구간(같은 분 단위)
  showName: boolean;
  running: boolean; // 진행 중 세션의 마지막 조각
  linked: boolean; // 같은 세션의 앞 조각과 점선으로 잇는다
  startAt: number; // 이 조각의 실제 시각(UTC 밀리초)
  endAt: number;
};

export type TimelinePlan = { from: number; to: number; label: string };
export type TimelineColumn = { blocks: TimelineBlock[]; plans: TimelinePlan[] };

// 현지 날짜의 시작·끝(UTC 밀리초). 서머타임 날은 23·25시간.
export function dayBounds(date: string, tz: string): Span {
  return [Date.parse(daySlots(date, tz)[0]), Date.parse(daySlots(shiftDate(date, 1), tz)[0])];
}

// 세션이 흐른 시간 offset(멈춘 시간 뺀 값)을 벽시계 시각으로.
function activeToWall(start: number, pauses: Span[], offset: number): number {
  let wall = start + offset;
  for (const [s, e] of pauses) {
    if (s < wall) wall += e - s;
    else break;
  }
  return wall;
}

// 한 세션의 조각들(벽시계 시각). 5분 이상 멈춤에서 끊고, 옅은 구간을 붙인다.
export function sessionPieces(e: TimelineEntry, now: number): { span: Span; soft: Span[] }[] {
  const end = e.end_at ?? now;
  const pauses = e.pauses
    .map((p): Span => [p.start_at, p.end_at ?? Infinity])
    .sort((a, b) => a[0] - b[0]);
  const cuts = pauses.filter(([s, t]) => t - s >= GAP_MIN_MS);
  const soft = pauses.filter(([s, t]) => t - s >= SOFT_MIN_MS && t - s < GAP_MIN_MS);
  if (e.how === 'pomodoro' && e.pomodoro) {
    const closed = pauses.map(([s, t]): Span => [s, Math.min(t, end)]);
    const focus = e.pomodoro.focus_min * MINUTE_MS;
    for (let i = 0; i < e.pomodoro.rounds; i++) {
      const s = activeToWall(e.start_at, closed, i * cycleMs(e.pomodoro) + focus);
      const t = activeToWall(e.start_at, closed, (i + 1) * cycleMs(e.pomodoro));
      if (s >= end) break;
      soft.push([s, Math.min(t, end)]);
    }
  }
  return emptyParts([e.start_at, end], cuts).map((span) => ({
    span,
    soft: soft
      .map(([s, t]): Span => [Math.max(s, span[0]), Math.min(t, span[1])])
      .filter(([s, t]) => t > s)
      .sort((a, b) => a[0] - b[0]),
  }));
}

export function buildColumn(p: {
  day: Span;
  tz: string;
  now: number;
  entries: TimelineEntry[];
  plans?: { start: number; end: number; label: string }[];
}): TimelineColumn {
  const [dayStart, dayEnd] = p.day;
  // 현지 시각 자리(분). 정시 눈금과 맞도록 경과 시간이 아니라 현지 시:분을 쓴다(서머타임 날에도 09:00은 09:00 자리).
  const toMin = (t: number) =>
    t >= dayEnd ? DAY_MIN : t <= dayStart ? 0 : localParts(new Date(t), p.tz).minuteOfDay + (t % MINUTE_MS) / MINUTE_MS;
  const raw: TimelineBlock[] = [];
  for (const e of [...p.entries].sort((a, b) => a.start_at - b.start_at)) {
    const pieces = sessionPieces(e, p.now);
    pieces.forEach(({ span, soft }, i) => {
      const s = Math.max(span[0], dayStart);
      const t = Math.min(span[1], dayEnd);
      if (t <= s || toMin(t) <= toMin(s)) return;
      raw.push({
        key: `${e.id}:${i}`,
        entryIds: [e.id],
        itemId: e.item_id,
        name: e.name,
        how: e.how,
        timer: TIMERS.has(e.how),
        from: toMin(s),
        to: toMin(t),
        soft: soft.map(([a, b]): Span => [toMin(Math.max(a, s)), toMin(Math.min(b, t))]).filter(([a, b]) => b > a),
        showName: i === 0,
        running: e.end_at === null && i === pieces.length - 1,
        linked: i > 0,
        startAt: s,
        endAt: t,
      });
    });
  }
  // 알림 답이 같은 항목으로 맞닿으면 한 덩어리.
  const blocks: TimelineBlock[] = [];
  for (const b of raw) {
    const prev = blocks[blocks.length - 1];
    if (prev && !prev.timer && !b.timer && prev.itemId === b.itemId && prev.endAt === b.startAt) {
      prev.to = b.to;
      prev.endAt = b.endAt;
      prev.entryIds.push(...b.entryIds);
      continue;
    }
    blocks.push(b);
  }
  const out = blocks.map((b) => ({ ...b, showName: b.showName && b.to - b.from >= NAME_MIN }));

  const taken = out.map((b): Span => [b.startAt, b.endAt]);
  const plans: TimelinePlan[] = [];
  for (const pl of p.plans ?? []) {
    for (const [s, t] of emptyParts([Math.max(pl.start, dayStart), Math.min(pl.end, dayEnd)], taken)) {
      if (t - s >= PLAN_MIN * MINUTE_MS && toMin(t) > toMin(s)) plans.push({ from: toMin(s), to: toMin(t), label: pl.label });
    }
  }
  return { blocks: out, plans };
}

// 그날 [day) 안에서 실제로 흐른 분(멈춘 시간은 길이와 상관없이 뺌, 뽀모도로 휴식은 포함: BREAK A·PAUSE).
export function activeMinutesIn(e: TimelineEntry, day: Span, now: number): number {
  const end = Math.min(e.end_at ?? now, day[1]);
  const start = Math.max(e.start_at, day[0]);
  if (end <= start) return 0;
  const pauses = e.pauses.map((x): Span => [x.start_at, x.end_at ?? Infinity]);
  return emptyParts([start, end], pauses).reduce((sum, [s, t]) => sum + (t - s), 0) / MINUTE_MS;
}

// 누른 자리(그날 0시부터 분)에 있는 블록. 없으면 null(빈 곳).
export function blockAt(column: TimelineColumn, minute: number): TimelineBlock | null {
  return column.blocks.find((b) => b.from <= minute && minute < b.to) ?? null;
}

export function planLabel(b: Pick<BlockRow, 'title' | 'category'>): string {
  return `계획 ${b.title ?? CATEGORY_LABEL[b.category]}`;
}

type EntryJoin = {
  id: string;
  item_id: string;
  root_id: string;
  name: string;
  how: EntryHow;
  start_at: number;
  end_at: number | null;
};

// [from, to)와 겹치는 지우지 않은 기록과 그 멈춤·뽀모도로 설정.
export async function loadTimelineEntries(db: Db, from: number, to: number): Promise<TimelineEntry[]> {
  const rows = await db.all<EntryJoin>(
    `SELECT e.id, e.item_id, COALESCE(i.parent_id, i.id) AS root_id, i.name, e.how, e.start_at, e.end_at
     FROM entry e JOIN item i ON i.id = e.item_id
     WHERE e.deleted = 0 AND e.start_at < ? AND (e.end_at IS NULL OR e.end_at > ?)
     ORDER BY e.start_at`,
    [to, from],
  );
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const pauses = await db.all<PauseRow>(`SELECT * FROM pause WHERE entry_id IN (${marks})`, ids);
  const pomos = await db.all<PomodoroCfg & { entry_id: string }>(
    `SELECT entry_id, focus_min, break_min, rounds FROM pomodoro WHERE entry_id IN (${marks})`,
    ids,
  );
  return rows.map((r) => {
    const cfg = pomos.find((x) => x.entry_id === r.id);
    return {
      ...r,
      pauses: pauses.filter((x) => x.entry_id === r.id),
      pomodoro: cfg ? { focus_min: cfg.focus_min, break_min: cfg.break_min, rounds: cfg.rounds } : null,
    };
  });
}
