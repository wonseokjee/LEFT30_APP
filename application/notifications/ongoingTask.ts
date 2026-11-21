import type { Db } from '@/db/types';
import { deviceTz } from '@/lib/localTime';
import { getItem } from '@/record/items';
import { ongoingContent } from '@/record/ongoing';
import { pauseTimer, readRunning, resumeTimer } from '@/record/timerLogic';
import { createScheduler } from '@/scheduler/scheduler';
import { expoNotifier } from '@/scheduler/expoNotifier';
import { hideOngoing, showOngoing } from '@/modules/ongoing-timer';
import { rescheduleNow } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';
import { backgroundDb, liveRuntime } from './backgroundDb';

/*
 * 진행 중 고정 알림(T8).
 * - syncOngoing: 지금 세션으로 알림을 다시 그린다. 세션이 없으면 지운다. 타이머를 바꾼 뒤·앱을 열 때·뽀모도로 단계가 바뀔 때 부른다.
 * - ongoingTask: 알림 버튼 [일시정지]/[재개]. 네이티브 리시버가 헤드리스 JS로 부른다(앱이 꺼져 있어도).
 *   저장 → 알림 재계산(뽀모도로 신호·30분 알림) → 고정 알림 다시 그림.
 */

export async function syncOngoing(db: Db, now = Date.now()): Promise<void> {
  try {
    const r = await readRunning(db);
    if (!r) return hideOngoing();
    const name = (await getItem(db, r.entry.item_id))?.name ?? '집중';
    showOngoing(ongoingContent(r, name, now));
  } catch (e) {
    console.warn('ongoing sync failed', e);
  }
}

export async function ongoingTask({ action }: { action?: string }): Promise<void> {
  const live = liveRuntime();
  const db = live?.db ?? (await backgroundDb());
  const now = Date.now();
  try {
    if (action === 'pause') await pauseTimer(db, now);
    else if (action === 'resume') await resumeTimer(db, now);
    if (live) {
      useAppStore.getState().bumpBlocks();
      await rescheduleNow();
    } else {
      await createScheduler({ db, notifier: expoNotifier, getTz: deviceTz }).reschedule();
    }
  } catch (e) {
    console.warn('ongoing action failed', e);
  }
  await syncOngoing(db);
}
