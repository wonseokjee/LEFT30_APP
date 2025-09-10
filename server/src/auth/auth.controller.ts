import { Controller, Body, Get, Headers, Res, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('kakao')
  async loginWithKakao(
    @Headers('authorization') authorization: string,
    @Res() res: Response,
  ) {
    const accessToken = authorization?.replace('Bearer ', '');
    return this.authService.loginWithKakao(accessToken, res);
  }

  @Post('reissueAccessToken')
  async reissueAccessToken(
    @Headers('authorization') authorization: string,
    @Body('userId') userId: string,
    @Res() res: Response,
  ) {
    const refreshToken = authorization?.replace('Bearer ', '');
    return this.authService.reissueAccessToken(refreshToken, userId, res);
  }
}
