import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { setSetting } from '@/db/records';
import { openAppDb } from '@/db/expoDb';

/*
 * EXP-2 실험(docs/designs/left30-focus-block.md): 알림 버튼 [그대로 계속 · 카테고리]를 앱을 열지 않고 저장할 수 있는가.
 * Android는 앱이 꺼져 있어도 알림 버튼을 누르면 이 작업을 실행한다(expo-notifications registerTaskAsync).
 * 그래서 앱 진입점(index.js)에서 라우터보다 먼저 정의·등록한다. 실험은 setting에만 남긴다.
 */

export const CONTINUE_TASK = 'left30-continue-action';
export const EXP2_CATEGORY = 'exp2_continue';
export const EXP2_ACTION = 'continue';
export const EXP2_KEY = 'exp2_last';

type ResponsePayload = {
  actionIdentifier?: string;
  notification?: { request?: { identifier?: string; content?: { data?: Record<string, unknown> } } };
};

TaskManager.defineTask<ResponsePayload>(CONTINUE_TASK, async ({ data, error }) => {
  if (error || !data || data.actionIdentifier !== EXP2_ACTION) return;
  const db = await openAppDb();
  await setSetting(db, EXP2_KEY, {
    at: new Date().toISOString(),
    category: data.notification?.request?.content?.data?.category ?? null,
  });
  const id = data.notification?.request?.identifier;
  if (id) await Notifications.dismissNotificationAsync(id);
});

Notifications.registerTaskAsync(CONTINUE_TASK).catch((e) => console.warn('register continue task failed', e));
