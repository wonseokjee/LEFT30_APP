import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { JwtAuthGuard } from 'src/auth/JWT/jwt.authGuard';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @UseGuards(JwtAuthGuard)
  @Post('register-token')
  async registerToken(
    @Body('user_id') userId: string,
    @Body('FCMToken') FCMPushToken: string,
  ) {
    await this.pushService.saveFCMPushToken(userId, FCMPushToken);
    return { message: 'FCM push token registered successfully' };
  }
}
