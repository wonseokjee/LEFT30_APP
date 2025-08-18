import api from '@/api/api';
import { login } from '@react-native-kakao/user';
import * as SecureStore from 'expo-secure-store';
// import { loginWithKakao } from '@/utils/auth/kakaoLogin';

// 로그인 버튼 클릭 시
export const handleLogin = async () => {
  try {
    const resKakao = await login();
    // console.log('res', res.accessToken);
    api
      .get('/auth/kakao', {
        headers: {
          Authorization: `Bearer ${resKakao.accessToken}`,
        },
      })
      .then((res) => {
        // console.log('res headers:', res.headers);
        const accessToken = res.headers['authorization']?.replace(
          'Bearer ',
          ''
        );
        const refreshToken = res.headers['x-refresh-token'];
        const user_id = res.data.user_id;
        // console.log('accessToken', accessToken);
        // console.log('refreshToken', refreshToken);
        // console.log('user_id', user_id);
        if (!accessToken || !refreshToken || !user_id) {
          console.error('로그인 정보가 올바르지 않습니다.');
          return;
        } else {
          console.log('로그인 성공');
          // 토큰 및 userid를 SecureStore에 저장
          SecureStore.setItem('accessToken', accessToken);
          SecureStore.setItem('refreshToken', refreshToken);
          SecureStore.setItem('user_id', user_id);
        }

        //불러오기
        // const token = await SecureStore.getItemAsync('accessToken');
      });
  } catch (error) {
    console.error(error);
  }
};
