import { Stack } from 'expo-router';
import { StatusBar } from 'react-native'; //추가
import ActionTrackerModal from '@/hooks/actionModal/actionTrackerModal';
import React from 'react';
import { useEffect } from 'react';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import * as Notifications from 'expo-notifications';
import {
  receivedListener,
  responseReceivedListener,
} from '@/components/pushNotification/listener';
import useNumStore from '@/store/timerStore';
import registerForPushNotificationsAsync from '@/components/pushNotification/registerForPushNotificationsAsync';
import { handleNotification } from '@/components/pushNotification/pushNotificationHandler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TabHeaderTitle from '@/components/tab/headerTitle';
import TabHeaderRight from '@/components/tab/headerRight';
import { useRouter } from 'expo-router';
import LoginExpiredAlertModal from '@/components/user/loginExpiredModal';
import { isLogined } from '@react-native-kakao/user';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return handleNotification(notification);
  },
});

export default function RootLayout() {
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY || '';
  const { setModalOpen } = useNumStore();
  const router = useRouter();
  useEffect(() => {
    //카카오 로그인 SDK 초기화
    initializeKakaoSDK(kakaoNativeAppKey);

    const checkIsLoggedIn = async () => {
      const isLoggedIn = await isLogined();
      if (isLoggedIn) {
        router.replace('/(tabs)'); // 자동로그인 성공 시 메인 페이지로 이동
      } else {
        router.replace('/(login)'); // 자동로그인 실패 시 로그인 페이지로 이동
      }
    };
    checkIsLoggedIn();
    //푸시 알림 토큰 등록
    registerForPushNotificationsAsync();

    // 푸시 알림 수신 및 응답 리스너 설정
    const subscription = receivedListener();
    const responseSubscription = responseReceivedListener(setModalOpen);

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);
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
        <ActionTrackerModal />
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
