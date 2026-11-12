import type { Category, Db, SlotRow } from '@/db/types';
import { getSetting, logEvent, savePlan, setSetting } from '@/db/records';
import { localParts } from '@/lib/localTime';
import { uuidv4 } from '@/lib/uuid';
import { planRowsOn, shiftDate } from './todoLogic';

/*
 * 아침 계획 제안(재출시 설계 E1). 각 local_date의 첫 앱 진입이 15시 이전이면 한 번 띄운다.
 *   [어제와 동일]: 어제 plan 복사. 어제 plan이 없으면 어제 실제 기록으로 카테고리별 시간을 만든다(inferred 제외).
 *   [새로 짜기]: 총량 스테퍼 시트(D11).
 * 어제 plan도 없고 어제 기록이 8칸 미만이면 제안 없이 바로 새로 짜기. 오늘 계획이 이미 있으면 띄우지 않는다.
 */

export const MORNING_CUTOFF_MIN = 15 * 60;
const MIN_ACTUAL_SLOTS = 8;
const OFFERED_KEY = 'morning_offered_date';

export type Targets = Partial<Record<Category, number>>;
export type MorningOffer =
  | { kind: 'suggest'; date: string; targets: Targets; source: 'yesterday_plan' | 'yesterday_actual' }
  | { kind: 'new'; date: string };

// 오늘 처음 열었을 때 한 번만 판단한다(띄우지 않는 경우도 그날은 다시 보지 않는다).
export async function takeMorningOffer(db: Db, now: Date, tz: string): Promise<MorningOffer | null> {
  const { date, minuteOfDay } = localParts(now, tz);
  if ((await getSetting<string>(db, OFFERED_KEY)) === date) return null;
  await setSetting(db, OFFERED_KEY, date);
  if (minuteOfDay >= MORNING_CUTOFF_MIN) return null;
  if ((await planRowsOn(db, date)).length > 0) return null;

  const yesterday = shiftDate(date, -1);
  const plan = (await planRowsOn(db, yesterday)).filter((r) => r.target_minutes > 0);
  if (plan.length > 0) {
    return {
      kind: 'suggest',
      date,
      targets: Object.fromEntries(plan.map((r) => [r.category, r.target_minutes])),
      source: 'yesterday_plan',
    };
  }
  const slots = await db.all<Pick<SlotRow, 'slot_start' | 'tz' | 'category'>>(
    `SELECT slot_start, tz, category FROM slot WHERE source != 'inferred' AND slot_start >= ? AND slot_start < ?`,
    [new Date(now.getTime() - 3 * 86400_000).toISOString(), now.toISOString()],
  );
  const mine = slots.filter((s) => localParts(new Date(s.slot_start), s.tz).date === yesterday);
  if (mine.length < MIN_ACTUAL_SLOTS) return { kind: 'new', date };
  const targets: Targets = {};
  for (const s of mine) targets[s.category] = (targets[s.category] ?? 0) + 30;
  return { kind: 'suggest', date, targets, source: 'yesterday_actual' };
}

export async function acceptSame(db: Db, offer: Extract<MorningOffer, { kind: 'suggest' }>, now: Date): Promise<void> {
  await savePlan(db, offer.date, offer.targets, now.toISOString());
  await logEvent(db, {
    id: uuidv4(),
    type: 'plan_set',
    ts: now.toISOString(),
    props: { local_date: offer.date, mode: 'same_as_yesterday', source: offer.source },
  });
}
