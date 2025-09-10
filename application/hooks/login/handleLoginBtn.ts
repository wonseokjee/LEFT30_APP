import api from '@/api/api';
import { login } from '@react-native-kakao/user';
import * as SecureStore from 'expo-secure-store';

export const handleLogin = async (): Promise<boolean> => {
  try {
    const resKakao = await login();
    console.log('Waiting for Kakao login response');

    // API 요청 처리
    const res = await api.get('/auth/kakao', {
      headers: {
        Authorization: `Bearer ${resKakao.accessToken}`,
      },
    });

    // 응답에서 토큰 및 사용자 ID 추출
    const accessToken = res.headers['authorization']?.replace('Bearer ', '');
    const refreshToken = res.headers['x-refresh-token'];
    const user_id = res.data.user_id;

    if (!accessToken || !refreshToken || !user_id) {
      console.error('로그인 정보가 올바르지 않습니다.');
      return false;
    }

    console.log('로그인 성공');
    // 토큰 및 사용자 ID를 SecureStore에 저장
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
    } catch (err) {
      console.error('Failed to store accessToken:', err);
      return false;
    }
    try {
      await SecureStore.setItemAsync('refreshToken', refreshToken);
    } catch (err) {
      console.error('Failed to store refreshToken:', err);
      return false;
    }
    try {
      await SecureStore.setItemAsync('user_id', user_id);
    } catch (err) {
      console.error('Failed to store user_id:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error during login:', error);
    return false;
  }
};
