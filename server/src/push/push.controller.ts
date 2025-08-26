import { Body, Controller, Post } from '@nestjs/common';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('register-token')
  async registerToken(
    @Body('userId') userId: string,
    @Body('expoPushToken') expoPushToken: string,
  ) {
    await this.pushService.saveExpoPushToken(userId, expoPushToken);
    return { message: 'Expo push token registered successfully' };
  }
}
