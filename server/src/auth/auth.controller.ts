import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthedRequest,
  JwtAuthGuard,
  extractBearer,
} from './JWT/jwt.authGuard';

// 응답 형식(헤더 Authorization·X-Refresh-Token, 본문 user_id)은 기존 앱과 같다.
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Authorization: Bearer <Kakao access 토큰>
  @Get('kakaoLogin')
  async loginWithKakao(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const kakaoToken = requireBearer(req);
    const result = await this.authService.loginWithKakao(kakaoToken);
    res.setHeader('Authorization', `Bearer ${result.accessToken}`);
    res.setHeader('X-Refresh-Token', result.refreshToken);
    return {
      message: 'Login success',
      user_id: result.userId,
      connected_at: result.connectedAt,
    };
  }

  // Authorization: Bearer <refresh 토큰>. 본문의 userId는 쓰지 않는다.
  @Post('reissueAccessToken')
  @HttpCode(200)
  async reissueAccessToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = await this.authService.reissueAccessToken(
      requireBearer(req),
    );
    res.setHeader('Authorization', `Bearer ${accessToken}`);
    return { message: 'Access token reissued successfully' };
  }
}

@Controller('me')
export class MeController {
  constructor(private authService: AuthService) {}

  // 대상은 JWT sub로만 정한다.
  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteMe(@Req() req: AuthedRequest) {
    await this.authService.deleteAccount(req.user.id);
    return { message: '회원탈퇴가 완료되었습니다.' };
  }
}

function requireBearer(req: Request): string {
  const token = extractBearer(req);
  if (!token) {
    throw new UnauthorizedException('No token found in request headers');
  }
  return token;
}
