import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class KakaoApiService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    // private readonly todoRepository: Repository<Todo>,
  ) {}
  async getKakaoUser(accessToken: string) {
    // 카카오 API를 통해 유저 정보를 가져오는 함수
    try {
      const response = await axios.get<Record<string, any>>(
        'https://kapi.kakao.com/v2/user/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            property_keys: ['properties.nickname'],
          },
        },
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'Authorization code processed successfully',
        kakaoProfile: response.data,
      };
    } catch (error: unknown) {
      console.error('Error fetching Kakao user:', error);
      throw new UnauthorizedException('Failed to fetch Kakao user');
    }
  }

  //auth.repository로 가야함
  async findOrCreateByKakao(kakao_Id: number): Promise<string> {
    const kakaoId = kakao_Id.toString();
    // const email = kakaoProfile.kakao_account?.email ?? null;
    let user = await this.userRepo.findOne({ where: { kakaoId: kakaoId } });
    // console.log('User found:', user);
    if (!user) {
      user = this.userRepo.create({
        kakaoId: kakaoId,
        // email,
        // 필요하다면 닉네임 등 추가
        // nickname: kakaoProfile.properties?.nickname ?? null,
      });
      await this.userRepo.save(user);
    }
    return user.id;
  }

  async logoutKakao(accessToken: string): Promise<void> {
    try {
      await axios.post(
        'https://kapi.kakao.com/v1/user/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (error: unknown) {
      console.error('Error logging out Kakao user:', error);
      throw new UnauthorizedException('Failed to logout Kakao user');
    }
  }
}
