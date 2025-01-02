import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
type TimeSlot = {
  startTime: string;
  endTime: string;
  block: string;
  detail: string;
  isContinue: boolean; //이전행동 지속하기
};


const timeTableTest = () => {
  //notion calendar와 비슷한 양식으로
  //일단 빠르게 구현하기. 최적화는 나중에. 규모 커지면 어떻게해서든 문제 생긴다. 
  return (
    <ScrollView>
      
      <Text>ㅇㅇ</Text>
    </ScrollView>
  );
};
