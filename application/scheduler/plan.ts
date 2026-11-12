import type { Category, SlotSource } from '@/db/types';
import { CATEGORY_LABEL } from '@/db/types';
import { localParts, MINUTE_MS, SLOT_MS } from '@/lib/localTime';

/*
 * 방해금지 시간 목록(D19). 앱 로컬에만 저장한다(구현 D1).
 * 하나는 현지 시각 [startMin, endMin)과 적용 요일(0=일 ~ 6=토)이다. start > end면 자정을 넘겨 다음 날 endMin까지 이어지고,
 * 요일은 시작 시각의 요일로 판정한다. 예: 금요일 23:00~07:00이면 토요일 새벽 07:00까지 묻지 않는다.
 * start == end이거나 요일이 비어 있으면 적용되지 않는다.
 */
export type QuietWindow = { startMin: number; endMin: number; days: number[] };
export type Quiet = QuietWindow[];

/*
 * 알림 일시 중지(구현 D25). 계정 관리의 스위치로 끈다. until까지 울릴 칸은 예약하지 않는다.
 * until이 null이면 다시 켤 때까지 멈춘다. until이 지났으면 멈춘 상태가 아니다.
 */
export type Pause = { until: string | null };

export function normalizePause(raw: unknown): Pause | null {
  if (!raw || typeof raw !== 'object') return null;
  const { until } = raw as Partial<Pause>;
  if (until === null) return { until: null };
  return typeof until === 'string' && !Number.isNaN(Date.parse(until)) ? { until } : null;
}

export function isPaused(pause: Pause | null, at: Date): boolean {
  if (!pause) return false;
  return pause.until === null || at.getTime() < Date.parse(pause.until);
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];
export const MAX_QUIET_WINDOWS = 5;

// 예약 총수 상한 400 중 저녁 알림·만료 안내 몫 2개를 뺀 값
export const MAX_PINGS = 398;

// 저장된 값을 목록으로 읽는다. 예전 형식(하나짜리 {startMin, endMin} 또는 null)은 매일 적용으로 바꾼다.
export function normalizeQuiet(raw: unknown): Quiet {
  const one = (w: unknown): QuietWindow | null => {
    if (!w || typeof w !== 'object') return null;
    const { startMin, endMin, days } = w as Partial<QuietWindow>;
    if (typeof startMin !== 'number' || typeof endMin !== 'number') return null;
    return { startMin, endMin, days: Array.isArray(days) ? days : ALL_DAYS };
  };
  if (Array.isArray(raw)) return raw.map(one).filter((w): w is QuietWindow => w !== null);
  const single = one(raw);
  return single ? [single] : [];
}

export function inQuiet(at: { minuteOfDay: number; weekday: number }, quiet: Quiet): boolean {
  const { minuteOfDay: m, weekday: d } = at;
  return quiet.some(({ startMin: s, endMin: e, days }) => {
    if (s === e) return false;
    if (s < e) return days.includes(d) && m >= s && m < e;
    // 자정을 넘기는 경우: 오늘 시작분이거나, 어제 시작해서 오늘 아침까지 이어진 부분
    return (days.includes(d) && m >= s) || (days.includes((d + 6) % 7) && m < e);
  });
}

// 칸은 시작 시각이 방해금지 안이면 묻지 않는다.
// 예: 23:00~07:00이면 22:30 칸(23:00에 알림)까지 묻고, 07:00 칸(07:30에 알림)부터 다시 묻는다.
// 요일마다 다를 수 있어 가장 많이 묻는 요일의 칸 수를 쓴다(예약 상한을 넘지 않게).
export function pingsPerDay(quiet: Quiet): number {
  let max = 0;
  for (let weekday = 0; weekday < 7; weekday++) {
    let n = 0;
    for (let m = 0; m < 1440; m += 30) if (!inQuiet({ minuteOfDay: m, weekday }, quiet)) n++;
    max = Math.max(max, n);
  }
  return max;
}

