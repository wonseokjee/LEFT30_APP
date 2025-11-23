import { ExpoConfig, ConfigContext } from 'expo/config';
const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY;
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'left30app',
  slug: 'left30app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/left30_logo.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.left30m.app',
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
        nativeAppKey: 'db4ba8bb6eb816db894d051a140aa9ff',
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
