import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import { handleLogin } from '@/components/login/handleLoginBtn';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { afterLogin } from '@/components/login/afterLogin';

export default function LoginPage() {
  const [showLoginButton, setShowLoginButton] = useState(false);
  // 로그인 중에는 다시 누르지 못하게 하고, 실패하면 한 줄로 알린다.
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const onLoginPress = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      if (await handleLogin()) {
        await afterLogin(router);
        return;
      }
      setFailed(true);
    } catch (error) {
      console.error('Login failed:', error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // 저장된 세션이 있으면 루트 _layout이 다음 화면으로 보낸다. 여기서는 버튼만 보여준다.
  useEffect(() => {
    SecureStore.getItemAsync('refreshToken')
      .then((refreshToken) => setShowLoginButton(!refreshToken))
      .catch(() => setShowLoginButton(true));
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
        <TouchableOpacity onPress={onLoginPress} disabled={busy} style={busy && styles.busy}>
          <Image
            source={require('@/assets/images/kakao_login_medium_narrow.png')}
            style={styles.loginImage}
            resizeMode='contain'
          />
        </TouchableOpacity>
      )}
      {failed && <Text style={styles.failedText}>로그인하지 못했어요. 다시 시도해 주세요.</Text>}
      {/* 개발 빌드 전용: 서버 없이 알림·기록 흐름을 확인한다(구현 D2). 배포 빌드에는 없다. */}
      {__DEV__ && showLoginButton && (
        <TouchableOpacity onPress={() => afterLogin(router)} style={styles.devButton}>
          <Text style={styles.devText}>로그인 없이 시작(개발용)</Text>
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
  busy: {
    opacity: 0.5,
  },
  failedText: {
    marginTop: 12,
    color: '#adb5bd',
    fontSize: 13,
  },
  devButton: {
    marginTop: 24,
    minHeight: 48,
    justifyContent: 'center',
  },
  devText: {
    color: '#adb5bd',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
