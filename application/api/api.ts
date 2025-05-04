// api.ts
import axios from 'axios';

const api = axios.create({
  // baseURL: 'http://' + process.env. + ':3030', // 내 로컬 서버 IP
  baseURL: 'http://172.30.1.26:3030', // 내 로컬 서버 IP
});

export default api;
