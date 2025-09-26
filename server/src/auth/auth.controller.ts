import {
  Controller,
  Body,
  Get,
  Headers,
  Res,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { JwtAuthGuard } from './JWT/jwt.authGuard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('kakaoLogin')
  async loginWithKakao(
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const accessToken = authorization?.replace('Bearer ', '');
    return this.authService.loginWithKakao(accessToken, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reissueAccessToken')
  async reissueAccessToken(
    @Headers('authorization') authorization: string,
    @Body('userId') userId: string,
    @Res() res: Response,
  ) {
    const refreshToken = authorization?.replace('Bearer ', '');
    return this.authService.reissueAccessToken(refreshToken, userId, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('kakaoLogout')
  async logoutKakao(@Headers('authorization') authorization: string) {
    const accessToken = authorization?.replace('Bearer ', '');
    const result = await this.authService.logoutKakao(accessToken);
    return { message: 'Logout successful', result };
  }
}
