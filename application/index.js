// 알림 버튼 백그라운드 작업은 라우터보다 먼저 정의해야 앱이 꺼진 상태에서도 잡힌다(EXP-2).
import './notifications/continueTask';
import 'expo-router/entry';
