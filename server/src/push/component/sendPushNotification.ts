import * as admin from 'firebase-admin';
import { Repository } from 'typeorm';
import { User } from '../../entity/user.entity';

export async function sendPushNotification(
  pushToken: string,
  title: string,
  message: string,
  // android?: { [key: string]: string },
  data?: { [key: string]: string },
): Promise<{ success: boolean; response?: string; error?: string }> {
  if (!pushToken) {
    return { success: false, error: 'Push token not found' };
  }
  const notification = {
    token: pushToken,
    notification: { title, body: message },
    android: {
      collapseKey: 'action_input', // 같은 collapseKey면 이전 알림을 덮어씀
      priority: 'high' as 'high' | 'normal' | undefined,
    },
    data: data || {},
  };
  //notification_id: 'message_123'
  try {
    const response = await admin.messaging().send(notification);
    return { success: true, response };
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendPushNotificationTEST(
  userId: string,
  userRepo: Repository<User>,
): Promise<void> {
  const user = await userRepo.findOne({ where: { id: userId } });
  if (user && user.pushToken) {
    // return { success: false, error: 'User or push token not found' };
    await sendPushNotification(user.pushToken, 'Test 제목', 'Test 본문', {
      key: '내용내욘ㅇㄴ내뇽',
    });
  }
}
