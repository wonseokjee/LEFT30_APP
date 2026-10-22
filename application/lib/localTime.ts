// 시간대별 현지 날짜·시각 계산. 서버 slotAlignmentError와 같은 규칙(Intl)을 쓴다.

export const SLOT_MS = 30 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(tz, f);
  }
  return f;
}

export type LocalParts = {
  date: string; // YYYY-MM-DD
  minuteOfDay: number; // 0~1439
};

export function localParts(instant: Date, tz: string): LocalParts {
  const parts: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(instant)) parts[p.type] = p.value;
  const hour = Number(parts.hour) % 24;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minuteOfDay: hour * 60 + Number(parts.minute),
  };
}

// 칸 시작이 그 시간대의 :00/:30인지
export function isSlotAligned(instant: Date, tz: string): boolean {
  return (
    instant.getUTCSeconds() === 0 &&
    instant.getUTCMilliseconds() === 0 &&
    localParts(instant, tz).minuteOfDay % 30 === 0
  );
}

// local_date(slot) = slot_start를 slot.tz로 변환한 날짜
export function localDate(instant: Date, tz: string): string {
  return localParts(instant, tz).date;
}

export function deviceTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
