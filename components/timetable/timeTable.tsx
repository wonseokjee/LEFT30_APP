import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import TimeTableSlot from './timeTableSlot';
import TableTimeDivision from './tableTimeDivision';

const Timetable = () => {
  return (
    <ScrollView contentContainerStyle={styles.horizontalContainer}>
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
