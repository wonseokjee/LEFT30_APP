import React from 'react';
import { Tabs } from 'expo-router';
import { FONT } from '@/components/ui/Text';
import { useTheme } from '@/theme/theme';

/*
 * 탭(visual 4.1 시안, G6): 글자만 "할 일 · 홈 · 시간표", 높이 56. 현재 탭은 본문색, 나머지는 보조색.
 * 홈은 방 그림 바닥 위에 있어서 탭 바탕을 바닥색으로, 다른 탭은 벽색으로 둔다.
 */
export default function TabLayout() {
  const t = useTheme();
  const bar = (bg: string) => ({ backgroundColor: bg, height: 56, borderTopWidth: 0, elevation: 0 });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.sub,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontFamily: FONT, fontSize: 14, lineHeight: 20 },
        tabBarItemStyle: { justifyContent: 'center' },
        tabBarStyle: bar(t.wall),
      }}
    >
      <Tabs.Screen name='todo' options={{ title: '할 일' }} />
      <Tabs.Screen name='index' options={{ title: '홈', tabBarStyle: bar(t.floor) }} />
      <Tabs.Screen name='plan' options={{ title: '시간표' }} />
    </Tabs>
  );
}
