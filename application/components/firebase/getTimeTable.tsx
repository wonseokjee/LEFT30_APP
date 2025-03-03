import { TouchableOpacity, View, Text } from 'react-native';
import { useState } from 'react';
import {
  getFirebaseCollection_Test_Today,
  getFirebaseCollection_Test_Yesterday,
} from '@/api/firebase';
import {
  useTimeSlotStore_today,
  useTimeSlotStore_yesterday,
} from '@/store/timeTableStore';

export default function GetButton() {
  const { todaydata } = useTimeSlotStore_today();
  const { yesterdaydata } = useTimeSlotStore_yesterday.getState();

  const onPress = async () => {
    try {
      await getFirebaseCollection_Test_Today();
      await getFirebaseCollection_Test_Yesterday();
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={onPress}>
        <View style={{}}>
          <Text style={{ color: 'white' }}>여기는 firestore 확인</Text>
          {todaydata?.map((x) => (
            <Text key={x['event']['newDate']} style={{ color: 'white' }}>
              {x['date']} {x['event']['action']}
              {x['event']['detail']}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}
