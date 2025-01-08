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


//slot의 범위를 좀 더 늘려야 할듯 slotIndex를 받는것은 slotItem의 일이고
//slot이면 map을 여기로 끌고와야 할듯. 함수도 마찬가지고.

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
    borderRadius: 5,
    width: '99%',
  },
});
export default TimeTableSlotItem;
