import * as Notifications from 'expo-notifications';
import type { Router } from 'expo-router';
import { onForeground } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

// 로그인 직후: 알림 권한을 아직 묻지 않았으면 설명 화면부터 보여준다(시스템 권한 창보다 먼저).
// Android는 두 번 거부하면 다시 물을 수 없기 때문이다.
export async function afterLogin(router: Router): Promise<void> {
  useAppStore.getState().setNeedsLogin(false);
  void onForeground();
  const { status } = await Notifications.getPermissionsAsync();
  router.replace(status === 'undetermined' ? '/(onboarding)' : '/(tabs)');
}
