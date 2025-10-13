// src/query/userQuery.ts
import { Repository } from 'typeorm';
import { User } from 'src/Entity/user.entity';

// 방해금지 startHour < endHour (예: 22시~7시) 인 경우
// 방해금지 startHour > endHour (예: 1시~9시) 인 경우 모두 고려.
// pushtoken이 있고, 방해금지시간이 아닌 유저
export async function getQuietUsers(
  userRepo: Repository<User>,
  nowHour: number,
  nowMinute: number,
) {
  return await userRepo
    .createQueryBuilder('user')
    .where("user.pushToken IS NOT NULL AND user.pushToken != ''")
    .andWhere(
      `NOT (
      (user.quietStartHour < user.quietEndHour AND
        (
          (user.quietStartHour < :nowHour OR (user.quietStartHour = :nowHour AND user.quietStartMinute <= :nowMinute))
          AND
          (:nowHour < user.quietEndHour OR (:nowHour = user.quietEndHour AND :nowMinute < user.quietEndMinute))
        )
      )
      OR
      (user.quietStartHour > user.quietEndHour AND
        (
          (user.quietStartHour < :nowHour OR (user.quietStartHour = :nowHour AND user.quietStartMinute <= :nowMinute))
          OR
          (:nowHour < user.quietEndHour OR (:nowHour = user.quietEndHour AND :nowMinute < user.quietEndMinute))
        )
      )
    )`,
    )
    .setParameters({ nowHour, nowMinute })
    .getMany();
}
