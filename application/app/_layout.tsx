import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ActionTrackerModal from '@/hooks/alarm/actionTrackerModal';
import React from 'react';
import { useEffect } from 'react';
import { initializeKakaoSDK } from '@react-native-kakao/core';

export default function RootLayout() {
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY || '';
  useEffect(() => {
    initializeKakaoSDK(kakaoNativeAppKey);
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
