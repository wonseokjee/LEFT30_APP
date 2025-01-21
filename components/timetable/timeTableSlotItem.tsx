import { firebase_type } from '@/@types/firebase/collections';
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

type timeTableSlotProps = {
  slotdata: firebase_type | null;
};

//zstand에서 최신화된 시간표를 상태관리 할 것임.
// 이것을 받아서 시작시간과 종료시간을 slotindex에 들어가게(144개 중 몇번째인지.)
// 시작시간에서 종료시간이 얼마인지에 따라 10분에 styles.absoluteSlot에서 height를 100% * N으로 주면 됨.
//

const TimeTableSlotItem: React.FC<timeTableSlotProps> = ({ slotdata }) => {
  //slotdata가 없는 경우를 걸러줘야 한다.
  const duration = slotdata ? slotdata!['range'] * 100 : 0;
  return (
    <>
      {slotdata ? (
        <TouchableOpacity
          style={[styles.absoluteSlot, { height: `${duration}%` }]}
          // style={styles.absoluteSlot}
        >
          <Text>
            {slotdata!['event']['action']}
            {slotdata!['event']['detail']}
          </Text>
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
    // height: '300%',
    zIndex: 101,
    borderRadius: 3,
    width: '99.5%',
  },
});
export default TimeTableSlotItem;
