import * as SecureStore from 'expo-secure-store';
import api from '@/api/api';
import type { Auth, Transport } from './engine';

// 상태 코드 처리는 엔진이 한다. 그래서 axios가 4xx·5xx를 예외로 바꾸지 않게 한다.
export const httpTransport: Transport = {
  async post(path, body) {
    const token = await SecureStore.getItemAsync('accessToken');
    const res = await api.post(path, body, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      validateStatus: () => true,
      timeout: 20_000,
    });
    return { status: res.status, data: res.data };
  },
};

// 응답 형식은 서버 AuthController와 같다(헤더 Authorization). 본문의 userId는 서버가 쓰지 않는다.
export const secureStoreAuth: Auth = {
  async refresh() {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) return 'denied';
    try {
      const res = await api.post('/auth/reissueAccessToken', null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
        validateStatus: () => true,
        timeout: 20_000,
      });
      if (res.status === 401 || res.status === 403) return 'denied';
      const access = (res.headers['authorization'] as string | undefined)?.replace('Bearer ', '');
      if (res.status !== 200 || !access) return 'error';
      await SecureStore.setItemAsync('accessToken', access);
      return 'ok';
    } catch {
      return 'error';
    }
  },
};
