import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import serviceAccount from '../../config/serviceAccountKey.json';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/Entity/user.entity';
import { Repository } from 'typeorm/repository/Repository';
import { sendPushNotification } from './component/sendPushNotification';
import { Cron } from '@nestjs/schedule';
import { TimetableEntry } from 'src/Entity/timetableEntry.entity';
import { isSameMinute } from './component/compareTime';
import { getQuietUsers } from './query/quietTimeUser';

@Injectable()
export class PushService {
  // ended_at을 분 단위까지 비교하는 함수
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TimetableEntry)
    private readonly timetableRepo: Repository<TimetableEntry>,
  ) {
    // FCM 초기화 (이미 초기화된 경우 중복 방지)
    if (!admin.apps.length) {
      // const serviceAccount = require('../../config/serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(
          serviceAccount as admin.ServiceAccount,
        ),
      });
    }
  }

  async saveFCMPushToken(userId: string, FCMPushToken: string): Promise<void> {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new Error('User not found');
      user.pushToken = FCMPushToken;
      // console.log('FCM Push Token saved for user:', userId, FCMPushToken);
      await this.userRepo.save(user);
    } catch (error) {
      console.error('FCM Push Token save error:', error);
    }
  }
  // FCM 토큰 삭제 메서드
  async removeToken(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.pushToken = '';
      await this.userRepo.save(user);
    }
  }

  // 5분 35분에 cron을 실행시켜서 행동을 등록하지 않은 유저에 한해, 이전 행동을 유지하는 정보를 넣어줌.
  // 이것도 push는 아니기때문에 다른 곳으로 이동.  action 폴더를 만들어야할듯
  @Cron('5,35 * * * *')
  async inputPreviousAction(): Promise<void> {
    // pushToken이 있고, 이전 시간대에 행동을 등록하지 않은 유저
    //조건: pushtoken유무, 현재 행동등록x, 현재가 방해금지시간이 아닐 것, 이전 행동이 없으면 저장x.

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const fiveMinutesAgoHour = fiveMinutesAgo.getHours();
    const fiveMinutesAgoMinute = fiveMinutesAgo.getMinutes();

    // pushtoken이 있고, 5분전이 방해금지시간이 아닌 유저
    const users = await getQuietUsers(
      this.userRepo,
      fiveMinutesAgoHour,
      fiveMinutesAgoMinute,
    );

    for (const user of users) {
      // const action = '이전 행동'; // 실제로는 이전 행동을 DB에서 가져와야 함.
      // 유저의 마지막 행동 end시간이 35분전인 행동.
      // 그 행동을 현재 행동으로 넣어줌.
      const thirtyFiveMinutesAgo = new Date(Date.now() - 35 * 60 * 1000);
      const previousAction = await this.timetableRepo.findOne({
        where: {
          user: { id: user.id },
        },
        order: { ended_at: 'DESC' },
      });
      if (
        previousAction &&
        isSameMinute(previousAction.ended_at, thirtyFiveMinutesAgo)
      ) {
        const newAction = this.timetableRepo.create({
          ...previousAction,
          id: undefined,
          created_at: undefined,
          user: { id: user.id },
          started_at: thirtyFiveMinutesAgo,
          ended_at: fiveMinutesAgo,
        });
        console.log(
          'Inserting previous action for user:',
          user.id,
          fiveMinutesAgo,
        );
        await this.timetableRepo.save(newAction);
        await sendPushNotification(
          user.pushToken,
          '행동 지속 알림',
          // `이번 할일이 ${action}으로 입력되었습니다. 수정하려면 클릭하세요`,
          '이번 할일이 이전과 동일하게 입력되었습니다. 수정하려면 클릭하세요',
          {
            user: String(user.name || ''),
            openModal: 'false',
            type: 'important',
            //type important의 경우 포어그라운드에도 알림 뜸. 데이터 변경되어서 앱이 실행중이어도 알림.
          },
        );
      }
    }
  }

  @Cron('0,30 * * * *')
  async inputPresentAction(): Promise<void> {
    // pushtoken이 있고, 1분전이(방해금지 시작시간이면 포함 안돼서 1분전으로) 방해금지시간이 아닌 유저
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    const oneMinuteAgoHour = oneMinuteAgo.getHours();
    const oneMinuteAgoMinute = oneMinuteAgo.getMinutes();
    const users = await getQuietUsers(
      this.userRepo,
      oneMinuteAgoHour,
      oneMinuteAgoMinute,
    );

    //마지막 action이 없는 유저.
    for (const user of users) {
      //이전 실행 가져온다면 action을 넣는게 좋을듯.
      await sendPushNotification(
        user.pushToken,
        '행동 입력',
        // `이번 할일이 ${action}으로 입력되었습니다. 수정하려면 클릭하세요`,
        '이번 할일을 입력해주세요',
        {
          user: String(user.name || ''),
          openModal: 'true',
          type: 'normal',
        },
      );
    }
  }
}
