import api from '@/api/api';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
async function registerForPushNotificationsAsync() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  //현재는 expo-notification만 활용하지만 추후 FCM도 활용할 수 있으므로 token을 ExpoToken, FCMToken으로 구분
  // const ExpoTokenData = await Notifications.getExpoPushTokenAsync();
  // const ExpoToken = ExpoTokenData.data;

  //
  // FCM Token을 가져오는 로직 추가 예정
  const FCMTokenData = await Notifications.getDevicePushTokenAsync();
  const FCMToken = FCMTokenData.data;

  const user_id = await SecureStore.getItemAsync('user_id');
  // 서버로 token 전송
  // console.log('푸시 알림 토큰 등록:', { user_id, FCMToken });
  console.log('푸시 알림 토큰 등록: user_id', { user_id });
  const res = await api.post('/push/register-token', { user_id, FCMToken });
  console.log('푸시 알림 토큰 등록 응답:', res.data);
}

export default registerForPushNotificationsAsync;
