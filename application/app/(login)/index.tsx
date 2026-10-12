import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { handleLogin } from '@/components/login/handleLoginBtn';
import { useRouter } from 'expo-router';
import registerForPushNotificationsAsync from '@/components/pushNotification/registerForPushNotificationsAsync';
import * as SecureStore from 'expo-secure-store';

export default function LoginPage() {
  const router = useRouter();
  const [showLoginButton, setShowLoginButton] = useState(false);

  const onLoginPress = async () => {
    try {
      const isLoggedIn = await handleLogin();
      if (isLoggedIn) {
        await registerForPushNotificationsAsync();
        router.replace('/(tabs)');
      } else {
        console.error('로그인 실패');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  useEffect(() => {
    const checkIsLoggedIn = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync('accessToken');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const userId = await SecureStore.getItemAsync('user_id');

        if (accessToken && refreshToken && userId) {
          router.replace('/(tabs)');
        } else {
          setShowLoginButton(true);
        }
      } catch (error) {
        console.error('로그인 상태 확인 에러:', error);
        setShowLoginButton(true);
      }
    };

    checkIsLoggedIn();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/left30_logo.png')}
          style={styles.logo}
        />
      </View>
      {showLoginButton && (
        <TouchableOpacity onPress={onLoginPress}>
          <Image
            source={require('@/assets/images/kakao_login_medium_narrow.png')}
            style={styles.loginImage}
            resizeMode='contain'
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'white',
  },
  loginImage: {
    width: 160,
    height: 40,
  },
  logoContainer: {
    width: '60%',
    height: '30%',
    // height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: '80%',
    height: '80%',
  },
});
