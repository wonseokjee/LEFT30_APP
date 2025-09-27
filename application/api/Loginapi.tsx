// api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import api from './api';
import { use } from 'react';
import { useLoginExpiredModalStore } from '@/store/useModalStore';

const loginApi = axios.create({
  // baseURL: 'http://' + process.env. + ':3030', // 내 로컬 서버 IP
  //cmd -> ipconfig -> IPv4 Address
  // baseURL: 'http://' + process.env.EXPO_PUBLIC_LOCAL_IP + ':3030', // 내 로컬 서버 IP
  baseURL: 'http://localhost:3030', // 내 로컬 서버 IP
});

//api access token을 요청 보낼 때마다 header에 넣어주기 위한 interceptor 설정
// 이 interceptor는 로그인 이후 모든 요청에 대해 실행되며, 토큰을 헤더에 추가합니다.
// console.log('Loginapi request interceptor registered');
loginApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      // console.log('Retrieved accessToken:', token);
      // 토큰이 존재하면 Authorization 헤더에 추가
      // config.headers가 함수형(set)일 경우와 객체형일 경우를 모두 처리합니다.
      // set 메서드가 있는 경우는 axios 0.21.1 이상 버전에서 사용됩니다.
      // 구버전에서는 config.headers가 객체로 되어 있습니다.
      if (token) {
        if (config.headers && typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          // 구버전 또는 타입이 객체일 때
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return config;
    } catch (error) {
      console.error('Error retrieving accessToken:', error);
      //로그인 만료 동작.
      useLoginExpiredModalStore.getState().setLoginExpiredModalVisible(true);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Request error:', error);
    //로그인 만료 동작.
    useLoginExpiredModalStore.getState().setLoginExpiredModalVisible(true);
    return Promise.reject(error);
  }
);

// 에러 응답 interceptor (accessToken 만료 시 refreshToken 사용)
loginApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const userId = await SecureStore.getItemAsync('user_id');
      // console.error('Access token expired, attempting to refresh:', error);
      // refreshToken으로 새로운 accessToken 요청 및 재시도 로직 작성
      if (refreshToken) {
        try {
          // refreshToken으로 새로운 accessToken 요청
          const res = await api.post(
            `/auth/reissueAccessToken`,
            { userId: userId },
            {
              headers: {
                Authorization: `Bearer ${refreshToken}`,
              },
            }
          );
          const newAccessToken = res.headers['authorization']?.replace(
            'Bearer ',
            ''
          );
          // console.log('res:', res);
          // 새 accessToken 저장
          await SecureStore.setItemAsync('accessToken', newAccessToken);

          // 기존 요청 재시도
          const originalRequest = error.config;
          if (
            originalRequest.headers &&
            typeof originalRequest.headers.set === 'function'
          ) {
            originalRequest.headers.set(
              'Authorization',
              `Bearer ${newAccessToken}`
            );
          } else {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers[
              'Authorization'
            ] = `Bearer ${newAccessToken}`;
          }
          return loginApi(originalRequest);
        } catch (refreshError) {
          //로그인 만료 동작.
          useLoginExpiredModalStore
            .getState()
            .setLoginExpiredModalVisible(true);
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default loginApi;
