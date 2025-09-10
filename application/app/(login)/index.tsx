import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { handleLogin } from '@/hooks/login/handleLoginBtn';
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
      <Text style={styles.title}>Welcome to My App</Text>
      <Button title='Login with Kakao' onPress={onLoginPress} />
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
});
