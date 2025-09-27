import { quietTimeType } from '@/@types/user/quietTimeType';
// import api from './api';
import * as SecureStore from 'expo-secure-store';
import loginApi from './Loginapi';

export const getQuietTimeByDB = async () => {
  const user_id = await SecureStore.getItemAsync('user_id');
  try {
    const res = await loginApi.get('/user/quietTime/' + user_id);
    const quietTime = res.data;
    return quietTime; // 데이터를 반환
  } catch (error) {
    console.log('error', error);
    return []; // 에러 발생 시 빈 배열 반환
  }
};

export const updateQuietTimeByDB = async (data: quietTimeType) => {
  const user_id = await SecureStore.getItemAsync('user_id');
  try {
    const res = await loginApi.post('/user/quietTime/' + user_id, data);
    if (res.data.status === 'success') {
      console.log('방해금지 시간 설정 성공:', res.data);
      return true; // 성공 시 true 반환
    }
  } catch (error) {
    console.log('error', error);
    return false; // 에러 발생 시 false 반환
  }
};

export const withdrawUser = async () => {
  const user_id = await SecureStore.getItemAsync('user_id');
  try {
    const res = await loginApi.delete('/user/withdraw', { data: { user_id } });
    console.log('res', res.data);
    if (res.data.status === 'success') {
      console.log('회원 탈퇴 성공:', res.data);
      return true; // 성공 시 true 반환
    }
  } catch (error) {
    console.log('error', error);
    return false; // 에러 발생 시 false 반환
  }
};
