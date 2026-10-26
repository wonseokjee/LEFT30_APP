import { PayloadTooLargeException } from '@nestjs/common';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { BatchResult } from './sync.dto';

export const MAX_BATCH_ITEMS = 500;

export function assertBatchSize(items: unknown[]): void {
  if (items.length > MAX_BATCH_ITEMS) {
    throw new PayloadTooLargeException(
      `batch exceeds ${MAX_BATCH_ITEMS} items`,
    );
  }
}

type Checked<T> =
  | { ok: true; item: T }
  | { ok: false; qid: number | null; reason: string };

// 항목마다 따로 검증한다(R3). 하나가 틀려도 배치 전체를 400으로 거절하지 않는다.
export async function checkItem<T extends { qid: number }>(
  cls: ClassConstructor<T>,
  raw: unknown,
  extra?: (item: T) => string | null,
): Promise<Checked<T>> {
  const qid = rawQid(raw);
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, qid, reason: 'item must be an object' };
  }
  const item = plainToInstance(cls, raw);
  const errors = await validate(item, { whitelist: true });
  if (errors.length > 0) {
    const reason = errors
      .map(e => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    return { ok: false, qid, reason };
  }
  const extraReason = extra?.(item) ?? null;
  if (extraReason) return { ok: false, qid, reason: extraReason };
  return { ok: true, item };
}

export function emptyResult(): BatchResult {
  return { accepted: [], rejected: [] };
}

function rawQid(raw: unknown): number | null {
  const qid = (raw as { qid?: unknown } | null)?.qid;
  return Number.isInteger(qid) ? (qid as number) : null;
}

// 칸 시각이 그 시간대의 :00/:30에 맞는지. 잘못된 시간대 이름이면 사유를 돌려준다.
export function slotAlignmentError(
  slotStart: string,
  tz: string,
): string | null {
  const date = new Date(slotStart);
  let minute: number;
  try {
    minute = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        minute: 'numeric',
      }).format(date),
    );
  } catch {
    return `unknown time zone: ${tz}`;
  }
  if (
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0 ||
    minute % 30 !== 0
  ) {
    return 'slot_start must be aligned to :00 or :30';
  }
  return null;
}

export function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
