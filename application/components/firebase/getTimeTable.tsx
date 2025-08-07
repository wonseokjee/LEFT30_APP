import { TouchableOpacity, View, Text } from 'react-native';
import { useTodayTimeSlotInfoFromZustand } from '@/store/timeTableStore';
import {
  getTodayTimeSlotInfoFromDB,
  getYesterdayTimeSlotInfoFromDB,
} from '@/api/timetableApi';
import { Button } from 'react-native-elements';
import { useKakaoLogin } from '@/utils/auth/kakaoLogin';
import { handleLogin } from '@/hooks/login/handleLoginBtn';

export default function GetButton() {
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
      <Button title='로그인 가드' onPress={() => handleLogin()}></Button>
      <TouchableOpacity onPress={onPress}>
        <View style={{}}>
          <Text style={{ color: 'white' }}>여기는 zustand 확인</Text>
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
