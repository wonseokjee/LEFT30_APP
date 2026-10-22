import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Notifier } from './scheduler';

export const PING_CHANNEL = 'ping';

// Android 알림 채널. 앱 시작 시 한 번 만든다(이미 있으면 갱신).
export async function ensurePingChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PING_CHANNEL, {
    name: '30분 알림',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export const expoNotifier: Notifier = {
  async hasPermission() {
    return (await Notifications.getPermissionsAsync()).granted;
  },
  async schedule(id, fireAt, content) {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: PING_CHANNEL,
      },
    });
  },
  async cancel(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
  },
};
