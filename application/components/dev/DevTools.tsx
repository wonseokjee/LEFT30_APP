import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GRAY_5, GRAY_7 } from '@/assets/palette';
import { deviceTz } from '@/lib/localTime';
import { lastEndedSlot } from '@/record/recordLogic';
import { PING_CHANNEL } from '@/scheduler/expoNotifier';
import { rescheduleNow } from '@/runtime/appRuntime';
import { continueCategoryId } from '@/scheduler/plan';

// 개발 빌드(__DEV__)에서만 그린다. 실기기 확인용: 테스트 알림, 예약 개수·다음 알림 시각.
export default function DevTools() {
  const [info, setInfo] = useState('');

  const refresh = useCallback(async () => {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const times = all
      .map((n) => (n.trigger as { value?: number; date?: number } | null))
      .map((t) => t?.value ?? t?.date ?? 0)
      .filter((t) => t > 0)
      .sort((a, b) => a - b);
    const next = times[0] ? new Date(times[0]).toLocaleString() : '-';
    setInfo(`예약된 알림 ${all.length}개 · 다음 ${next}`);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const testPing = async () => {
    const slotStart = lastEndedSlot(new Date(), deviceTz());
    await Notifications.scheduleNotificationAsync({
      identifier: 'dev-test',
      content: {
        title: 'LEFT30 (테스트)',
        body: '지난 30분, 무엇을 하셨나요?',
        data: { kind: 'ping', slotStart },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        channelId: PING_CHANNEL,
      },
    });
    setInfo('10초 뒤 테스트 알림 · 앱을 백그라운드로 보내고 기다려 주세요');
  };

  // 알림 버튼 확인: 지금 묻는 칸의 30분 알림에 [그대로 계속 · 업무]. 누르면 그 칸이 비어 있을 때만 업무로 기록된다.
  const testButton = async () => {
    const slotStart = lastEndedSlot(new Date(), deviceTz());
    await Notifications.scheduleNotificationAsync({
      identifier: 'dev-continue',
      content: {
        title: 'LEFT30 (테스트)',
        body: '방금도 일하셨나요?',
        categoryIdentifier: continueCategoryId('work'),
        data: { kind: 'ping', slotStart, continue: 'work' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 30,
        channelId: PING_CHANNEL,
      },
    });
    setInfo('30초 뒤 버튼 알림 · 그 사이 앱을 완전히 종료해 주세요');
  };

  const reschedule = async () => {
    await rescheduleNow();
    await refresh();
  };

  if (!__DEV__) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.title}>개발용</Text>
      <Text style={styles.info}>{info}</Text>
      <TouchableOpacity style={styles.button} onPress={testPing}>
        <Text style={styles.text}>10초 뒤 테스트 알림</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={testButton}>
        <Text style={styles.text}>30초 뒤 버튼 알림</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={reschedule}>
        <Text style={styles.text}>다시 예약하고 개수 보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: GRAY_7,
    paddingTop: 12,
    marginTop: 12,
  },
  title: { color: GRAY_5, fontSize: 13, marginBottom: 4 },
  info: { color: GRAY_5, fontSize: 13, marginBottom: 8 },
  button: { minHeight: 48, justifyContent: 'center' },
  text: { color: GRAY_5, fontSize: 13, textDecorationLine: 'underline' },
});
