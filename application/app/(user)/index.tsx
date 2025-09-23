import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { unlink } from '@react-native-kakao/user';
import * as SecureStore from 'expo-secure-store';
import { GRAY_1, GRAY_9 } from '@/assets/palette';

export default function UserPage() {
  const router = useRouter();

  const unLinkKakao = async () => {
    try {
      await unlink();
      await SecureStore.deleteItemAsync('refreshToken');
      router.replace('/(login)'); // 계정 연동 해제 성공 시 로그인 페이지로 이동
    } catch (error) {
      console.error('Unlink failed:', error);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.title}>계정 관리</Text>
        </View>
        <TouchableOpacity style={styles.unlinkButton} onPress={unLinkKakao}>
          <Text style={styles.buttonText}>카카오 계정 연동 해제</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
//kakao_login_medium_narrow

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    backgroundColor: 'black',
    padding: '2%',
  },
  logoContainer: {},
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: GRAY_1,
    // borderWidth: 1,
    // borderColor: 'white',
  },
  unlinkButton: {
    // flex: 1,
    paddingVertical: 10,
    // marginHorizontal: 5,
    width: '50%',
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#FEE500',
  },
  buttonText: {
    color: GRAY_9,
    // fontWeight: 'bold',
    fontSize: 16,
  },
});
