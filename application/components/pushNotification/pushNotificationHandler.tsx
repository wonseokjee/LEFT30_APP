import type { Notification, NotificationBehavior } from 'expo-notifications';

// 앱이 켜져 있을 때 도착한 알림을 보여줄지. 30분 알림과 만료 안내는 앱 안에서도 보여준다.
export const handleNotification = async (
  notification: Notification,
): Promise<NotificationBehavior> => {
  const kind = notification.request.content.data?.kind;
  const show = kind === 'ping' || kind === 'expiry';
  return {
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: show,
    shouldShowList: show,
  };
};
