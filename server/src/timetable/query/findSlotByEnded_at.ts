// src/query/userQuery.ts
import { Raw, Repository } from 'typeorm';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';
import dayjs from 'dayjs';

// 방해금지 startHour < endHour (예: 22시~7시) 인 경우
// 방해금지 startHour > endHour (예: 1시~9시) 인 경우 모두 고려.
// pushtoken이 있고, 방해금지시간이 아닌 유저
export async function findSlotByEnded_at(
  timetableRepo: Repository<TimetableEntry>,
  end: Date,
  user_id: string,
) {
  return await timetableRepo.findOne({
    where: {
      ended_at: Raw(
        alias =>
          `TO_CHAR(${alias}, 'YYYY-MM-DD HH24:MI') = '${dayjs(end).format('YYYY-MM-DD HH:mm')}'`,
      ),
      user: { id: user_id },
    },
  });
}
