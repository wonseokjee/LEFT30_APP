import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/Entity/user.entity';
import { Slot } from 'src/Entity/slot.entity';
import { Plan } from 'src/Entity/plan.entity';
import { AppEvent } from 'src/Entity/event.entity';
import { KakaoApiService } from './kakao/kakaoapi.service';
import { AuthJWTService } from './JWT/auth.jwt.service';

export type LoginResult = {
  userId: string;
  connectedAt: string;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private kakaoApiService: KakaoApiService,
    private readonly authJWTService: AuthJWTService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  // Kakao 토큰 → 사용자 조회·생성 → access·refresh 발급
  async loginWithKakao(kakaoAccessToken: string): Promise<LoginResult> {
    const profile = await this.kakaoApiService.getKakaoUser(kakaoAccessToken);
    const userId = await this.findOrCreateByKakao(profile.id);

    const accessToken = this.authJWTService.generateAccessToken(userId);
    const refreshToken = this.authJWTService.generateRefreshToken(userId);
    await this.authJWTService.saveRefreshToken(userId, refreshToken);

    return {
      userId,
      connectedAt: profile.connected_at,
      accessToken,
      refreshToken,
    };
  }

  // refresh 토큰 → 새 access. 사용자는 토큰의 sub로만 정한다.
  async reissueAccessToken(refreshToken: string): Promise<string> {
    const userId = await this.authJWTService.verify(refreshToken, 'refresh');
    const isValid = await this.authJWTService.validateRefreshToken(
      userId,
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.authJWTService.generateAccessToken(userId);
  }

  // 계정 삭제: 사용자와 slot·plan·event(피드백 메모 포함)·refresh 토큰을 한 트랜잭션으로 지운다.
  async deleteAccount(userId: string): Promise<void> {
    await this.dataSource.transaction(async manager => {
      await manager.delete(AppEvent, { userId });
      await manager.delete(Plan, { userId });
      await manager.delete(Slot, { userId });
      await manager.delete(User, { id: userId });
    });
  }

  private async findOrCreateByKakao(kakaoNumericId: number): Promise<string> {
    const kakaoId = kakaoNumericId.toString();
    await this.userRepo
      .createQueryBuilder()
      .insert()
      .values({ kakaoId })
      .orIgnore()
      .execute();
    const user = await this.userRepo.findOneOrFail({ where: { kakaoId } });
    return user.id;
  }
}
