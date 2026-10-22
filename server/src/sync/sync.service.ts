import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  BatchResult,
  EventItem,
  PlanItem,
  SlotItem,
} from './sync.dto';
import {
  checkItem,
  emptyResult,
  isCalendarDate,
  slotAlignmentError,
} from './batch';

export const RESTORE_PAGE = 500;

// 복원 응답 행은 앱 SQLite 열 이름(snake_case) 그대로 보낸다.
type RestorePage = {
  slots: Record<string, unknown>[];
  plans: Record<string, unknown>[];
  cursor: string | null;
  has_more: boolean;
};

@Injectable()
export class SyncService {
  constructor(private dataSource: DataSource) {}

  // 충돌 시 client_updated_at이 더 최신인 쪽을 남긴다. 오래된 값은 무시하지만 accepted로 응답한다.
  async upsertSlots(
    userId: string,
    rawItems: unknown[],
    tz?: string,
  ): Promise<BatchResult> {
    const result = emptyResult();
    await this.dataSource.transaction(async (manager) => {
      for (const raw of rawItems) {
        const checked = await checkItem(SlotItem, raw, (s) =>
          slotAlignmentError(s.slot_start, s.tz),
        );
        if (!checked.ok) {
          result.rejected.push({ qid: checked.qid, reason: checked.reason });
          continue;
        }
        const s = checked.item;
        await manager.query(
          `INSERT INTO slot (user_id, slot_start, tz, category, note, source,
                             answered_at, client_updated_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, clock_timestamp())
           ON CONFLICT (user_id, slot_start) DO UPDATE SET
             tz = EXCLUDED.tz, category = EXCLUDED.category, note = EXCLUDED.note,
             source = EXCLUDED.source, answered_at = EXCLUDED.answered_at,
             client_updated_at = EXCLUDED.client_updated_at,
             updated_at = clock_timestamp()
           WHERE slot.client_updated_at < EXCLUDED.client_updated_at`,
          [
            userId,
            s.slot_start,
            s.tz,
            s.category,
            s.note ?? null,
            s.source,
            s.answered_at ?? null,
            s.client_updated_at,
          ],
        );
        result.accepted.push(s.qid);
      }
      await this.touchLastTz(manager, userId, tz);
    });
    return result;
  }

  async upsertPlans(
    userId: string,
    rawItems: unknown[],
    tz?: string,
  ): Promise<BatchResult> {
    const result = emptyResult();
    await this.dataSource.transaction(async (manager) => {
      for (const raw of rawItems) {
        const checked = await checkItem(PlanItem, raw, (p) =>
          isCalendarDate(p.local_date) ? null : 'local_date is not a valid date',
        );
        if (!checked.ok) {
          result.rejected.push({ qid: checked.qid, reason: checked.reason });
          continue;
        }
        const p = checked.item;
        await manager.query(
          `INSERT INTO plan (user_id, local_date, category, target_minutes,
                             client_updated_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, clock_timestamp())
           ON CONFLICT (user_id, local_date, category) DO UPDATE SET
             target_minutes = EXCLUDED.target_minutes,
             client_updated_at = EXCLUDED.client_updated_at,
             updated_at = clock_timestamp()
           WHERE plan.client_updated_at < EXCLUDED.client_updated_at`,
          [userId, p.local_date, p.category, p.target_minutes, p.client_updated_at],
        );
        result.accepted.push(p.qid);
      }
      await this.touchLastTz(manager, userId, tz);
    });
    return result;
  }

  // 클라이언트 id 기준 멱등. 같은 배치를 다시 보내도 행 수는 그대로다.
  async insertEvents(userId: string, rawItems: unknown[]): Promise<BatchResult> {
    const result = emptyResult();
    await this.dataSource.transaction(async (manager) => {
      for (const raw of rawItems) {
        const checked = await checkItem(EventItem, raw, eventPropsError);
        if (!checked.ok) {
          result.rejected.push({ qid: checked.qid, reason: checked.reason });
          continue;
        }
        const e = checked.item;
        await manager.query(
          `INSERT INTO event (id, user_id, type, ts, props)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [e.id, userId, e.type, e.ts, JSON.stringify(e.props ?? {})],
        );
        result.accepted.push(e.qid);
      }
    });
    return result;
  }

  /*
   * 기기 복원. 커서는 서버가 부여한 updated_at(마이크로초 문자열)이다.
   * 한 페이지는 표마다 최대 RESTORE_PAGE행이고, 같은 updated_at은 페이지 사이에서 쪼개지 않는다.
   */
  async restore(userId: string, since: string | undefined): Promise<RestorePage> {
    const from = since ?? '-infinity';
    const limit = await this.pageLimit(userId, from);
    const until = limit ?? 'infinity';

    const slots: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT slot_start, tz, category, note, source, answered_at,
              client_updated_at, ${cursorSql('updated_at')} AS updated_at
         FROM slot
        WHERE user_id = $1 AND updated_at > $2::timestamptz AND updated_at <= $3::timestamptz
        ORDER BY updated_at`,
      [userId, from, until],
    );
    const plans: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT to_char(local_date, 'YYYY-MM-DD') AS local_date, category, target_minutes,
              client_updated_at, ${cursorSql('updated_at')} AS updated_at
         FROM plan
        WHERE user_id = $1 AND updated_at > $2::timestamptz AND updated_at <= $3::timestamptz
        ORDER BY updated_at`,
      [userId, from, until],
    );

    const last = [...slots, ...plans]
      .map((r) => r.updated_at as string)
      .sort()
      .pop();
    return {
      slots,
      plans,
      cursor: limit ?? last ?? since ?? null,
      has_more: limit !== null,
    };
  }

  // 어느 표든 since 이후 행이 RESTORE_PAGE를 넘으면, 두 표 중 더 이른 경계 시각을 돌려준다.
  private async pageLimit(userId: string, from: string): Promise<string | null> {
    const [{ boundary }]: { boundary: string | null }[] =
      await this.dataSource.query(
        `SELECT ${cursorSql('b')} AS boundary FROM (SELECT LEAST(
           (SELECT updated_at FROM slot WHERE user_id = $1 AND updated_at > $2::timestamptz
             ORDER BY updated_at OFFSET $3::int - 1 LIMIT 1),
           (SELECT updated_at FROM plan WHERE user_id = $1 AND updated_at > $2::timestamptz
             ORDER BY updated_at OFFSET $3::int - 1 LIMIT 1)
         ) AS b) t`,
        [userId, from, RESTORE_PAGE],
      );
    return boundary;
  }

  private async touchLastTz(
    manager: EntityManager,
    userId: string,
    tz?: string,
  ): Promise<void> {
    if (!tz) return;
    await manager.query(`UPDATE "user" SET last_tz = $2 WHERE id = $1`, [userId, tz]);
  }
}

// JS Date는 밀리초까지만 담아서, 커서는 Postgres에서 마이크로초 UTC 문자열로 만든다.
function cursorSql(column: string): string {
  return `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

function eventPropsError(e: EventItem): string | null {
  if (e.type === 'feedback') {
    const memo = e.props?.memo;
    if (memo !== undefined && (typeof memo !== 'string' || memo.length > 500)) {
      return 'feedback memo must be a string of at most 500 chars';
    }
  }
  return null;
}
