import React, { useEffect, useRef } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import TimeTableSlot from './timeTableSlot';
import TableTimeDivision from './tableTimeDivision';
import useTimeTableFocusStore from '@/store/timeTableFocusStore';
import AddButton from '../asset/addButton';
import TimeTableSlotItemInfo from './timeTableSlotItemInfo';

const Timetable = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  // 현재 시간 위치를 Zustand에서 가져오기
  const { currentPosition } = useTimeTableFocusStore();
  // updateModal이 닫힐때마다 timetable을 리렌더링해서 data를 다시 불러오도록.
  const [addModalVisible, setAddModalVisible] = React.useState(false);

  useEffect(() => {
    if (currentPosition !== null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(currentPosition - 500, 0),
        animated: true,
      });
    }
  }, [currentPosition]);
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.horizontalContainer}
        ref={scrollViewRef}
      >
        {/* 시간표 시간 구분 */}
        <TableTimeDivision />

        {/* 시간표 틀 */}
        <TimeTableSlot />
      </ScrollView>
      <AddButton setAddModalVisible={setAddModalVisible} />
      {addModalVisible ? (
        <TimeTableSlotItemInfo
          slotdata={null}
          modalOpen={addModalVisible}
          onClose={() => setAddModalVisible(!addModalVisible)}
        />
      ) : (
        <></>
      )}
    </>
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
