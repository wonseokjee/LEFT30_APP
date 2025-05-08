import { TouchableOpacity, View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import {
  getFirebaseCollection_Test_Today,
  getFirebaseCollection_Test_Yesterday,
} from '@/api/firebase';
import {
  useTimeSlotStore_today,
  useTimeSlotStore_yesterday,
  useTodayTimeSlotInfoFromZustand,
} from '@/store/timeTableStore';
import {
  getTodayTimeSlotInfoFromDB,
  getYesterdayTimeSlotInfoFromDB,
} from '@/api/timetableApi';

export default function GetButton() {
  // const { todaydata } = useTimeSlotStore_today();
  const { todaydata } = useTodayTimeSlotInfoFromZustand();

  const onPress = async () => {
    try {
      // await getFirebaseCollection_Test_Today();
      // await getFirebaseCollection_Test_Yesterday();
      await getTodayTimeSlotInfoFromDB();
      await getYesterdayTimeSlotInfoFromDB();
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={onPress}>
        <View style={{}}>
          <Text style={{ color: 'white' }}>여기는 firestore 확인</Text>

          {/* {todaydata?.map((x) => (
            <Text key={x['event']['newDate']} style={{ color: 'white' }}>
              {x['date']} {x['event']['action']}
              {x['event']['detail']}
            </Text>
          ))} */}
          {todaydata?.map((x) => (
            <Text key={x.started_at} style={{ color: 'white' }}>
              {x.ended_at} {x.action}
              {x.description}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}
