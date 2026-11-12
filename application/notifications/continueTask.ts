import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import type { Category, Db } from '@/db/types';
import { CATEGORIES } from '@/db/types';
import { openAppDb } from '@/db/expoDb';
import { initDb } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { deviceTz } from '@/lib/localTime';
import { readPingData, saveContinue } from '@/record/continueAction';
import { CONTINUE_ACTION } from '@/scheduler/plan';
import { createScheduler } from '@/scheduler/scheduler';
import { expoNotifier } from '@/scheduler/expoNotifier';
import { getRuntime, rescheduleNow } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

/*
 * 알림 버튼 [그대로 계속 · 카테고리](EXP-2 통과: 앱 완전 종료 상태에서도 저장됨, 2026-11-12 실기기).
 * Android는 앱이 꺼져 있어도 버튼을 누르면 이 작업을 실행한다(expo-notifications registerTaskAsync).
 * 그래서 앱 진입점(index.js)에서 라우터보다 먼저 정의·등록한다.
 * 저장 뒤 알림을 다시 계산해 다음 칸 알림에도 버튼이 붙게 한다. 동기화는 다음에 앱을 열 때 한다.
 */

export const CONTINUE_TASK = 'left30-continue-action';

type ResponsePayload = {
  actionIdentifier?: string;
  notification?: { request?: { identifier?: string; content?: { data?: unknown; dataString?: unknown } } };
};

let dbPromise: Promise<Db> | null = null;
// 앱이 꺼져 있을 때만 쓴다. 앱이 떠 있으면 같은 JS에서 돌므로 앱의 연결·스케줄러를 쓴다(getRuntime).
function backgroundDb(): Promise<Db> {
  dbPromise ??= (async () => {
    const db = await openAppDb();
    const r = await initDb(db, MIGRATIONS);
    if (!r.ok) throw new Error('db init failed');
    return db;
  })();
  return dbPromise;
}

function liveRuntime() {
  try {
    return getRuntime();
  } catch {
    return null;
  }
}

TaskManager.defineTask<ResponsePayload>(CONTINUE_TASK, async ({ data, error }) => {
  if (error || !data || data.actionIdentifier !== CONTINUE_ACTION) return;
  const request = data.notification?.request;
  const ping = readPingData(request?.content);
  const category = ping.continue as Category;
  if (ping.kind !== 'ping' || typeof ping.slotStart !== 'string' || !CATEGORIES.includes(category)) return;
  try {
    const live = liveRuntime();
    const db = live?.db ?? (await backgroundDb());
    await saveContinue(db, { slotStart: ping.slotStart, category, now: new Date(), fallbackTz: deviceTz() });
    if (live) {
      useAppStore.getState().bumpBlocks();
      await rescheduleNow();
    } else {
      await createScheduler({ db, notifier: expoNotifier, getTz: deviceTz }).reschedule();
    }
  } catch (e) {
    console.warn('continue action failed', e);
  }
  if (request?.identifier) await Notifications.dismissNotificationAsync(request.identifier);
});

Notifications.registerTaskAsync(CONTINUE_TASK).catch((e) => console.warn('register continue task failed', e));
