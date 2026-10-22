import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

export type KakaoProfile = { id: number; connected_at: string };

@Injectable()
export class KakaoApiService {
  // Kakao access 토큰으로 사용자 정보를 가져온다. e2e에서는 이 서비스를 목킹한다.
  async getKakaoUser(accessToken: string): Promise<KakaoProfile> {
    try {
      const response = await axios.get<KakaoProfile>(
        'https://kapi.kakao.com/v2/user/me',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching Kakao user:', error);
      throw new UnauthorizedException('Failed to fetch Kakao user');
    }
  }
}
