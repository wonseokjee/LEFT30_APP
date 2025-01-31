import { firebase_type } from '@/@types/firebase/collections';
import {
  ACTION_TYPE,
  ACTION_TYPE_COLOR,
} from '@/@types/firebase/common/actionColorType';
import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import TimeTableSlotItemInfo from './timeTableSlotItemInfo';

type timeTableSlotProps = {
  slotdata: firebase_type | null;
};

//zstand에서 최신화된 시간표를 상태관리 할 것임.
// 이것을 받아서 시작시간과 종료시간을 slotindex에 들어가게(144개 중 몇번째인지.)
// 시작시간에서 종료시간이 얼마인지에 따라 10분에 styles.absoluteSlot에서 height를 100% * N으로 주면 됨.
//

const TimeTableSlotItem: React.FC<timeTableSlotProps> = ({ slotdata }) => {
  //slotdata가 없는 경우를 걸러줘야 한다.

  const [isOpen, setIsOpen] = useState(false);

  const handlePress = () => {
    setIsOpen(!isOpen); // 현재 상태의 반대로 변경
    // console.log(isOpen);
  };

  if (!slotdata) return null;

  const duration = slotdata ? slotdata!['range'] * 100 : 0;
  const colorKey = slotdata
    ? (slotdata['event']['action'] as keyof typeof ACTION_TYPE_COLOR)
    : null;
  return (
    <>
      {slotdata ? (
        <TouchableOpacity
          style={[
            styles.absoluteSlot,
            {
              height: `${duration}%`,
              backgroundColor: colorKey
                ? ACTION_TYPE_COLOR[colorKey]
                : 'transparent',
            },
          ]}
          onPress={handlePress}
          // style={styles.absoluteSlot}
        >
          <Text
            style={[
              styles.slotView,
              {
                backgroundColor: colorKey
                  ? ACTION_TYPE_COLOR[colorKey]
                  : 'transparent',
              },
            ]}
          ></Text>
          <Text style={styles.slotText}>
            {slotdata!['event']['action']}: {slotdata!['event']['detail']}
          </Text>

          {isOpen ? (
            <TimeTableSlotItemInfo
              slotdata={slotdata}
              modalOpen={isOpen}
              onClose={() => setIsOpen(!isOpen)}
            />
          ) : (
            <></>
          )}
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
    // backgroundColor: 'green',
    // height: '300%',
    zIndex: 101,
    borderRadius: 4,
    width: '99.5%',
    flexDirection: 'row',
    // opacity: 0.6,
  },
  slotView: {
    width: '6%',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  slotText: {
    color: 'white',
  },
});
export default TimeTableSlotItem;
