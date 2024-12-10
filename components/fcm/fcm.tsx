// /**
//  * FCM 토큰을 받습니다.
//  */
// const getFcmToken = async () => {
//   const fcmToken = await messaging().getToken();
//   console.log('[+] FCM Token :: ', fcmToken);
// };

// /**
//  * FCM 메시지를 앱이 foreground 상태일 경우 메시지를 수신합니다.
//  */
// const subscribe = messaging().onMessage(async (remoteMessage) => {
//   console.log('[+] Remote Message ', JSON.stringify(remoteMessage));
// });
