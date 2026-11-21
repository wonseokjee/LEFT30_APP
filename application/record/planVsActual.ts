import type { BlockRow, Category, Db, PlanRow } from '@/db/types';
import { CATEGORY_ITEM, SYSTEM_ITEMS } from '@/db/types';
import { getSetting, logEvent, setSetting } from '@/db/records';
import { localParts } from '@/lib/localTime';
import { uuidv4 } from '@/lib/uuid';
import type { Quiet } from '@/scheduler/plan';
import { activeMinutesIn, dayBounds, loadTimelineEntries, type TimelineEntry } from './timeline';
import { hours, planBlocksOn, planRowsOn, totalsLine } from './todoLogic';

/*
 * 오늘(홈) 계획 대비 실제(재출시 설계 "오늘(홈) 계획 대비 실제 상태", 디자인 리뷰 D6·D10·D12, 타이머 개편 T4).
 * 목표는 총량 계획과 Todo 계획 블록 합 중 큰 값(DR-5). 실제는 오늘 기록(entry)의 분: 멈춘 시간은 빼고 뽀모도로 휴식은
 * 넣는다(BREAK A). 진행 중 기록은 지금까지. 자정을 넘는 기록은 오늘 몫만.
 * 줄은 카테고리 항목(집중·운동·기타·옛 휴식·관계·수면). 옛 계획의 업무·자기개발은 집중으로 합친다(CEO 리뷰 2 D4b).
 * 세부 항목 목표 줄은 T9에서 바꾼다.
 *   계획 X · 기록 X → "오늘 첫 칸을 기다리는 중" + 오늘 계획 세우기
 *   계획 O · 기록 X → 목표 막대만 연하게, "첫 기록은 다음 알림에서"
 *   계획 X · 기록 O → 실제 막대만, "오늘 계획 없음 · 지금 세우기"
 *   계획 O · 기록 O → 목표(연하게)·실제(진하게), 차이가 가장 큰 줄 한 줄
 */

// 디자인 리뷰 D11 순서(아침 계획 요약이 쓴다)
export const ROW_ORDER: Category[] = ['work', 'rest', 'relationship', 'exercise', 'self_dev', 'sleep'];
// 줄 순서이자 차이가 같을 때 고르는 순서(설계서 E2 규칙을 항목으로)
const ITEM_ORDER: string[] = ['focus', 'exercise', 'other', 'rest', 'relationship', 'sleep'];
const ITEM_NAME = new Map<string, string>(SYSTEM_ITEMS.map((i) => [i.id, i.name]));

export type PvaRow = { item: string; name: string; target: number; actual: number }; // 분
export type PvaState = 'empty' | 'planOnly' | 'actualOnly' | 'both';
export type Pva = { state: PvaState; rows: PvaRow[]; line: string | null };

export function buildPva(
  entries: TimelineEntry[],
  plan: Pick<PlanRow, 'category' | 'target_minutes'>[],
  blocks: BlockRow[],
  day: [number, number],
  now: number,
): Pva {
  const actual = new Map<string, number>();
  for (const e of entries) {
    const min = activeMinutesIn(e, day, now);
    if (min > 0) actual.set(e.root_id, (actual.get(e.root_id) ?? 0) + min);
  }
  const target = new Map<string, number>();
  for (const l of totalsLine(plan, blocks)) {
    const item = CATEGORY_ITEM[l.category];
    target.set(item, (target.get(item) ?? 0) + l.target);
  }
  const rows = ITEM_ORDER.map((item) => ({
    item,
    name: ITEM_NAME.get(item) ?? item,
    target: target.get(item) ?? 0,
    actual: Math.round(actual.get(item) ?? 0),
  })).filter((r) => r.target > 0 || r.actual > 0);
  const hasPlan = rows.some((r) => r.target > 0);
  const hasActual = rows.some((r) => r.actual > 0);
  const state: PvaState = hasPlan ? (hasActual ? 'both' : 'planOnly') : hasActual ? 'actualOnly' : 'empty';
  return { state, rows, line: gapLine(rows, state) };
}

// 사실만 쓴다(디자인 리뷰 D10): 부호·평가 없이 실제와 계획 두 숫자.
export function gapLine(rows: PvaRow[], state: PvaState): string | null {
  const pick = (score: (r: PvaRow) => number) =>
    [...rows].sort((a, b) => score(b) - score(a) || ITEM_ORDER.indexOf(a.item) - ITEM_ORDER.indexOf(b.item))[0];
  if (state === 'both') {
    const r = pick((x) => Math.abs(x.actual - x.target));
    return `오늘 ${r.name} ${hours(r.actual)} · 계획 ${hours(r.target)}`;
  }
  if (state === 'actualOnly') {
    const r = pick((x) => x.actual);
    return `오늘 가장 많이 한 일 · ${r.name} ${hours(r.actual)}`;
  }
  return null;
}

export async function loadPva(db: Db, now: Date, tz: string): Promise<Pva> {
  const date = localParts(now, tz).date;
  const day = dayBounds(date, tz);
  const entries = await loadTimelineEntries(db, day[0], Math.min(day[1], now.getTime()));
  return buildPva(entries, await planRowsOn(db, date), await planBlocksOn(db, date, tz), day, now.getTime());
}

/*
 * S2용 plan_vs_actual_viewed(디자인 리뷰 D5): 그날 저녁 시작 이후 오늘(홈)이 처음 보일 때 하루 1회.
 * 저녁 시작 = 그 요일에 시작해 자정을 넘기는 방해금지(취침)의 시작 시각, 없으면 23:30.
 */
export function eveningStartMin(quiet: Quiet, weekday: number): number {
  const night = quiet.filter((w) => w.startMin > w.endMin && w.days.includes(weekday));
  return night.length > 0 ? Math.min(...night.map((w) => w.startMin)) : 23 * 60 + 30;
}

const VIEWED_KEY = 'pva_viewed_date';

export async function noteHomeViewed(db: Db, now: Date, tz: string, quiet: Quiet): Promise<boolean> {
  const p = localParts(now, tz);
  if (p.minuteOfDay < eveningStartMin(quiet, p.weekday)) return false;
  if ((await getSetting<string>(db, VIEWED_KEY)) === p.date) return false;
  await setSetting(db, VIEWED_KEY, p.date);
  await logEvent(db, {
    id: uuidv4(),
    type: 'plan_vs_actual_viewed',
    ts: now.toISOString(),
    props: { local_date: p.date },
  });
  return true;
}
