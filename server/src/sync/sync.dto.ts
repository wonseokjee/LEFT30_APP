import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CATEGORIES, SLOT_SOURCES } from '../Entity/slot.entity';
import type { Category, SlotSource } from '../Entity/slot.entity';
import { EVENT_TYPES } from '../Entity/event.entity';
import type { EventType } from '../Entity/event.entity';

/*
 * 동기화 API 계약(앱 sync 큐와 공유한다. 바꾸면 양쪽을 함께 고친다).
 *
 * 요청:  { tz?: IANA, items: Item[] }   items ≤ 500, 본문 ≤ 1MB, 넘으면 413
 * 응답:  { accepted: qid[], rejected: { qid, reason }[] }   항상 200
 *
 * qid는 앱 큐 항목의 증가하는 id다. 앱은 응답에 있는 qid만 큐에서 지우고(R4),
 * rejected는 sync_dead_letter로 옮긴다(R3). 잘못된 항목이 있어도 나머지는 저장된다.
 */
export class BatchBody {
  @IsOptional()
  @IsString()
  tz?: string;

  @IsArray()
  items: unknown[];
}

export class SlotItem {
  @IsInt()
  qid: number;

  @IsISO8601({ strict: true })
  slot_start: string;

  @IsString()
  tz: string;

  @IsIn(CATEGORIES)
  category: Category;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsIn(SLOT_SOURCES)
  source: SlotSource;

  @IsOptional()
  @IsISO8601({ strict: true })
  answered_at?: string | null;

  @IsISO8601({ strict: true })
  client_updated_at: string;
}

export class PlanItem {
  @IsInt()
  qid: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  local_date: string;

  @IsIn(CATEGORIES)
  category: Category;

  @IsInt()
  @Min(0)
  @Max(1440)
  target_minutes: number;

  @IsISO8601({ strict: true })
  client_updated_at: string;
}

export class EventItem {
  @IsInt()
  qid: number;

  @IsUUID()
  id: string;

  @IsIn(EVENT_TYPES)
  type: EventType;

  @IsISO8601({ strict: true })
  ts: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

export type BatchResult = {
  accepted: number[];
  rejected: { qid: number | null; reason: string }[];
};
