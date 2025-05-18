// utils/auth/kakaoLogin.ts
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuthRequest } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const kakaoClientId = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
const serverRedirectUri = 'http://localhost:3030/auth/kakao/callback'; // 서버의 리디렉션 URI
const discovery = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  // tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

export const useKakaoLogin = () => {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: kakaoClientId!,
      redirectUri: serverRedirectUri, // 서버로 리디렉션
      // redirectUri: serverRedirectUri, // 서버로 리디렉션
      // redirectUri: AuthSession.makeRedirectUri({
      //   scheme: 'left30',
      // }),
      // scopes: ['profile', 'account_email'],
      // responseType: AuthSession.ResponseType.Code,
    },
    discovery
  );

  const loginWithKakao = async () => {
    try {
      const result = await promptAsync();

      if (result.type === 'success' && result.params.code) {
        console.log('Kakao login success', result.params.code);
        return result.params.code;
      } else if (result.type === 'dismiss') {
        console.log('Kakao login result:', result);
        // console.log('Kakao login result:', result.params.code );
        console.log(response);
        console.warn('Kakao login dismissed by user');
      } else {
        console.warn('Kakao login failed', result);
      }
    } catch (error) {
      console.error('Error during Kakao login:', error);
    }
  };

  return { loginWithKakao, request };
};
