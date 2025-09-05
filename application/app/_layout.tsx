import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ActionTrackerModal from '@/hooks/alarm/actionTrackerModal';
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

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return handleNotification(notification);
  },
});

export default function RootLayout() {
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY || '';
  const { setModalOpen } = useNumStore();
  useEffect(() => {
    //카카오 로그인 SDK 초기화
    initializeKakaoSDK(kakaoNativeAppKey);

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
      <Stack>
        <Stack.Screen
          name='(login)/index' // Set the login page as the initial screen
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='(tabs)'
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: 'black' },
          }}
        />
      </Stack>
      {/* 어떤 화면에 있던지 trackerModal이 보일 수 있도록 layout에 위치함. */}
      <ActionTrackerModal />
      <StatusBar style='light' />
    </>
  );
}
