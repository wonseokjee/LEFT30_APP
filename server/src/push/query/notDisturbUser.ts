// src/query/userQuery.ts
import { Repository } from 'typeorm';
import { User } from 'src/entity/user.entity';

// 방해금지 startHour < endHour (예: 22시~7시) 인 경우
// 방해금지 startHour > endHour (예: 1시~9시) 인 경우 모두 고려.
// pushtoken이 있고, 방해금지시간이 아닌 유저
export async function getNotDisturbUsers(
  userRepo: Repository<User>,
  nowHour: number,
  nowMinute: number,
) {
  return await userRepo
    .createQueryBuilder('user')
    .where("user.pushToken IS NOT NULL AND user.pushToken != ''")
    .andWhere(
      `NOT (
        (user.doNotDisturbStartHour < user.doNotDisturbEndHour AND
          (
            (user.doNotDisturbStartHour < :nowHour OR (user.doNotDisturbStartHour = :nowHour AND user.doNotDisturbStartMinute <= :nowMinute))
            AND
            (:nowHour < user.doNotDisturbEndHour OR (:nowHour = user.doNotDisturbEndHour AND :nowMinute < user.doNotDisturbEndMinute))
          )
        )
        OR
        (user.doNotDisturbStartHour > user.doNotDisturbEndHour AND
          (
            (user.doNotDisturbStartHour < :nowHour OR (user.doNotDisturbStartHour = :nowHour AND user.doNotDisturbStartMinute <= :nowMinute))
            OR
            (:nowHour < user.doNotDisturbEndHour OR (:nowHour = user.doNotDisturbEndHour AND :nowMinute < user.doNotDisturbEndMinute))
          )
        )
      )`,
    )
    .setParameters({ nowHour, nowMinute })
    .getMany();
}
