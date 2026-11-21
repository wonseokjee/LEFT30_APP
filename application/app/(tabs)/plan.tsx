import React from 'react';
import { View } from 'react-native';
import CatStrip from '@/components/home/CatStrip';
import Timetable from '@/components/timetable/Timetable';

// 시간표 탭. 로컬 SQLite만 읽는다(서버 timetable API는 없앴다). 홈의 오른쪽 탭이라 고양이는 왼쪽 끝에서 들어온다(visual 4.3).
export default function Plan() {
  return (
    <View style={{ flex: 1 }}>
      <Timetable />
      <CatStrip from='left' />
    </View>
  );
}
