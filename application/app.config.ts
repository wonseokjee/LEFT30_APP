import { ExpoConfig, ConfigContext } from 'expo/config';
const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY;
// 예전 운영 도메인은 만료됐다. 주소를 코드에 두지 않고, 없으면 시작·빌드를 바로 멈춘다.
if (!process.env.EXPO_PUBLIC_API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL이 없습니다. application/.env.example을 참고해 .env에 서버 주소를 넣어 주세요.');
}
// 일상용·배포 빌드(EAS preview·production)는 APP_VARIANT=release다. 그 밖(로컬 expo run, 개발 빌드)은 개발용으로
// 앱 ID와 이름을 바꿔 폰에 나란히 깔리게 한다(D28). 개발 테스트가 일상 기록을 지우지 않게 하려는 것이다.
const IS_RELEASE = process.env.APP_VARIANT === 'release';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_RELEASE ? 'LEFT30' : 'LEFT30 개발',
  slug: 'left30app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/left30_logo.png',
  scheme: IS_RELEASE ? 'left30' : 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    package: IS_RELEASE ? 'com.left30m.app' : 'com.left30m.app.dev',
    // 정시 알림. 선언하지 않으면 expo-notifications가 부정확한 알람으로 걸어 Doze에서 늦어진다.
    // 사용자가 설정의 "알람 및 리마인더"에서 켜는 권한이다(USE_EXACT_ALARM은 쓰지 않는다, ENG-1).
    permissions: ['android.permission.SCHEDULE_EXACT_ALARM'],
    adaptiveIcon: {
      foregroundImage: './assets/images/left30_logo.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        image: './assets/images/left30_logo.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: [
            'https://devrepo.kakao.com/nexus/content/groups/public/',
          ],
        },
      },
    ],
    [
      '@react-native-kakao/core',
      {
        nativeAppKey: kakaoNativeAppKey,
        android: {
          authCodeHandlerActivity: true,
        },
        ios: {
          handleKakaoOpenUrl: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'f138631f-eac8-4169-bb2d-b5a98bebc79e',
    },
  },
  runtimeVersion: '1.0.0',
  updates: {
    url: 'https://u.expo.dev/f138631f-eac8-4169-bb2d-b5a98bebc79e',
  },
});
