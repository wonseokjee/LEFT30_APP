import Timetable from '@/components/timetable/timeTable';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  getTodayTimeSlotInfoFromDB,
  getYesterdayTimeSlotInfoFromDB,
} from '@/api/timetableApi';

type TimeSlot = {
  startIndex: number;
  endIndex: number;
  activity: string;
};
type DaySchedule = {
  day: string;
  slots: TimeSlot[];
};

const onPress = async () => {
  try {
    const user_id = await SecureStore.getItemAsync('user_id');
    if (!user_id) {
      console.log('user_id가 없습니다.');
      return;
    }
    await getTodayTimeSlotInfoFromDB(user_id);
    await getYesterdayTimeSlotInfoFromDB(user_id);
  } catch (error) {
    console.log('error', error);
  }
};

export default function Plan() {
  useFocusEffect(
    useCallback(() => {
      // 탭이 활성화될 때마다 실행할 함수
      onPress();
    }, [])
  );
  return (
    <View style={styles.container}>
      <Timetable />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    backgroundColor: 'black',
  },
  text: { color: 'white' },
});
