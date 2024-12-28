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
      <ActionTrackerModal />
      <StatusBar style='light' />
    </>
  );
}
