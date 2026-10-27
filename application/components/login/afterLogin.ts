import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import type { Router } from 'expo-router';
import { claimAccount, getSetting } from '@/db/records';
import { getRuntime, onForeground } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

export const NOTIF_ONBOARDED_KEY = 'notif_onboarded';
export const QUIET_ONBOARDED_KEY = 'quiet_onboarded';

export type OnboardingSteps = { quiet: boolean; notify: boolean };

// 온보딩에서 보여줄 화면. 방해금지는 한 번도 정하지 않았으면 보여준다(D18).
// 알림 설명은 아직 안 봤고 권한도 없을 때만 보여준다(시스템 권한 창보다 먼저).
// Android는 "아직 묻지 않음"을 따로 알려주지 않아(묻기 전에도 denied) 설명을 봤는지를 로컬에 기록한다.
export async function onboardingSteps(): Promise<OnboardingSteps> {
  const { db } = getRuntime();
  const [{ granted, canAskAgain }, notifOnboarded, quietOnboarded] = await Promise.all([
    Notifications.getPermissionsAsync(),
    getSetting<boolean>(db, NOTIF_ONBOARDED_KEY),
    getSetting<boolean>(db, QUIET_ONBOARDED_KEY),
  ]);
  return { quiet: !quietOnboarded, notify: !granted && canAskAgain && !notifOnboarded };
}

// 로그인 직후: 다른 계정의 로컬 데이터가 남아 있으면 먼저 지운다(D10). 그다음 온보딩이 필요하면 보낸다.
export async function afterLogin(router: Router): Promise<void> {
  useAppStore.getState().setNeedsLogin(false);
  const userId = await SecureStore.getItemAsync('user_id');
  if (userId && (await claimAccount(getRuntime().db, userId))) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  void onForeground();
  const steps = await onboardingSteps();
  router.replace(steps.quiet || steps.notify ? '/(onboarding)' : '/(tabs)');
}
