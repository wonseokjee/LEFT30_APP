import { Body, Controller, Post } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register-token')
  async registerToken(
    @Body('user_id') userId: string,
    @Body('FCMToken') FCMPushToken: string,
  ) {
    await this.pushService.saveFCMPushToken(userId, FCMPushToken);
    return { message: 'FCM push token registered successfully' };
  }
}
