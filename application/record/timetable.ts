import { localParts, MINUTE_MS, SLOT_MS } from '@/lib/localTime';

// YYYY-MM-DD에서 며칠 앞뒤 날짜. 달력 계산만 하므로 시간대와 무관하다(매월 1일 '0(어제)' 버그 방지).
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// 그 현지 날짜의 30분 칸 시작 시각들(UTC ISO, 오름차순). 보통 48칸, 서머타임 날은 46·50칸이다.
export function daySlots(date: string, tz: string): string[] {
  const [y, m, d] = date.split('-').map(Number);
  const quarter = 15 * MINUTE_MS;
  // 시간대 오프셋은 -12h~+14h라 이 범위 안에 그날 칸이 모두 들어간다.
  const from = Date.UTC(y, m - 1, d) - 15 * 60 * MINUTE_MS;
  const to = Date.UTC(y, m - 1, d + 1) + 13 * 60 * MINUTE_MS;
  const slots: string[] = [];
  for (let t = from; t < to; t += quarter) {
    const p = localParts(new Date(t), tz);
    if (p.date === date && p.minuteOfDay % 30 === 0) slots.push(new Date(t).toISOString());
  }
  return slots;
}

// 탭으로 채우거나 고칠 수 있는 칸: 이미 끝난 칸만. 지금 칸과 미래 칸은 반응하지 않는다.
export function isPastSlot(slotStart: string, now: Date): boolean {
  return Date.parse(slotStart) + SLOT_MS <= now.getTime();
}

// 시간표에서 누른 자리(그날 0시부터 분)가 들어 있는 30분 칸. 서머타임으로 사라진 시각이면 null.
export function slotAtMinute(date: string, tz: string, minute: number): string | null {
  for (const s of daySlots(date, tz)) {
    const m = localParts(new Date(s), tz).minuteOfDay;
    if (m <= minute && minute < m + 30) return s;
  }
  return null;
}
