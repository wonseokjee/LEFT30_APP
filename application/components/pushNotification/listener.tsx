import * as Notifications from 'expo-notifications';

// addNotificationReceivedListener: 알림이 앱에 도착했을 때(수신 시) 실행됩니다.
//포그라운드 상태에만 동작.
export function receivedListener() {
  return Notifications.addNotificationReceivedListener((notification) => {
    console.log('푸시 알림 수신:', notification.request.content.data);
    // console.log('푸시 알림 수신:');
    // 여기서 알림 데이터 처리 (예: 화면 이동, 데이터 갱신 등)
  });
}

//addNotificationResponseReceivedListener: 사용자가 알림을 클릭하거나, 알림의 액션(버튼 등)을 선택했을 때 실행됩니다.
//포그라운드, 백그라운드, 종료 상태 모두 동작.
export function responseReceivedListener(setModalOpen: () => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    // 알림 클릭 시 실행할 동작
    const flag = response.notification.request.content.data.openModal;
    console.log(
      'content.data.flag.openModal:',
      response.notification.request.content.data.openModal
    );
    if (flag === 'true') {
      //발전하면 현재 행동 등록되지 않았을 경우

      // 행동체크모달열기
      setModalOpen();
    }

    // 기타 동작
  });
}
