import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { handleLogin } from '@/components/login/handleLoginBtn';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { afterLogin } from '@/components/login/afterLogin';
import { makeStyles } from '@/theme/theme';

export default function LoginPage() {
  const styles = useStyles();
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
      {/* 로그인 화면 고양이: 앉아서 지켜봄(visual 4.4). 옛 로고는 검은 바탕이 박힌 그림이라 밝은 바탕에 맞지 않는다. */}
      <View style={styles.logoContainer} accessible accessibilityLabel='LEFT30'>
        <Image source={require('@/assets/cat/calico_sit_watch.png')} style={styles.cat} resizeMode='contain' />
        <Text style={styles.title}>LEFT30</Text>
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

const useStyles = makeStyles((t) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.wall,
  },
  title: {
    fontSize: 34,
    lineHeight: 44,
    marginTop: 12,
    color: t.text,
  },
  loginImage: {
    width: 160,
    height: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  cat: {
    width: 120 * (1392 / 1130),
    height: 120,
  },
  busy: {
    opacity: 0.5,
  },
  failedText: {
    marginTop: 12,
    color: t.sub,
    fontSize: 13,
  },
  devButton: {
    marginTop: 24,
    minHeight: 48,
    justifyContent: 'center',
  },
  devText: {
    color: t.sub,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
}));
