import { CATEGORY_LABEL, type Category, type SlotSource } from '@/db/types';
import { localParts, MINUTE_MS, SLOT_MS } from '@/lib/localTime';

// 방해금지 시간(현지 분). start > end면 자정을 넘긴다. 앱 로컬에만 저장한다(구현 D1).
export type Quiet = { startMin: number; endMin: number } | null;

// 예약 총수 상한 400 중 저녁 알림·만료 안내 몫 2개를 뺀 값
export const MAX_PINGS = 398;

export function inQuiet(minuteOfDay: number, quiet: Quiet): boolean {
  if (!quiet || quiet.startMin === quiet.endMin) return false;
  const { startMin: s, endMin: e } = quiet;
  return s < e ? minuteOfDay >= s && minuteOfDay < e : minuteOfDay >= s || minuteOfDay < e;
}

// 칸은 시작 시각이 방해금지 안이면 묻지 않는다.
// 예: 23:00~07:00이면 22:30 칸(23:00에 알림)까지 묻고, 07:00 칸(07:30에 알림)부터 다시 묻는다.
export function pingsPerDay(quiet: Quiet): number {
  let n = 0;
  for (let m = 0; m < 1440; m += 30) if (!inQuiet(m, quiet)) n++;
  return n;
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
    if (inQuiet(localParts(slotStart, tz).minuteOfDay, quiet)) continue;
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

export function pingContent(textKind: string): { title: string; body: string } {
  if (textKind.startsWith('context:')) {
    const label = CATEGORY_LABEL[textKind.slice('context:'.length) as Category];
    if (label) return { title: 'LEFT30', body: `방금도 ${label}${wasEnding(label)}?` };
  }
  return { title: 'LEFT30', body: '지난 30분, 뭐 했어요?' };
}

// 받침이 있으면 "이었나요"(수면이었나요), 없으면 "였나요"(업무였나요)
function wasEnding(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code < 11172 && code % 28 !== 0;
  return hasFinal ? '이었나요' : '였나요';
}

export const EXPIRY_CONTENT = {
  title: 'LEFT30',
  body: '알림이 곧 멈춰요, 앱을 한 번 열어 주세요',
};