// 예약 기간 = floor(예약 몫 / 하루 비방해금지 칸 수)일. 하루 32칸이면 12일, 48칸이면 8일.
// 블록 끝 알림이 있으면 그 수만큼 칸 알림 몫이 줄어든다(eng review E1·T1).
export function horizonDays(quiet: Quiet, budget = MAX_PINGS): number {
  const perDay = pingsPerDay(quiet);
  return perDay === 0 ? 0 : Math.floor(budget / perDay);
}

/*
 * 블록(집중·계획) 동안에는 칸 알림을 걸지 않고, 블록 끝 시각에 끝 알림 하나를 건다.
 * 칸 알림은 칸이 끝나는 시각(fire)에 울리므로 start < fire ≤ end인 알림을 뺀다.
 * 예: 13:30–15:30 블록이면 14:00·14:30·15:00·15:30 알림이 빠지고 15:30에 끝 알림 하나가 울린다.
 * 13:30 알림(13:00–13:30 칸)은 그대로 울린다.
 */
export type ScheduleBlock = {
  id: string;
  category: Category;
  startAt: string; // UTC ISO
  endAt: string; // UTC ISO
};

export type DesiredBlockEnd = { blockId: string; fireAt: string; body: string };

function inBlock(fire: number, blocks: ScheduleBlock[]): boolean {
  return blocks.some((b) => Date.parse(b.startAt) < fire && fire <= Date.parse(b.endAt));
}

