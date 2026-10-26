import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/Entity/user.entity';
import { Repository } from 'typeorm';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';

type TokenType = 'access' | 'refresh';

interface JWTpayload {
  sub: string; // 사용자 ID. 사용자 식별은 이 값만 믿는다.
  type: TokenType;
  iat?: number;
  exp?: number;
}

// access와 refresh는 secret과 type claim이 모두 다르다.
// refresh 토큰으로 API를 부르거나 access 토큰으로 재발급하면 401이다.
@Injectable()
export class AuthJWTService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private secret(type: TokenType): string {
    return this.config.getOrThrow<string>(
      type === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET',
    );
  }

  generateAccessToken(userId: string): string {
    const payload: JWTpayload = { sub: userId, type: 'access' };
    return this.jwtService.sign(payload, {
      secret: this.secret('access'),
      expiresIn: '1h',
    });
  }

  generateRefreshToken(userId: string): string {
    const payload: JWTpayload = { sub: userId, type: 'refresh' };
    // jwtid: 같은 초에 다시 발급해도 이전 토큰과 달라지게 한다.
    // 60일 고정, 회전 없음(eng review D9): 앱의 refresh 경로가 둘이라 회전하면 정상 사용자가 로그아웃된다.
    return this.jwtService.sign(payload, {
      secret: this.secret('refresh'),
      expiresIn: '60d',
      jwtid: randomUUID(),
    });
  }

  // 서명·만료·type을 확인하고 사용자 ID를 돌려준다.
  async verify(token: string, type: TokenType): Promise<string> {
    let payload: JWTpayload;
    try {
      payload = await this.jwtService.verifyAsync<JWTpayload>(token, {
        secret: this.secret(type),
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (payload.type !== type || !payload.sub) {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload.sub;
  }

  // 삭제된 계정의 남은 access 토큰을 막는다.
  async userExists(userId: string): Promise<boolean> {
    return this.userRepo.exists({ where: { id: userId } });
  }

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.userRepo.update(userId, {
      refreshTokenHash: hashToken(refreshToken),
    });
  }

  // 마지막으로 발급한 refresh 토큰과 같은지 비교한다.
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) return false;
    const stored = Buffer.from(user.refreshTokenHash, 'hex');
    const given = Buffer.from(hashToken(refreshToken), 'hex');
    return stored.length === given.length && timingSafeEqual(stored, given);
  }
}

// bcrypt는 앞 72바이트만 비교해서 같은 사용자의 JWT를 구별하지 못한다.
// refresh 토큰은 서명된 고엔트로피 값이라 SHA-256으로 충분하다.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
