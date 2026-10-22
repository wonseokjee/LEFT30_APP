import loginApi from './Loginapi';

// 계정 삭제. 대상은 서버가 JWT sub로만 정한다(본문 없음).
export const withdrawUser = async (): Promise<boolean> => {
  try {
    const res = await loginApi.delete('/me');
    return res.status === 200;
  } catch (error) {
    console.log('error', error);
    return false;
  }
};
