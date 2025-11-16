// api.ts
import axios from 'axios';

const api = axios.create({
  // baseURL: 'http://' + process.env. + ':3030', // 내 로컬 서버 IP
  //cmd -> ipconfig -> IPv4 Address

  // baseURL: 'http://' + process.env.EXPO_PUBLIC_LOCAL_IP + ':3030', // 내 로컬 서버 IP
  // baseURL: 'http://localhost:3030', // 직접 연결 시
  baseURL: 'https://left30m.com', // 프로덕션 도메인
});

export default api;
