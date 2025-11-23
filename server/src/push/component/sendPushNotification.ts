import * as admin from 'firebase-admin';

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

  // Ensure all data values are strings
  const sanitizedData: { [key: string]: string } = {};
  if (data) {
    Object.keys(data).forEach(key => {
      sanitizedData[key] = String(data[key] ?? '');
    });
  }

  const notification = {
    token: pushToken,
    notification: { title, body: message },
    android: {
      collapseKey: 'action_input', // 같은 collapseKey면 이전 알림을 덮어씀
      priority: 'high' as 'high' | 'normal' | undefined,
    },
    data: sanitizedData,
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
