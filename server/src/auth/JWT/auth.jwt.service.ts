import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

interface JWTpayload {
  sub: string; // 사용자 ID
  iat?: number; // 발행 시간 (optional)
  exp?: number; // 만료 시간 (optional)
}

@Injectable()
export class AuthJWTService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  //accessToken을 생성하는 메서드
  generateAccessToken(userId: string): string {
    const payload: JWTpayload = { sub: userId };
    console.log('Generating access token for user:', userId);
    return this.jwtService.sign(payload, { expiresIn: '1m' });
  }

  //refreshToken을 생성하는 메서드
  generateRefreshToken(userId: string): string {
    const payload: JWTpayload = { sub: userId };
    console.log('Generating refresh token for user:', userId);
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  //accessToken을 검증하는 메서드
  validateAccessToken(token: string): Promise<JWTpayload> | null {
    try {
      const payload = this.jwtService.verifyAsync<JWTpayload>(token);
      return payload; // 유효한 토큰이면 payload 반환

      // 토큰이 유효하지 않으면 예외가 발생하므로 catch로 처리
    } catch (error) {
      console.error('Invalid access token:', error);
      //statuscode: 401 Unauthorized
      throw new UnauthorizedException('Invalid access token');
    }
  }

  //hash된 refreshToken을 저장하는 메서드
  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    const hashedToken = await bcrypt.hash(refreshToken, 10); // 10은 saltRounds
    user.refreshToken = hashedToken;
    await this.userRepo.save(user);
  }

  //refreshToken을 비교하는 메서드
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshToken) return false;
    return await bcrypt.compare(refreshToken, user.refreshToken);
  }
}
