// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { KakaoApiService } from './kakao/kakaoapi.service';
import { AuthJWTService } from './JWT/auth.jwt.service';
import { Response } from 'express';
@Injectable()
export class AuthService {
  constructor(
    private kakaoApiService: KakaoApiService,
    private userService: UserService,
    private readonly authJWTService: AuthJWTService, // JWT 관련 서비스
  ) {}

  async loginWithKakao(accessToken: string, res: Response): Promise<void> {
    // 1. 카카오 유저 정보 가져오기
    const kakaoUser = await this.kakaoApiService.getKakaoUser(accessToken);
    const { id: kakao_Id, connected_at: connected_at } =
      kakaoUser.kakaoProfile as { id: number; connected_at: string };
    // console.log('Kakao User:', kakaoUser);
    // console.log('Kakao id:', kakao_Id, connected_at);
    // 2. 카카오 정보로 유저 찾거나 생성
    const userId = await this.userService.findOrCreateByKakao(kakao_Id);
    // console.log('user_id:', userId);
    // 3. JWT 토큰 생성 (access, refresh) auth로 이동시키기
    const accessTokenJwt = this.authJWTService.generateAccessToken(userId);
    const refreshTokenJwt = this.authJWTService.generateRefreshToken(userId);

    // 4. refreshToken을 DB에 저장 (보안상 암호화 권장)
    await this.authJWTService.saveRefreshToken(userId, refreshTokenJwt);

    // 5. 토큰 반환
    res.setHeader('Authorization', `Bearer ${accessTokenJwt}`);
    res.setHeader('X-Refresh-Token', refreshTokenJwt);
    res.json({
      message: 'Login success',
      user_id: userId,
      connected_at: connected_at,
    });

    // 6. 필요시 사용자 정보도 반환
    // return userId;
    // return accessTokenJwt; // 현재는 accessToken만 반환, 필요시 refreshToken도 반환하도록 수정 가능
  }

  //accessToken을 재발급하는 메서드
  async reissueAccessToken(
    refreshToken: string,
    userId: string,
    res: Response,
  ): Promise<void> {
    console.log('Received userId:', userId);
    console.log('Received refreshToken:', refreshToken);
    const isValid = await this.authJWTService.validateRefreshToken(
      userId,
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // refreshToken이 맞으면 새 accessToken 발급
    const newAccessToken = this.authJWTService.generateAccessToken(userId);
    res.setHeader('Authorization', `Bearer ${newAccessToken}`);
    res.json({
      message: 'Access token reissued successfully',
    });
  }
}
