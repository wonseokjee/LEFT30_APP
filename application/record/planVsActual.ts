import type { BlockRow, Category, Db, PlanRow, SlotRow } from '@/db/types';
import { CATEGORY_LABEL } from '@/db/types';
import { getSetting, logEvent, setSetting } from '@/db/records';
import { localParts } from '@/lib/localTime';
import { uuidv4 } from '@/lib/uuid';
import type { Quiet } from '@/scheduler/plan';
import { hours, planBlocksOn, planRowsOn, totalsLine } from './todoLogic';

/*
 * 오늘(홈) 계획 대비 실제(재출시 설계 "오늘(홈) 계획 대비 실제 상태", 디자인 리뷰 D6·D10·D12).
 * 목표는 총량 계획과 Todo 계획 블록 합 중 큰 값(DR-5). 실제는 오늘 기록된 칸(출처 무관) × 30분.
 *   계획 X · 기록 X → "오늘 첫 칸을 기다리는 중" + 오늘 계획 세우기
 *   계획 O · 기록 X → 목표 막대만 연하게, "첫 기록은 다음 알림에서"
 *   계획 X · 기록 O → 실제 막대만, "오늘 계획 없음 · 지금 세우기"
 *   계획 O · 기록 O → 목표(연하게)·실제(진하게), 차이가 가장 큰 카테고리 한 줄
 */

// 디자인 리뷰 D11 순서
export const ROW_ORDER: Category[] = ['work', 'rest', 'relationship', 'exercise', 'self_dev', 'sleep'];
// 차이가 같으면 이 순서로 고른다(설계서 E2 규칙)
const TIE_ORDER: Category[] = ['work', 'self_dev', 'exercise', 'relationship', 'rest', 'sleep'];

export type PvaRow = { category: Category; target: number; actual: number }; // 분
export type PvaState = 'empty' | 'planOnly' | 'actualOnly' | 'both';
export type Pva = { state: PvaState; rows: PvaRow[]; line: string | null };

export function buildPva(
  slots: Pick<SlotRow, 'slot_start' | 'tz' | 'category'>[],
  plan: Pick<PlanRow, 'category' | 'target_minutes'>[],
  blocks: BlockRow[],
  date: string,
): Pva {
  const actual = new Map<Category, number>();
  for (const s of slots) {
    if (localParts(new Date(s.slot_start), s.tz).date !== date) continue;
    actual.set(s.category, (actual.get(s.category) ?? 0) + 30);
  }
  const target = new Map(totalsLine(plan, blocks).map((l) => [l.category, l.target]));
  const rows = ROW_ORDER.map((c) => ({ category: c, target: target.get(c) ?? 0, actual: actual.get(c) ?? 0 })).filter(
    (r) => r.target > 0 || r.actual > 0,
  );
  const hasPlan = rows.some((r) => r.target > 0);
  const hasActual = rows.some((r) => r.actual > 0);
  const state: PvaState = hasPlan ? (hasActual ? 'both' : 'planOnly') : hasActual ? 'actualOnly' : 'empty';
  return { state, rows, line: gapLine(rows, state) };
}

// 사실만 쓴다(디자인 리뷰 D10): 부호·평가 없이 실제와 계획 두 숫자.
export function gapLine(rows: PvaRow[], state: PvaState): string | null {
  const pick = (score: (r: PvaRow) => number) =>
    [...rows].sort((a, b) => score(b) - score(a) || TIE_ORDER.indexOf(a.category) - TIE_ORDER.indexOf(b.category))[0];
  if (state === 'both') {
    const r = pick((x) => Math.abs(x.actual - x.target));
    return `오늘 ${CATEGORY_LABEL[r.category]} ${hours(r.actual)} · 계획 ${hours(r.target)}`;
  }
  if (state === 'actualOnly') {
    const r = pick((x) => x.actual);
    return `오늘 가장 많이 한 일 · ${CATEGORY_LABEL[r.category]} ${hours(r.actual)}`;
  }
  return null;
}

export async function loadPva(db: Db, now: Date, tz: string): Promise<Pva> {
  const date = localParts(now, tz).date;
  const from = new Date(now.getTime() - 36 * 3600_000).toISOString();
  const slots = await db.all<Pick<SlotRow, 'slot_start' | 'tz' | 'category'>>(
    'SELECT slot_start, tz, category FROM slot WHERE slot_start >= ?',
    [from],
  );
  return buildPva(slots, await planRowsOn(db, date), await planBlocksOn(db, date, tz), date);
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
