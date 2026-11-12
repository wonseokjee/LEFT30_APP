import * as Notifications from 'expo-notifications';
import type { Db } from '@/db/types';
import { openAppDb } from '@/db/expoDb';
import { initDb, type InitResult } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { noteTz, wipeLocalData } from '@/db/records';
import { backoffMs, createSyncEngine } from '@/sync/engine';
import { httpTransport, secureStoreAuth } from '@/sync/http';
import { createScheduler, readPause, readQuiet } from '@/scheduler/scheduler';
import { ensurePingChannel, expoNotifier } from '@/scheduler/expoNotifier';
import { deviceTz } from '@/lib/localTime';
import { settleBlocks } from '@/record/blockLogic';
import { loadMissedRun } from '@/record/batchLogic';
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

// 정확한 알람 권한을 켜고 돌아왔을 때(D14). 이미 걸린 알람은 부정확한 채로 남아 있어 전부 다시 건다.
export async function rearmNow(): Promise<void> {
  try {
    await getRuntime().scheduler.rearm();
  } catch (e) {
    console.warn('rearm failed', e);
  }
}

// 블록 상태를 시각에 맞게 옮기고, 답을 기다리는 블록이 있으면 끝 시트를 연다.
export async function settleBlocksNow(): Promise<void> {
  if (!runtime) return;
  try {
    const { endSheet } = await settleBlocks(runtime.db, new Date());
    const store = useAppStore.getState();
    store.bumpBlocks();
    if (endSheet && !store.sheetSlot) store.openBlockSheet(endSheet);
  } catch (e) {
    console.warn('settle blocks failed', e);
  }
}

// 블록 정리 뒤: 최근 5시간 안에 연속 빈칸이 있으면 놓친 칸 묶음 시트를 띄운다(UX-3).
export async function offerMissedRun(): Promise<void> {
  if (!runtime) return;
  try {
    const db = runtime.db;
    const run = await loadMissedRun(db, new Date(), deviceTz(), await readQuiet(db), await readPause(db));
    const store = useAppStore.getState();
    if (run) store.openBatchSheet(run);
    else if (store.sheetBatch) store.closeBatchSheet();
  } catch (e) {
    console.warn('missed run failed', e);
  }
}

// 앱 시작, 포그라운드 복귀 때. 시간대 변경 기록 → 블록 정리 → 예약 연장 → 동기화.
export async function onForeground(): Promise<void> {
  if (!runtime) return;
  await noteTz(runtime.db, deviceTz(), new Date());
  await settleBlocksNow();
  await offerMissedRun();
  await rescheduleNow();
  await syncNow();
}

// 블록을 만들거나 바꾼 뒤: 화면 갱신 → 알림 다시 계산 → 동기화.
export async function afterBlockChange(): Promise<void> {
  useAppStore.getState().bumpBlocks();
  await rescheduleNow();
  void syncNow();
}

// DELETE /me 성공 후: 로컬 데이터 전체와 예약된 알림을 지운다.
export async function clearAfterWithdrawal(): Promise<void> {
  await wipeLocalData(getRuntime().db);
  await Notifications.cancelAllScheduledNotificationsAsync();
}
