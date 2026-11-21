import React from 'react';
import { View } from 'react-native';
import CatStrip from '@/components/home/CatStrip';
import TodoScreen from '@/components/todo/TodoScreen';

// 할 일은 홈의 왼쪽 탭이라 고양이가 오른쪽 끝에서 들어온다(visual 4.3).
export default function Todo() {
  return (
    <View style={{ flex: 1 }}>
      <TodoScreen />
      <CatStrip from='right' />
    </View>
  );
}
