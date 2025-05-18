import { TouchableOpacity, View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { useTodayTimeSlotInfoFromZustand } from '@/store/timeTableStore';
import {
  getTodayTimeSlotInfoFromDB,
  getYesterdayTimeSlotInfoFromDB,
} from '@/api/timetableApi';
import { Button } from 'react-native-elements';
import { useKakaoLogin } from '@/utils/auth/kakaoLogin';
import { handleLogin } from '@/hooks/login/handleLoginBtn';

export default function GetButton() {
  // const { todaydata } = useTimeSlotStore_today();
  const { todaydata } = useTodayTimeSlotInfoFromZustand();
  const { loginWithKakao, request } = useKakaoLogin();

  const onPress = async () => {
    try {
      await getTodayTimeSlotInfoFromDB();
      await getYesterdayTimeSlotInfoFromDB();
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <View>
      <Button title='카카오 로그인' onPress={() => handleLogin()}></Button>

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
