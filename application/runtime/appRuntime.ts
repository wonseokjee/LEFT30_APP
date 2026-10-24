import * as Notifications from 'expo-notifications';
import type { Db } from '@/db/types';
import { openAppDb } from '@/db/expoDb';
import { initDb, type InitResult } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { noteTz, wipeLocalData } from '@/db/records';
import { backoffMs, createSyncEngine } from '@/sync/engine';
import { httpTransport, secureStoreAuth } from '@/sync/http';
import { createScheduler } from '@/scheduler/scheduler';
import { ensurePingChannel, expoNotifier } from '@/scheduler/expoNotifier';
import { deviceTz } from '@/lib/localTime';
import { useAppStore } from '@/store/appStore';

// 앱 전체에서 하나만 쓰는 DB·동기화·스케줄러. 앱 시작 시 bootRuntime()으로 만든다.
type Runtime = {
  db: Db;
  sync: ReturnType<typeof createSyncEngine>;
  scheduler: ReturnType<typeof createScheduler>;
};

let runtime: Runtime | null = null;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export async function bootRuntime(): Promise<InitResult> {
  const db = await openAppDb();
  const result = await initDb(db, MIGRATIONS);
  if (!result.ok) return result;
  runtime = {
    db,
    sync: createSyncEngine({
      db,
      transport: httpTransport,
      auth: secureStoreAuth,
      getTz: deviceTz,
    }),
    scheduler: createScheduler({ db, notifier: expoNotifier, getTz: deviceTz }),
  };
  await ensurePingChannel();
  return result;
}

export function getRuntime(): Runtime {
  if (!runtime) throw new Error('runtime not booted');
  return runtime;
}

// 실패하면 5초부터 두 배씩(최대 10분) 늘려 다시 시도한다. 큐는 버리지 않는다.
export async function syncNow(): Promise<void> {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  try {
    const result = await getRuntime().sync.requestSync();
    if (result.status === 'needs_login') {
      useAppStore.getState().setNeedsLogin(true);
      return;
    }
    if (result.status === 'done') {
      failures = 0;
      useAppStore.getState().setNeedsLogin(false);
      return;
    }
  } catch (e) {
    console.warn('sync failed', e);
  }
  failures++;
  retryTimer = setTimeout(() => void syncNow(), backoffMs(failures));
}

// 프로세스가 새로 시작된 뒤 첫 재계산은 전부 다시 건다(구현 D4: 강제 종료로 지워진 알람 복구).
let coldStart = true;

export async function rescheduleNow(): Promise<void> {
  try {
    const { scheduler } = getRuntime();
    if (coldStart) {
      coldStart = false;
      await scheduler.rearm();
    } else {
      await scheduler.reschedule();
    }
  } catch (e) {
    console.warn('reschedule failed', e);
  }
}

// 앱 시작, 포그라운드 복귀 때. 시간대 변경 기록 → 예약 연장 → 동기화.
export async function onForeground(): Promise<void> {
  if (!runtime) return;
  await noteTz(runtime.db, deviceTz(), new Date());
  await rescheduleNow();
  await syncNow();
}

// DELETE /me 성공 후: 로컬 데이터 전체와 예약된 알림을 지운다.
export async function clearAfterWithdrawal(): Promise<void> {
  await wipeLocalData(getRuntime().db);
  await Notifications.cancelAllScheduledNotificationsAsync();
}
