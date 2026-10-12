import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { unlink } from '@react-native-kakao/user';
import * as SecureStore from 'expo-secure-store';
import { GRAY_1, GRAY_9 } from '@/assets/palette';
import { getQuietTimeByDB } from '@/api/userApi';
import { getQuietTimeByZustand } from '@/store/useQuietTImeStore';
import QuietTimeModal from '@/components/user/quietTimeModal';
import WithdrawalModal from '@/components/user/withdrawalModal';

export default function UserPage() {
  const router = useRouter();
  const [quietModalVisible, setQuietModalVisible] = useState(false);
  const [WithdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const { setTime } = getQuietTimeByZustand();

  const unLinkKakao = async () => {
    try {
      await unlink();
      await SecureStore.deleteItemAsync('refreshToken');
      router.replace('/(login)'); // 계정 연동 해제 성공 시 로그인 페이지로 이동
    } catch (error) {
      console.error('Unlink failed:', error);
    }
  };
  const quietTimeSetting = async () => {
    try {
      const quietTime = await getQuietTimeByDB();
      setQuietModalVisible(true);
      setTime(quietTime);
    } catch (error) {
      console.error('Unlink failed:', error);
    }
  };
  const handleWithdrawal = () => {
    setWithdrawalModalVisible(true);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.title}>계정 관리</Text>
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>카카오 계정 연동 해제</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.unlinkButton} onPress={unLinkKakao}>
              <Text style={styles.buttonText}>카카오 계정 해제하기</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>방해 금지 시간</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.quietTimeButton}
              onPress={quietTimeSetting}
            >
              <Text style={styles.buttonText}>방해 금지 시간 설정</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>회원 탈퇴</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.quietTimeButton}
              onPress={handleWithdrawal}
            >
              <Text style={styles.buttonText}>회원 탈퇴 하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {quietModalVisible ? (
        <QuietTimeModal setModalVisible={setQuietModalVisible} />
      ) : null}
      {WithdrawalModalVisible ? (
        <WithdrawalModal
          setWithdrawalModalVisible={setWithdrawalModalVisible}
        />
      ) : null}
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
  contentContainer: {
    // borderWidth: 1,
    // borderColor: GRAY_1,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    // fontWeight: 'bold',
    color: GRAY_1,
    marginBottom: 20,
  },
  buttonContainer: {
    alignItems: 'center',
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
  quietTimeButton: {
    // flex: 1,
    paddingVertical: 10,
    width: '50%',
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: GRAY_1,
  },
  buttonText: {
    color: GRAY_9,
    // fontWeight: 'bold',
    fontSize: 16,
  },
});
