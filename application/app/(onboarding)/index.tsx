import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_9 } from '@/assets/palette';
import { getRuntime, rearmNow, rescheduleNow } from '@/runtime/appRuntime';
import { setSetting } from '@/db/records';
import { NOTIF_ONBOARDED_KEY } from '@/components/login/afterLogin';

const MAX_SCALE = 1.3;

// Android 14부터 '알람 및 리마인더'(정확한 알람)가 처음부터 꺼져 있다. 꺼져 있으면 알림이 최대 1시간 늦는다.
const NEEDS_EXACT_ALARM = Platform.OS === 'android' && Number(Platform.Version) >= 34;

// 알림 권한 설명 한 화면(디자인 리뷰 D8). 거부해도 전용 화면은 없다. 오늘(홈) 배너가 안내한다.
// Android 14 이상은 허용 뒤 정확한 알람 안내 한 화면을 더 보여준다(D14).
export default function NotificationOnboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'notify' | 'exact'>('notify');

  const allow = async () => {
    if (busy) return;
    setBusy(true);
    let granted = false;
    try {
      await setSetting(getRuntime().db, NOTIF_ONBOARDED_KEY, true);
      ({ granted } = await Notifications.requestPermissionsAsync());
      // 예약은 뒤에서 한다. 385개를 거는 동안 화면을 붙잡지 않는다(D15).
      if (granted) void rescheduleNow();
    } finally {
      setBusy(false);
      if (granted && NEEDS_EXACT_ALARM) setStep('exact');
      else router.replace('/(tabs)');
    }
  };

  const openExactAlarm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 설정 화면에서 돌아올 때까지 기다린다. 켰는지는 알 수 없으니 돌아오면 전부 다시 건다.
      await IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', {
        data: `package:${Constants.expoConfig?.android?.package ?? 'com.left30m.app'}`,
      });
      void rearmNow();
    } catch (e) {
      console.warn('open exact alarm settings failed', e);
    } finally {
      setBusy(false);
      router.replace('/(tabs)');
    }
  };

  if (step === 'exact') {
    return (
      <View style={styles.container}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_SCALE}>
          제때 물어보려면 하나만 더 필요해요.
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={MAX_SCALE}>
          설정에서 &apos;알람 및 리마인더&apos;를 켜 주세요.
        </Text>
        <TouchableOpacity style={styles.button} onPress={openExactAlarm} disabled={busy}>
          <Text style={styles.buttonText} maxFontSizeMultiplier={MAX_SCALE}>
            설정 열기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.later} onPress={() => router.replace('/(tabs)')} disabled={busy}>
          <Text style={styles.laterText} maxFontSizeMultiplier={MAX_SCALE}>
            나중에
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  later: {
    minHeight: 48,
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laterText: {
    color: GRAY_5,
    fontSize: 13,
  },
});
