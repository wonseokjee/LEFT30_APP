import type { Db } from '@/db/types';
import { ACCOUNT_KEY, getSetting, logEvent } from '@/db/records';
import { SLOT_MS } from '@/lib/localTime';
import { pingEventId } from '@/lib/uuid';

/*
 * S3(알림 신뢰성) 집계용 핑 이벤트. 설계서 docs/designs/left30-relaunch.md "event".
 * - ping_scheduled: 예약한 칸이 실제로 도래한 뒤(앱이 다음에 열릴 때 소급) 한 번만.
 * - ping_displayed: 알림이 보인 것을 앱이 관측했을 때(앱 안 수신, 탭, 앱을 열 때 알림창에 남은 것).
 * - ping_answered: 칸을 처음 기록할 때(S1-COUNT도 쓴다).
 * id는 uuidv5(user + type + slot_start)라 여러 번 관측해도 첫 기록만 남는다.
 */

const BACKFILL_MS = 7 * 24 * 60 * 60 * 1000;

async function userKey(db: Db): Promise<string> {
  return (await getSetting<string>(db, ACCOUNT_KEY)) ?? 'local';
}

export async function logPingScheduled(db: Db, now: Date): Promise<number> {
  const rows = await db.all<{ slot_start: string }>(
    'SELECT slot_start FROM scheduled_slot WHERE slot_start <= ? AND slot_start >= ?',
    [new Date(now.getTime() - SLOT_MS).toISOString(), new Date(now.getTime() - BACKFILL_MS).toISOString()],
  );
  const user = await userKey(db);
  for (const { slot_start } of rows) {
    const fireAt = new Date(Date.parse(slot_start) + SLOT_MS).toISOString();
    await logEvent(db, {
      id: pingEventId(user, 'ping_scheduled', slot_start),
      type: 'ping_scheduled',
      ts: fireAt,
      props: { slot_start, fire_at: fireAt },
    });
  }
  return rows.length;
}

// seenAt: 알림이 보인 시각(알림의 date가 있으면 그것, 없으면 관측 시각).
export async function logPingDisplayed(db: Db, slotStart: string, seenAt: Date): Promise<void> {
  const fireAt = Date.parse(slotStart) + SLOT_MS;
  await logEvent(db, {
    id: pingEventId(await userKey(db), 'ping_displayed', slotStart),
    type: 'ping_displayed',
    ts: seenAt.toISOString(),
    props: { slot_start: slotStart, delay_ms: Math.max(0, seenAt.getTime() - fireAt) },
  });
}

export async function logPingAnswered(db: Db, slotStart: string, source: string, at: Date): Promise<void> {
  await logEvent(db, {
    id: pingEventId(await userKey(db), 'ping_answered', slotStart),
    type: 'ping_answered',
    ts: at.toISOString(),
    props: { slot_start: slotStart, source },
  });
}
