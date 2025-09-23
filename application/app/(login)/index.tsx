import React, { Suspense } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import { handleLogin } from '@/components/login/handleLoginBtn';
import { useRouter } from 'expo-router';

export default function LoginPage() {
  const router = useRouter();

  const onLoginPress = async () => {
    try {
      const isLoggedIn = await handleLogin();
      if (isLoggedIn) {
        router.replace('/(tabs)'); // 로그인 성공 시 메인 페이지로 이동
      } else {
        console.error('로그인 실패');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <View style={styles.container}>

        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/left30_logo.png')}
            style={styles.logo}
          />
        </View>
        {/* <Text style={styles.title}>Welcome to Left30</Text> */}
        <TouchableOpacity onPress={onLoginPress}>
          <Image
            source={require('@/assets/images/kakao_login_medium_narrow.png')}
            style={styles.loginImage}
            resizeMode='contain'
          />
        </TouchableOpacity>
    </View>
  );
}
//kakao_login_medium_narrow

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
