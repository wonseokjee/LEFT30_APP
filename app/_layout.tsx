import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ActionTrackerModal from '@/hooks/alarm/actionTrackerModal';
import React from 'react';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen
          name='(tabs)'
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      {/* 어떤 화면에 있던지 trackerModal이 보일 수 있도록 layout에 위치함. */}
      <ActionTrackerModal />
      <StatusBar style='light' />
    </>
  );
}
