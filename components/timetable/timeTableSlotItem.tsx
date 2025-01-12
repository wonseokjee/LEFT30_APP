import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

type timeTableSlotProps = {
  slotIndex: number;
};

//zstand에서 최신화된 시간표를 상태관리 할 것임.
// 이것을 받아서 시작시간과 종료시간을 slotindex에 들어가게(144개 중 몇번째인지.)
// 시작시간에서 종료시간이 얼마인지에 따라 10분에 styles.absoluteSlot에서 height를 100% * N으로 주면 됨.
//

const TimeTableSlotItem: React.FC<timeTableSlotProps> = ({ slotIndex }) => {
  return (
    <>
      {slotIndex % 6 === 5 ? (
        <TouchableOpacity style={styles.absoluteSlot}>
          <Text>허허허</Text>
        </TouchableOpacity>
      ) : (
        <></>
      )}
    </>
  );
};
const styles = StyleSheet.create({
  absoluteSlot: {
    position: 'absolute',
    backgroundColor: 'yellow',
    height: '200%',
    zIndex: 101,
    borderRadius: 3,
    width: '99.5%',
  },
});
export default TimeTableSlotItem;
