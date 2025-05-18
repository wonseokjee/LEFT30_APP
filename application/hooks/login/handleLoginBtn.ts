import { login } from '@react-native-kakao/user';
// import { loginWithKakao } from '@/utils/auth/kakaoLogin';

// 로그인 버튼 클릭 시
export const handleLogin = async () => {
  try {
    const res = await login();
  } catch (error) {
    console.error(error);
  }
  // try {
  //   const authCode = await loginWithKakao();
  //   const response = await fetch('http://localhost:3030/auth/kakao', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ code: authCode }),
  //   });
  //   const { accessToken, refreshToken } = await response.json();
  //   // 이후 SecureStore 등에 저장
  // } catch (e) {
  //   console.error('Login failed', e);
  // }
};
