import { TouchableOpacity, View, Text } from 'react-native';

import { Button } from 'react-native-elements';
import { handleLogin } from '@/hooks/login/handleLoginBtn';
import checkLogin from '@/hooks/login/checkLogin';
import registerForPushNotificationsAsync from '../pushNotification/registerForPushNotificationsAsync';

export default function GetButton() {
  return (
    <View>
      <Button title='카카오 로그인' onPress={() => handleLogin()}></Button>
      <Button title='로그인 가드' onPress={() => checkLogin()}></Button>
      <Button
        title='푸시 알림 토큰 등록'
        onPress={() => registerForPushNotificationsAsync()}
      ></Button>
    </View>
  );
}
