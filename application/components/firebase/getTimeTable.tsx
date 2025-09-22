import { TouchableOpacity, View, Text } from 'react-native';

import { Button } from 'react-native-elements';
import { handleLogin } from '@/components/login/handleLoginBtn';
import checkLogin from '@/components/login/checkLogin';
import registerForPushNotificationsAsync from '../pushNotification/registerForPushNotificationsAsync';
import SetDisturbModal from '../user/quietTimeModal';
import { useState } from 'react';
import { getQuietTimeByZustand } from '@/store/useQuietTImeStore';
import { getQuietTimeByDB } from '@/api/userApi';

export default function GetButton() {
  const [modalVisible, setModalVisible] = useState(false);
  const { setTime } = getQuietTimeByZustand();
  const getQuietTimeHandler = async () => {
    const quietTime = await getQuietTimeByDB();
    setModalVisible(true);
    setTime(quietTime);
  };
  return (
    <View>
      <Button title='카카오 로그인' onPress={() => handleLogin()}></Button>
      <Button title='로그인 가드' onPress={() => checkLogin()}></Button>
      <Button
        title='푸시 알림 토큰 등록'
        onPress={() => registerForPushNotificationsAsync()}
      ></Button>
      <Button
        title='방해금지 시간설정'
        onPress={() => getQuietTimeHandler()}
      ></Button>
      {modalVisible ? (
        <SetDisturbModal setModalVisible={setModalVisible} />
      ) : null}
    </View>
  );
}
