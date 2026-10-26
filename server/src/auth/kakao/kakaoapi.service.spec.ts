import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KakaoApiService } from './kakaoapi.service';

const get = jest.spyOn(axios, 'get');

const config = (env: Record<string, string>) => new ConfigService(env);

// e2e는 이 서비스 전체를 목킹하므로 app_id 비교는 여기서 검증한다(eng review D3).
describe('KakaoApiService', () => {
  beforeEach(() => get.mockReset());

  function respond(appId: number) {
    get.mockImplementation((url: string) =>
      Promise.resolve({
        data: url.endsWith('/access_token_info')
          ? { id: 7, app_id: appId }
          : { id: 7, connected_at: '2026-10-21T00:00:00Z' },
      }),
    );
  }

  it('우리 앱에 발급된 토큰이면 사용자 정보를 돌려준다', async () => {
    respond(1234);
    const service = new KakaoApiService(config({ KAKAO_APP_ID: '1234' }));
    await expect(service.getKakaoUser('token')).resolves.toEqual({
      id: 7,
      connected_at: '2026-10-21T00:00:00Z',
    });
  });

  it('다른 앱에 발급된 토큰이면 401이고 사용자 정보는 묻지 않는다', async () => {
    respond(9999);
    const service = new KakaoApiService(config({ KAKAO_APP_ID: '1234' }));
    await expect(service.getKakaoUser('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('Kakao 호출이 실패하면 401이다', async () => {
    get.mockRejectedValue(new Error('network'));
    const service = new KakaoApiService(config({ KAKAO_APP_ID: '1234' }));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(service.getKakaoUser('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('KAKAO_APP_ID가 없으면 만들어지지 않는다(서버 시작 실패)', () => {
    expect(() => new KakaoApiService(config({}))).toThrow();
  });
});
