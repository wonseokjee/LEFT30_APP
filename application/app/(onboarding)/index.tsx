import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_9 } from '@/assets/palette';
import { getRuntime, rearmNow, rescheduleNow } from '@/runtime/appRuntime';
import { setSetting } from '@/db/records';
import {
  NOTIF_ONBOARDED_KEY,
  onboardingSteps,
  QUIET_ONBOARDED_KEY,
  type OnboardingSteps,
} from '@/components/login/afterLogin';
import { QUIET_KEY } from '@/scheduler/scheduler';
import { ALL_DAYS } from '@/scheduler/plan';

const MAX_SCALE = 1.3;

// Android 14부터 '알람 및 리마인더'(정확한 알람)가 처음부터 꺼져 있다. 꺼져 있으면 알림이 최대 1시간 늦는다.
const NEEDS_EXACT_ALARM = Platform.OS === 'android' && Number(Platform.Version) >= 34;

// 온보딩에서는 취침 시간만 정한다(매일 적용). 여러 개·요일은 계정 관리의 방해금지 시간에서 한다(D19).
const DEFAULT_SLEEP = { startMin: 23 * 60, endMin: 7 * 60 };

function label(minuteOfDay: number): string {
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
}

function toDate(minuteOfDay: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  return d;
}

// 칸은 :00/:30 단위라 고른 시각을 가까운 30분으로 맞춘다.
function toSlotMinute(date: Date): number {
  return (Math.round((date.getHours() * 60 + date.getMinutes()) / 30) * 30) % 1440;
}

// 온보딩: 취침 시간(D18) → 알림 설명(디자인 리뷰 D8) → Android 14 이상은 정확한 알람(D14).
// 방해금지를 먼저 정해야 첫 예약부터 자는 시간이 빠진다. 알림을 거부해도 전용 화면은 없다. 오늘(홈) 배너가 안내한다.
export default function NotificationOnboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<OnboardingSteps | null>(null);
  const [step, setStep] = useState<'quiet' | 'notify' | 'exact'>('quiet');
  const [sleep, setSleep] = useState(DEFAULT_SLEEP);
  const [picking, setPicking] = useState<'startMin' | 'endMin' | null>(null);

  useEffect(() => {
    onboardingSteps()
      .then((s) => {
        setSteps(s);
        if (s.quiet) setStep('quiet');
        else if (s.notify) setStep('notify');
        else router.replace('/(tabs)');
      })
      .catch(() => router.replace('/(tabs)'));
  }, [router]);

  const saveQuiet = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { db } = getRuntime();
      await setSetting(db, QUIET_KEY, [{ ...sleep, days: ALL_DAYS }]);
      await setSetting(db, QUIET_ONBOARDED_KEY, true);
    } finally {
      setBusy(false);
      if (steps?.notify) {
        setStep('notify');
      } else {
        void rescheduleNow();
        router.replace('/(tabs)');
      }
    }
  };

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

  if (!steps) return <View style={styles.container} />;

  if (step === 'quiet') {
    return (
      <View style={styles.container}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_SCALE}>
          주무시는 동안에는 묻지 않을게요.
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={MAX_SCALE}>
          업무 시간 같은 다른 시간은 계정 관리의 방해금지 시간에서 더할 수 있어요.
        </Text>
        {(['startMin', 'endMin'] as const).map((key) => (
          <TouchableOpacity key={key} style={styles.timeRow} onPress={() => setPicking(key)}>
            <Text style={styles.timeLabel} maxFontSizeMultiplier={MAX_SCALE}>
              {key === 'startMin' ? '잠드는 시간' : '일어나는 시간'}
            </Text>
            <Text style={styles.timeValue} maxFontSizeMultiplier={MAX_SCALE}>
              {label(sleep[key])}
            </Text>
          </TouchableOpacity>
        ))}
        {picking && (
          <DateTimePicker
            value={toDate(sleep[picking])}
            mode='time'
            is24Hour
            onChange={(_, date) => {
              const key = picking;
              setPicking(null);
              if (date) setSleep((q) => ({ ...q, [key]: toSlotMinute(date) }));
            }}
          />
        )}
        <TouchableOpacity style={[styles.button, styles.next]} onPress={saveQuiet} disabled={busy}>
          <Text style={styles.buttonText} maxFontSizeMultiplier={MAX_SCALE}>
            다음
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
  timeRow: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GRAY_7,
  },
  timeLabel: {
    color: GRAY_5,
    fontSize: 16,
  },
  timeValue: {
    color: GRAY_0,
    fontSize: 16,
  },
  next: {
    marginTop: 40,
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
