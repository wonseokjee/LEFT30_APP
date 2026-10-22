import type { SlotRow, SlotSource } from '@/db/types';
import { localParts, MINUTE_MS, SLOT_MS } from '@/lib/localTime';
import { inQuiet, type Quiet } from '@/scheduler/plan';

// 칸 종료 후 이 시간 안에 고르면 answered·continued, 지나면 late다.
export const ANSWER_WINDOW_MS = 60 * MINUTE_MS;

// 지금 묻는 칸 = 가장 최근에 끝난 칸. 현지 :00/:30 경계를 15분 격자에서 찾는다.
export function lastEndedSlot(now: Date, tz: string): string {
  const quarter = 15 * MINUTE_MS;
  let t = Math.floor(now.getTime() / quarter) * quarter;
  while (localParts(new Date(t), tz).minuteOfDay % 30 !== 0) t -= quarter;
  return new Date(t - SLOT_MS).toISOString();
}

// 이미 있는 칸을 고칠 때 source는 바뀌지 않는다. inferred만 직접 고르면 바뀐다.
export function sourceFor(
  slotStart: string,
  now: Date,
  existing: Pick<SlotRow, 'source'> | null,
  continued: boolean,
): SlotSource {
  if (existing && existing.source !== 'inferred') return existing.source;
  const end = Date.parse(slotStart) + SLOT_MS;
  if (now.getTime() > end + ANSWER_WINDOW_MS) return 'late';
  return continued ? 'continued' : 'answered';
}

// "그대로 계속" 대상: 직전 60분 안의 answered·continued 칸 중 가장 최근 칸. 없으면 버튼을 숨긴다.
export function continueCandidate(slotStart: string, slots: SlotRow[]): SlotRow | null {
  const start = Date.parse(slotStart);
  return (
    slots
      .filter((s) => s.source === 'answered' || s.source === 'continued')
      .filter((s) => {
        const t = Date.parse(s.slot_start);
        return t >= start - 2 * SLOT_MS && t < start;
      })
      .sort((a, b) => Date.parse(b.slot_start) - Date.parse(a.slot_start))[0] ?? null
  );
}

// "13:30 칸이 비어 있어요" 대상: 바로 앞 두 칸 중 아직 60분 안이고, 비었고, 방해금지가 아닌 가장 최근 칸.
export function emptySlotBefore(params: {
  slotStart: string;
  now: Date;
  filled: Set<string>;
  quiet: Quiet;
  tz: string;
}): string | null {
  const start = Date.parse(params.slotStart);
  for (const back of [1, 2]) {
    const s = start - back * SLOT_MS;
    const iso = new Date(s).toISOString();
    if (params.now.getTime() > s + SLOT_MS + ANSWER_WINDOW_MS) return null;
    if (params.filled.has(iso)) continue;
    if (inQuiet(localParts(new Date(s), params.tz).minuteOfDay, params.quiet)) continue;
    return iso;
  }
  return null;
}

// "업무로 기록", "수면으로 기록". ㄹ 받침과 받침 없음은 "로", 그 밖의 받침은 "으로".
export function withRo(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const final = code >= 0 && code < 11172 ? code % 28 : 0;
  return `${word}${final === 0 || final === 8 ? '로' : '으로'}`;
}

export function hhmm(instant: Date, tz: string): string {
  const m = localParts(instant, tz).minuteOfDay;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function slotRangeLabel(slotStart: string, tz: string): string {
  const start = new Date(slotStart);
  return `${hhmm(start, tz)}–${hhmm(new Date(start.getTime() + SLOT_MS), tz)}`;
}
