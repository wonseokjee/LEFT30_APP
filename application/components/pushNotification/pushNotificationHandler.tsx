import type { Notification, NotificationBehavior } from 'expo-notifications';
import { useAppStore } from '@/store/appStore';
import { getRuntime, settleBlocksNow } from '@/runtime/appRuntime';
import { logPingDisplayed } from '@/scheduler/pingEvents';

const HIDE: NotificationBehavior = {
  shouldPlaySound: false,
  shouldSetBadge: false,
  shouldShowBanner: false,
  shouldShowList: false,
};

// 앱이 켜져 있을 때 도착한 알림을 어떻게 보여줄지(D23).
// 갤럭시는 보고 있는 앱의 배너를 띄우지 않아 알림창에만 쌓인다(S23 실측).
// 그래서 30분 알림은 배너 대신 그 칸의 기록 시트를 바로 연다. 만료 안내는 알림으로 보여준다.
export const handleNotification = async (
  notification: Notification,
): Promise<NotificationBehavior> => {
  const data = notification.request.content.data;
  if (data?.kind === 'ping' && typeof data.slotStart === 'string') {
    logPingDisplayed(getRuntime().db, data.slotStart, new Date(notification.date || Date.now())).catch((e) =>
      console.warn('ping displayed failed', e),
    );
    useAppStore.getState().openSheet(data.slotStart);
    return HIDE;
  }
  // 블록 끝 알림도 앱 안이면 끝 시트를 바로 연다. 상태를 awaiting으로 옮기는 정리를 먼저 한다.
  if (data?.kind === 'block_end' && typeof data.blockId === 'string') {
    const blockId = data.blockId;
    void settleBlocksNow().then(() => useAppStore.getState().openBlockSheet(blockId));
    return HIDE;
  }
  // 뽀모도로 단계·타이머 끝 신호(G20): 앱이 열려 있어도 닫혀 있을 때와 같은 소리·진동. 창은 띄우지 않고 화면만 바뀐다.
  if (data?.kind === 'timer_signal') {
    useAppStore.getState().bumpBlocks();
    return { ...HIDE, shouldPlaySound: true };
  }
  if (data?.kind === 'expiry') {
    return { ...HIDE, shouldPlaySound: true, shouldShowBanner: true, shouldShowList: true };
  }
  return HIDE;
};
