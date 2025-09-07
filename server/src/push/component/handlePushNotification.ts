// import { User } from 'src/entity/user.entity';

// export function checkDisturbHour(user: User): Promise<boolean> {
//   const nowHour = new Date().getHours();

//   // 방해금지시간 발전: 요일마다 설정 가능하게 or 평일시간과 주말시간 구분.
//   // 종료시간 포함이면 행동시작시간으로, 종료시간 미포함이면 행동종료시간으로.
//   // actionStarthour로 기준.
//   console.log(nowHour, user.doNotDisturbStartHour, user.doNotDisturbEndHour);
//   if (
//     user.doNotDisturbStartHour >= nowHour ||
//     nowHour > user.doNotDisturbEndHour
//   ) {
//     console.log(`유저 ${user.id} 방해금지 시간 아님, 푸시 전송`);
//     return Promise.resolve(true);
//   } else {
//     console.log(`유저 ${user.id} 방해금지 시간, 푸시 건너뜀`);
//     return Promise.resolve(false);
//   }
// }
