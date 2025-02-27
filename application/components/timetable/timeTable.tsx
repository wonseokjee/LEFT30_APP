import React, { useEffect, useRef } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import TimeTableSlot from './timeTableSlot';
import TableTimeDivision from './tableTimeDivision';
import useTimeTableFocusStore from '@/store/timeTableFocusStore';

const Timetable = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const { currentPosition } = useTimeTableFocusStore();
  useEffect(() => {
    if (currentPosition !== null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(currentPosition - 500, 0),
        animated: true,
      });
    }
  }, [currentPosition]);
  return (
    <ScrollView
      contentContainerStyle={styles.horizontalContainer}
      ref={scrollViewRef}
    >
      {/* 시간표 시간 구분 */}
      <TableTimeDivision />

      {/* 시간표 틀 */}
      <TimeTableSlot />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    borderWidth: 1,
    // borderColor: 'red',
    height: '200%',
  },
});

export default Timetable;
