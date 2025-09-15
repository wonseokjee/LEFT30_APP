import { quietTimeType } from '@/@types/user/quietTimeType';
import api from './api';
import * as SecureStore from 'expo-secure-store';

export const getQuietTimeByDB = async () => {
  const user_id = await SecureStore.getItemAsync('user_id');
  try {
    const res = await api.get('/user/quietTime/' + user_id);
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
    const res = await api.post('/user/quietTime/' + user_id, data);
    if (res.data.status === 'success') {
      console.log('방해금지 시간 설정 성공:', res.data);
      return true; // 성공 시 true 반환
    }
  } catch (error) {
    console.log('error', error);
    return false; // 에러 발생 시 false 반환
  }
};
