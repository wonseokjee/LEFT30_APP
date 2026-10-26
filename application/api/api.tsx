// api.ts
import axios from 'axios';

const api = axios.create({
  // 서버 주소는 .env의 EXPO_PUBLIC_API_URL에서만 읽는다(값이 없으면 app.config.ts가 시작을 막는다).
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  // 서버에 닿지 못하면 무한히 기다리지 않고 20초 뒤 실패로 끝낸다(로그인 화면 멈춤 방지).
  timeout: 20_000,
});

export default api;
