// api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  // baseURL: 'http://' + process.env. + ':3030', // 내 로컬 서버 IP
  //cmd -> ipconfig -> IPv4 Address

  baseURL: 'http://' + process.env.EXPO_PUBLIC_LOCAL_IP + ':3030', // 내 로컬 서버 IP
});

//api access token을 요청 보낼 때마다 header에 넣어주기 위한 interceptor 설정
// 이 interceptor는 로그인 이후 모든 요청에 대해 실행되며, 토큰을 헤더에 추가합니다.
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        // 구버전 또는 타입이 객체일 때
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 에러 응답 interceptor (accessToken 만료 시 refreshToken 사용)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      // refreshToken으로 새로운 accessToken 요청 및 재시도 로직 작성
      if (refreshToken) {
        try {
          // refreshToken으로 새로운 accessToken 요청
          const res = await axios.post(
            `http://${process.env.EXPO_PUBLIC_LOCAL_IP}:3030/auth/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );
          const newAccessToken = res.data.accessToken;
          // 새 accessToken 저장
          await SecureStore.setItemAsync('accessToken', newAccessToken);

          // 기존 요청 재시도
          const originalRequest = error.config;
          if (
            originalRequest.headers &&
            typeof originalRequest.headers.set === 'function'
          ) {
            originalRequest.headers.set(
              'Authorization',
              `Bearer ${newAccessToken}`
            );
          } else {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers[
              'Authorization'
            ] = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // refresh 실패 시 로그아웃 등 처리
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          // 예시: 로그인 화면으로 이동 (React Navigation 사용 시)
          // import { navigationRef } from '@/navigation/RootNavigation';
          // navigationRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
          // 또는 Alert 등으로 사용자에게 알림
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
