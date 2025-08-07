// api.ts
import axios from 'axios';

// withoutLoginApi는 로그인 없이 접근 가능한 API를 위한 axios 인스턴스입니다.
// 이 인스턴스는 인증 토큰을 포함하지 않습니다.
const withoutLoginApi = axios.create({
  // baseURL: 'http://' + process.env. + ':3030', // 내 로컬 서버 IP
  //cmd -> ipconfig -> IPv4 Address

  baseURL: 'http://' + process.env.EXPO_PUBLIC_LOCAL_IP + ':3030', // 내 로컬 서버 IP
});

export default withoutLoginApi;
