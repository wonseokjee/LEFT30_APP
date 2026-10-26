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
import { bootRuntime, onForeground } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY || '';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return handleNotification(notification);
  },
});

type BootState = 'loading' | 'ready' | 'failed';

export default function RootLayout() {
  const [boot, setBoot] = useState<BootState>('loading');
  const lastResponse = Notifications.useLastNotificationResponse();

  // 1. 로컬 DB를 먼저 연다(R1). 실패하면 데이터를 지우지 않고 오류 화면만 보여준다.
  useEffect(() => {
    bootRuntime()
      .then((result) => setBoot(result.ok ? 'ready' : 'failed'))
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
      useAppStore.getState().openSheet(data.slotStart);
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [boot, lastResponse]);

  if (boot === 'loading') return null;
  if (boot === 'failed') return <BootError />;

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          initialRouteName='(login)/index' // Set the login page as the initial screen
          screenOptions={{
            headerStyle: { backgroundColor: 'black' },
            headerTintColor: 'white',
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
              contentStyle: { backgroundColor: 'black' },
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
          backgroundColor='black' // 배경색을 검정으로
          barStyle='light-content' // 아이콘/글씨를 밝게
          translucent={false} // StatusBar 아래로 내용이 내려오지 않게
        />
      </GestureHandlerRootView>
    </>
  );
}
