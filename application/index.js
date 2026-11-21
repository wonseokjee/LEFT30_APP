// 알림 버튼 백그라운드 작업은 라우터보다 먼저 정의해야 앱이 꺼진 상태에서도 잡힌다(EXP-2).
import { AppRegistry } from 'react-native';
import './notifications/continueTask';
import { ongoingTask } from './notifications/ongoingTask';
import { ONGOING_TASK } from './modules/ongoing-timer';

// 진행 중 고정 알림의 [일시정지]/[재개](T8). 네이티브 OngoingTaskService가 이 이름으로 부른다.
AppRegistry.registerHeadlessTask(ONGOING_TASK, () => ongoingTask);

import 'expo-router/entry';
