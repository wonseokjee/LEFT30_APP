import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GRAY_5, GRAY_7 } from '@/assets/palette';
import { deviceTz } from '@/lib/localTime';
import { lastEndedSlot } from '@/record/recordLogic';
import { PING_CHANNEL } from '@/scheduler/expoNotifier';
import { getRuntime, rescheduleNow } from '@/runtime/appRuntime';
import { getSetting } from '@/db/records';
import { EXP2_ACTION, EXP2_CATEGORY, EXP2_KEY } from '@/notifications/continueTask';

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
    const exp2 = await getSetting<{ at: string; category: string | null }>(getRuntime().db, EXP2_KEY);
    setInfo(
      `예약된 알림 ${all.length}개 · 다음 ${next}` +
        (exp2 ? ` · EXP-2 버튼 저장 ${new Date(exp2.at).toLocaleTimeString()} (${exp2.category})` : ' · EXP-2 버튼 저장 없음'),
    );
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

  // EXP-2: [그대로 계속 · 업무] 버튼이 달린 알림. 앱을 완전히 종료한 뒤 버튼을 누르고, 다시 열어 저장 시각을 본다.
  const testButton = async () => {
    await Notifications.setNotificationCategoryAsync(EXP2_CATEGORY, [
      { identifier: EXP2_ACTION, buttonTitle: '그대로 계속 · 업무', options: { opensAppToForeground: false } },
    ]);
    await Notifications.scheduleNotificationAsync({
      identifier: 'dev-exp2',
      content: {
        title: 'LEFT30 (EXP-2)',
        body: '지난 30분, 무엇을 하셨나요?',
        categoryIdentifier: EXP2_CATEGORY,
        data: { kind: 'exp2', category: 'work' },
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
        <Text style={styles.text}>30초 뒤 버튼 알림 (EXP-2)</Text>
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
