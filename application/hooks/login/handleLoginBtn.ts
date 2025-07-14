import api from '@/api/api';
import { login } from '@react-native-kakao/user';
// import { loginWithKakao } from '@/utils/auth/kakaoLogin';

// 로그인 버튼 클릭 시
export const handleLogin = async () => {
  try {
    const res = await login();
    // console.log('res', res.accessToken);
    await api.get('/auth/kakao', {
      headers: {
        Authorization: `Bearer ${res.accessToken}`,
      },
    });
  } catch (error) {
    console.error(error);
  }

};
