import * as Notifications from 'expo-notifications';
import type { Router } from 'expo-router';
import { getSetting } from '@/db/records';
import { getRuntime, onForeground } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

export const NOTIF_ONBOARDED_KEY = 'notif_onboarded';

// 로그인 직후: 알림 설명 화면을 아직 안 봤고 권한도 없으면 설명부터 보여준다(시스템 권한 창보다 먼저).
// Android는 "아직 묻지 않음"을 따로 알려주지 않아(묻기 전에도 denied) 설명을 봤는지를 로컬에 기록한다.
export async function afterLogin(router: Router): Promise<void> {
  useAppStore.getState().setNeedsLogin(false);
  void onForeground();
  const [{ granted, canAskAgain }, onboarded] = await Promise.all([
    Notifications.getPermissionsAsync(),
    getSetting<boolean>(getRuntime().db, NOTIF_ONBOARDED_KEY),
  ]);
  const showOnboarding = !granted && canAskAgain && !onboarded;
  router.replace(showOnboarding ? '/(onboarding)' : '/(tabs)');
}
