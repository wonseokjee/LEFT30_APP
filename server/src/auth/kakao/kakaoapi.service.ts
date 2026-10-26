import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type KakaoProfile = { id: number; connected_at: string };
type TokenInfo = { id: number; app_id: number };

@Injectable()
export class KakaoApiService {
  private readonly appId: string;

  // KAKAO_APP_ID가 없으면 서버가 시작하지 않는다. 비교 없이 로그인을 받는 일이 없게 한다.
  constructor(config: ConfigService) {
    this.appId = config.getOrThrow<string>('KAKAO_APP_ID');
  }

  // Kakao access 토큰으로 사용자 정보를 가져온다. e2e에서는 이 서비스를 목킹한다.
  // 토큰이 우리 앱에 발급된 것인지 먼저 확인한다(eng review D3). 다른 앱의 토큰은 401이다.
  async getKakaoUser(accessToken: string): Promise<KakaoProfile> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    let info: TokenInfo;
    let profile: KakaoProfile;
    try {
      info = (
        await axios.get<TokenInfo>(
          'https://kapi.kakao.com/v1/user/access_token_info',
          { headers },
        )
      ).data;
      if (String(info.app_id) !== this.appId) {
        throw new UnauthorizedException(
          'Kakao token was issued to another app',
        );
      }
      profile = (
        await axios.get<KakaoProfile>('https://kapi.kakao.com/v2/user/me', {
          headers,
        })
      ).data;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('Error fetching Kakao user:', error);
      throw new UnauthorizedException('Failed to fetch Kakao user');
    }
    return profile;
  }
}
