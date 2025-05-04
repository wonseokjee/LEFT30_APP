// api.ts
import axios from 'axios';

const api = axios.create({
  // baseURL: 'http://' + process.env. + ':3030', // 내 로컬 서버 IP
  //cmd -> ipconfig -> IPv4 Address
  baseURL: 'http://172.30.1.92:3030', // 내 로컬 서버 IP
});

export default api;
