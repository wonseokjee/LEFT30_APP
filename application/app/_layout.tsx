import { router, Stack } from 'expo-router';
import { AppState, StatusBar } from 'react-native'; //추가
import React, { useEffect, useState } from 'react';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import * as Notifications from 'expo-notifications';
import { handleNotification } from '@/components/pushNotification/pushNotificationHandler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TabHeaderTitle from '@/components/tab/headerTitle';
import TabHeaderRight from '@/components/tab/headerRight';
import LoginExpiredAlertModal from '@/components/user/loginExpiredModal';
import * as SecureStore from 'expo-secure-store';
import { afterLogin } from '@/components/login/afterLogin';
import RecordSheet from '@/components/record/RecordSheet';
import RecordToast from '@/components/record/RecordToast';
import BootError from '@/components/app/BootError';
import { bootRuntime, getRuntime, onForeground, settleBlocksNow } from '@/runtime/appRuntime';
import { logPingDisplayed } from '@/scheduler/pingEvents';
import { useAppStore } from '@/store/appStore';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { setFontReady } from '@/components/ui/Text';
import { THEME_KEY, useTheme, useThemeMode, type ThemeMode } from '@/theme/theme';
import { getSetting } from '@/db/records';

// 주아를 불러올 때까지 스플래시를 유지한다(visual 6.1 G8). 실패하면 시스템 글꼴로 진행.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY || '';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return handleNotification(notification);
  },
});

type BootState = 'loading' | 'ready' | 'failed';

export default function RootLayout() {
  const t = useTheme();
  const [boot, setBoot] = useState<BootState>('loading');
  const lastResponse = Notifications.useLastNotificationResponse();
  const [fontLoaded, fontError] = useFonts({ Jua: require('@/assets/fonts/Jua-Regular.ttf') });
  const fontDone = fontLoaded || !!fontError;
  if (fontDone) setFontReady(fontLoaded);
  useEffect(() => {
    if (fontError) console.warn('font load failed', fontError);
    if (fontDone && boot !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontDone, fontError, boot]);

  // 1. 로컬 DB를 먼저 연다(R1). 실패하면 데이터를 지우지 않고 오류 화면만 보여준다.
  useEffect(() => {
    bootRuntime()
      .then(async (result) => {
        // 앱 안 화면 선택(D15)을 첫 화면 전에 읽는다.
        if (result.ok) {
          const mode = await getSetting<ThemeMode>(getRuntime().db, THEME_KEY).catch(() => null);
          if (mode) useThemeMode.getState().setMode(mode);
        }
        setBoot(result.ok ? 'ready' : 'failed');
      })
      .catch((e) => {
        console.warn('boot failed', e);
        setBoot('failed');
      });
  }, []);

  // 2. DB가 준비되면 로그인 확인. 서버 없이도 기록·알림은 동작한다.
  useEffect(() => {
    if (boot !== 'ready') return;
    //카카오 로그인 SDK 초기화
    initializeKakaoSDK(kakaoNativeAppKey);

    // 저장된 세션이 있으면 서버를 거치지 않고 들어간다(오프라인에서도 기록 가능).
    // 토큰이 만료됐으면 동기화가 needs_login을 알리고, 큐는 다시 로그인할 때까지 보존된다.
    const checkIsLoggedIn = async () => {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await afterLogin(router);
      } else {
        router.replace('/(login)');
      }
    };
    checkIsLoggedIn();

    // 포그라운드로 올 때마다 시간대 확인 → 알림 예약 연장 → 동기화
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void onForeground();
    });
    return () => subscription.remove();
  }, [boot]);

  // 3. 30분 알림을 탭하면(앱이 꺼져 있었어도) 그 칸의 기록 시트를 연다.
  useEffect(() => {
    if (boot !== 'ready' || !lastResponse) return;
    const data = lastResponse.notification.request.content.data;
    if (data?.kind === 'ping' && typeof data.slotStart === 'string') {
      const seen = new Date(lastResponse.notification.date || Date.now());
      logPingDisplayed(getRuntime().db, data.slotStart, seen).catch((e) => console.warn('ping displayed failed', e));
      useAppStore.getState().openSheet(data.slotStart);
    }
    if (data?.kind === 'block_end' && typeof data.blockId === 'string') {
      const blockId = data.blockId;
      void settleBlocksNow().then(() => useAppStore.getState().openBlockSheet(blockId));
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [boot, lastResponse]);

  if (boot === 'loading' || !fontDone) return null;
  if (boot === 'failed') return <BootError />;

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          initialRouteName='(login)/index' // Set the login page as the initial screen
          screenOptions={{
            headerStyle: { backgroundColor: t.wall },
            headerTintColor: t.text,
            headerTitle: () => <TabHeaderTitle />,
            headerRight: () => <TabHeaderRight />,
          }}
        >
          <Stack.Screen
            name='(login)/index' // Set the login page as the initial screen
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name='(onboarding)/index'
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name='(tabs)'
            options={{
              headerShown: true,
              contentStyle: { backgroundColor: t.wall },
            }}
          />
          <Stack.Screen
            name='(user)/index'
            options={{
              headerShown: true,
            }}
          />
        </Stack>
        <RecordSheet />
        <RecordToast />
        <LoginExpiredAlertModal />
        <StatusBar
          // react-native의 StatusBar
          backgroundColor={t.wall}
          barStyle={t.dark ? 'light-content' : 'dark-content'}
          translucent={false} // StatusBar 아래로 내용이 내려오지 않게
        />
      </GestureHandlerRootView>
    </>
  );
}
