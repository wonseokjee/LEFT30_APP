import type { Category, SlotRow } from '@/db/types';
import { localParts, MINUTE_MS, SLOT_MS } from '@/lib/localTime';

export const ROWS_PER_DAY = 48;

export type Cell = {
  row: number; // 0~47, 현지 시각 / 30분
  slotStart: string | null; // 서머타임으로 사라진 시각이면 null
  category: Category | null;
  runStart: boolean; // 같은 카테고리가 이어지는 첫 칸(이름을 여기에만 쓴다)
};

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

// 시간표 한 열(하루). 칸은 현지 시각 행에 놓는다. 서머타임으로 같은 시각이 두 번이면 기록된 쪽을 보여준다.
export function dayColumn(date: string, tz: string, slots: SlotRow[]): Cell[] {
  const byStart = new Map(slots.map((s) => [s.slot_start, s.category]));
  const cells: Cell[] = Array.from({ length: ROWS_PER_DAY }, (_, row) => ({
    row,
    slotStart: null,
    category: null,
    runStart: false,
  }));
  for (const slotStart of daySlots(date, tz)) {
    const row = localParts(new Date(slotStart), tz).minuteOfDay / 30;
    const cell = cells[row];
    if (cell.slotStart && cell.category) continue;
    cell.slotStart = slotStart;
    cell.category = byStart.get(slotStart) ?? null;
  }
  for (const cell of cells) {
    const prev = cells[cell.row - 1];
    cell.runStart = cell.category !== null && prev?.category !== cell.category;
  }
  return cells;
}

// 탭으로 채우거나 고칠 수 있는 칸: 이미 끝난 칸만. 지금 칸과 미래 칸은 반응하지 않는다.
export function isPastSlot(slotStart: string, now: Date): boolean {
  return Date.parse(slotStart) + SLOT_MS <= now.getTime();
}
