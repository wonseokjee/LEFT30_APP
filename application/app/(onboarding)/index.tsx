import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_9 } from '@/assets/palette';
import { getRuntime, rescheduleNow } from '@/runtime/appRuntime';
import { setSetting } from '@/db/records';
import { NOTIF_ONBOARDED_KEY } from '@/components/login/afterLogin';

const MAX_SCALE = 1.3;

// 알림 권한 설명 한 화면(디자인 리뷰 D8). 거부해도 전용 화면은 없다. 오늘(홈) 배너가 안내한다.
export default function NotificationOnboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const allow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await setSetting(getRuntime().db, NOTIF_ONBOARDED_KEY, true);
      const { granted } = await Notifications.requestPermissionsAsync();
      if (granted) await rescheduleNow();
    } finally {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={MAX_SCALE}>
        30분마다 한 번 물어볼게요.
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={MAX_SCALE}>
        탭 한 번이면 기록돼요.
      </Text>
      <TouchableOpacity style={styles.button} onPress={allow} disabled={busy}>
        <Text style={styles.buttonText} maxFontSizeMultiplier={MAX_SCALE}>
          알림 허용
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: GRAY_9,
  },
  title: {
    color: GRAY_0,
    fontSize: 16,
    marginBottom: 8,
  },
  body: {
    color: GRAY_5,
    fontSize: 16,
    marginBottom: 40,
  },
  button: {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: GRAY_0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: GRAY_9,
    fontSize: 16,
  },
});
