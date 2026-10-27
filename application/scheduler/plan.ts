import type { Category, SlotSource } from '@/db/types';
import { localParts, MINUTE_MS, SLOT_MS } from '@/lib/localTime';

/*
 * 방해금지 시간 목록(D19). 앱 로컬에만 저장한다(구현 D1).
 * 하나는 현지 시각 [startMin, endMin)과 적용 요일(0=일 ~ 6=토)이다. start > end면 자정을 넘겨 다음 날 endMin까지 이어지고,
 * 요일은 시작 시각의 요일로 판정한다. 예: 금요일 23:00~07:00이면 토요일 새벽 07:00까지 묻지 않는다.
 * start == end이거나 요일이 비어 있으면 적용되지 않는다.
 */
export type QuietWindow = { startMin: number; endMin: number; days: number[] };
export type Quiet = QuietWindow[];

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

// 예약 기간 = floor(398 / 하루 비방해금지 칸 수)일. 하루 32칸이면 12일, 48칸이면 8일.
export function horizonDays(quiet: Quiet): number {
  const perDay = pingsPerDay(quiet);
  return perDay === 0 ? 0 : Math.floor(MAX_PINGS / perDay);
}

export type RecentSlot = { slot_start: string; category: Category; source: SlotSource };

export type DesiredPing = {
  slotStart: string; // UTC ISO. 알림 id는 slot:<slotStart>
  fireAt: string; // 칸이 끝나는 시각
  textKind: string; // 'default' | 'context:<category>'
};

export type DesiredSchedule = {
  pings: DesiredPing[];
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
}): DesiredSchedule {
  const { now, tz, quiet } = params;
  const days = horizonDays(quiet);
  const end = now.getTime() + days * 24 * 60 * MINUTE_MS;
  const pings: DesiredPing[] = [];

  let t = Math.floor(now.getTime() / FIFTEEN_MIN) * FIFTEEN_MIN + FIFTEEN_MIN;
  for (; t <= end && pings.length < MAX_PINGS; t += FIFTEEN_MIN) {
    const fire = new Date(t);
    if (localParts(fire, tz).minuteOfDay % 30 !== 0) continue;
    const slotStart = new Date(t - SLOT_MS);
    if (inQuiet(localParts(slotStart, tz), quiet)) continue;
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