function hhmmAt(instant: number, tz: string): string {
  const m = localParts(new Date(instant), tz).minuteOfDay;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function blockEndBody(b: ScheduleBlock, tz: string): string {
  return `${CATEGORY_LABEL[b.category]} ${hhmmAt(Date.parse(b.startAt), tz)}–${hhmmAt(Date.parse(b.endAt), tz)} 끝`;
}

/*
 * 블록이 방해금지에 걸치면 방해금지가 시작되는 칸에서 블록을 끝낸다(eng review E3).
 * 블록을 만들 때 끝 시각을 정하는 데 쓴다. 시작 칸부터 방해금지면 시작 시각을 돌려준다(만들지 않는다).
 */
export function capToQuiet(startAt: string, endAt: string, tz: string, quiet: Quiet): string {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  // 시작이 든 칸부터 30분 칸 단위로 본다. 현지 :00/:30은 15분 격자에서 찾는다.
  let t = Math.floor(start / FIFTEEN_MIN) * FIFTEEN_MIN;
  for (; t < end; t += FIFTEEN_MIN) {
    if (localParts(new Date(t), tz).minuteOfDay % 30 !== 0) continue;
    if (inQuiet(localParts(new Date(t), tz), quiet)) return new Date(Math.max(t, start)).toISOString();
  }
  return endAt;
}

export type RecentSlot = { slot_start: string; category: Category; source: SlotSource };

export type DesiredPing = {
  slotStart: string; // UTC ISO. 알림 id는 slot:<slotStart>
  fireAt: string; // 칸이 끝나는 시각
  textKind: string; // 'default' | 'context:<category>'
};

export type DesiredSchedule = {
  pings: DesiredPing[];
  blockEnds: DesiredBlockEnd[];
  days: number;
  // 예약 마지막 알림 하루 전에 "알림이 곧 멈춰요" 안내. 예약이 없으면 null.
  expiryAt: string | null;
};

const FIFTEEN_MIN = 15 * MINUTE_MS;

// 앞으로 울릴 칸 알림 목록. 실제 시간대 오프셋은 모두 15분 단위라 15분 격자에서 현지 :00/:30을 찾는다.
export function desiredSchedule(params: {
  now: Date;
  tz: string;
  quiet: Quiet;
  recent: RecentSlot[];
  pause?: Pause | null;
  blocks?: ScheduleBlock[]; // 진행 중이거나 예정된 블록(planned·active)
}): DesiredSchedule {
  const { now, tz, quiet, pause = null, blocks = [] } = params;

  // 끝 알림을 먼저 정해 예약 몫에서 뺀다. 일시 중지 중인 시각의 끝 알림은 걸지 않는다.
  const blockEnds: DesiredBlockEnd[] = blocks
    .filter((b) => Date.parse(b.endAt) > now.getTime())
    .filter((b) => !isPaused(pause, new Date(b.endAt)))
    .sort((a, b) => Date.parse(a.endAt) - Date.parse(b.endAt))
    .slice(0, MAX_PINGS)
    .map((b) => ({ blockId: b.id, fireAt: new Date(b.endAt).toISOString(), body: blockEndBody(b, tz) }));
  const budget = MAX_PINGS - blockEnds.length;

  const days = horizonDays(quiet, budget);
  const end = now.getTime() + days * 24 * 60 * MINUTE_MS;
  const pings: DesiredPing[] = [];

  let t = Math.floor(now.getTime() / FIFTEEN_MIN) * FIFTEEN_MIN + FIFTEEN_MIN;
  for (; t <= end && pings.length < budget; t += FIFTEEN_MIN) {
    const fire = new Date(t);
    if (localParts(fire, tz).minuteOfDay % 30 !== 0) continue;
    const slotStart = new Date(t - SLOT_MS);
    if (inQuiet(localParts(slotStart, tz), quiet)) continue;
    if (isPaused(pause, fire)) continue;
    if (inBlock(t, blocks)) continue;
    pings.push({
      slotStart: slotStart.toISOString(),
      fireAt: fire.toISOString(),
      textKind: 'default',
    });
  }

  if (pings.length > 0) pings[0].textKind = contextKind(pings[0].slotStart, params.recent);

  const expiry = pings.length > 0 ? Date.parse(pings[pings.length - 1].fireAt) - 24 * 60 * MINUTE_MS : 0;
  return {
    pings,
    blockEnds,
    days,
    expiryAt: expiry > now.getTime() ? new Date(expiry).toISOString() : null,
  };
}

// 맥락 문구는 다음 칸 하나에만 넣는다. 직전 60분 안의 answered·continued 칸 중 가장 최근 칸 기준.
function contextKind(slotStart: string, recent: RecentSlot[]): string {
  const start = Date.parse(slotStart);
  const latest = recent
    .filter((s) => s.source === 'answered' || s.source === 'continued')
    .filter((s) => {
      const t = Date.parse(s.slot_start);
      return t >= start - 2 * SLOT_MS && t < start;
    })
    .sort((a, b) => Date.parse(b.slot_start) - Date.parse(a.slot_start))[0];
  return latest ? `context:${latest.category}` : 'default';
}

// 맥락 문구. 기본 문구("하셨나요")와 같은 높임으로, 카테고리마다 자연스러운 문장을 따로 둔다.
// "○○을 하셨나요" 틀은 수면·관계에서 어색해서 쓰지 않는다.
const CONTEXT_BODY: Record<Category, string> = {
  sleep: '방금도 주무셨나요?',
  rest: '방금도 쉬셨나요?',
  exercise: '방금도 운동하셨나요?',
  relationship: '방금도 사람들과 시간을 보내셨나요?',
  self_dev: '방금도 자기개발을 하셨나요?',
  work: '방금도 일하셨나요?',
};

export function pingContent(textKind: string): { title: string; body: string } {
  if (textKind.startsWith('context:')) {
    const body = CONTEXT_BODY[textKind.slice('context:'.length) as Category];
    if (body) return { title: 'LEFT30', body };
  }
  return { title: 'LEFT30', body: '지난 30분, 무엇을 하셨나요?' };
}

export const EXPIRY_CONTENT = {
  title: 'LEFT30',
  body: '알림이 곧 멈춰요, 앱을 한 번 열어 주세요',
};
