import type { Db } from '@/db/types';
import { getSetting, setSetting } from '@/db/records';
import { singleFlight } from '@/lib/singleFlight';
import {
  desiredSchedule,
  EXPIRY_CONTENT,
  pingContent,
  type Quiet,
  type RecentSlot,
} from './plan';
import { SLOT_MS } from '@/lib/localTime';

/*
 * 알림 예약 재계산(R5).
 *
 *  [미예약] --앱 진입/기록/방해금지 변경--> [재계산 중(single-flight)] --차이 반영--> [예약됨(N일)]
 *  [예약됨] --만료 전날--> [안내 알림] --앱 진입--> [재계산 중]
 *  [예약됨] --권한 회수--> [권한 없음: 배너] --권한 복구--> [재계산 중]
 *  불가능: [재계산 중] → [재계산 중]  (진행 중 요청은 끝난 뒤 1회로 합친다)
 *
 * 전부 지우고 다시 걸지 않는다. scheduled_slot(우리가 건 예약 기록)과 비교해 바뀐 칸만 취소·추가한다.
 * 이미 지난 칸의 행은 남겨 둔다(ping_scheduled 소급 기록에 쓴다).
 */

export const QUIET_KEY = 'quiet';
export const EXPIRY_ID = 'expiry';
const EXPIRY_KEY = 'expiry_at';

export interface Notifier {
  hasPermission(): Promise<boolean>;
  schedule(
    id: string,
    fireAt: Date,
    content: { title: string; body: string; data: Record<string, string> },
  ): Promise<void>;
  cancel(id: string): Promise<void>;
}

export type RescheduleResult =
  | { status: 'no_permission' }
  | { status: 'ok'; days: number; added: number; cancelled: number };

type ScheduledRow = { slot_start: string; notification_id: string; text_kind: string };

export function pingId(slotStart: string): string {
  return `slot:${slotStart}`;
}

export function createScheduler(opts: {
  db: Db;
  notifier: Notifier;
  getTz: () => string;
  now?: () => Date;
}) {
  const { db, notifier } = opts;
  const now = opts.now ?? (() => new Date());

  async function reschedule(): Promise<RescheduleResult> {
    if (!(await notifier.hasPermission())) return { status: 'no_permission' };

    const at = now();
    const quiet = await getSetting<Quiet>(db, QUIET_KEY);
    const recent = await db.all<RecentSlot>(
      'SELECT slot_start, category, source FROM slot WHERE slot_start >= ?',
      [new Date(at.getTime() - 3 * SLOT_MS).toISOString()],
    );
    const desired = desiredSchedule({ now: at, tz: opts.getTz(), quiet, recent });

    // 아직 울리지 않은 예약만 비교한다.
    const existing = await db.all<ScheduledRow>(
      'SELECT slot_start, notification_id, text_kind FROM scheduled_slot WHERE slot_start > ?',
      [new Date(at.getTime() - SLOT_MS).toISOString()],
    );
    const want = new Map(desired.pings.map((p) => [p.slotStart, p]));
    const have = new Map(existing.map((r) => [r.slot_start, r]));

    let cancelled = 0;
    for (const row of existing) {
      const p = want.get(row.slot_start);
      if (p && p.textKind === row.text_kind) continue;
      await notifier.cancel(row.notification_id);
      await db.run('DELETE FROM scheduled_slot WHERE slot_start = ?', [row.slot_start]);
      cancelled++;
    }

    let added = 0;
    for (const p of desired.pings) {
      const row = have.get(p.slotStart);
      if (row && row.text_kind === p.textKind) continue;
      const id = pingId(p.slotStart);
      await notifier.schedule(id, new Date(p.fireAt), {
        ...pingContent(p.textKind),
        data: { kind: 'ping', slotStart: p.slotStart },
      });
      await db.run(
        `INSERT OR REPLACE INTO scheduled_slot (slot_start, notification_id, scheduled_at, text_kind)
         VALUES (?, ?, ?, ?)`,
        [p.slotStart, id, at.toISOString(), p.textKind],
      );
      added++;
    }

    // 만료 안내는 예약이 연장될 때마다 뒤로 민다.
    const prevExpiry = await getSetting<string>(db, EXPIRY_KEY);
    if (prevExpiry !== desired.expiryAt) {
      if (prevExpiry) await notifier.cancel(EXPIRY_ID);
      if (desired.expiryAt) {
        await notifier.schedule(EXPIRY_ID, new Date(desired.expiryAt), {
          ...EXPIRY_CONTENT,
          data: { kind: 'expiry' },
        });
      }
      await setSetting(db, EXPIRY_KEY, desired.expiryAt);
    }

    return { status: 'ok', days: desired.days, added, cancelled };
  }

  return { reschedule: singleFlight(reschedule) };
}
