// fcmTokenErrorHandler.ts
// FCM 토큰 만료 및 에러 처리 유틸리티

export function handleFcmTokenError(
  error: string,
  token: string,
  removeToken: (token: string) => Promise<void>,
): void {
  // FCM에서 만료된 토큰 에러 코드 예시: 'messaging/registration-token-not-registered'
  if (error.includes('registration-token-not-registered')) {
    // DB에서 해당 토큰 삭제
    removeToken(token)
      .then(() => {
        console.log(`[FCM] 만료된 토큰 삭제 성공: ${token}`);
      })
      .catch(err => {
        console.error(`[FCM] 만료된 토큰 삭제 실패: ${token}`, err);
      });
  }
  // 기타 에러에 대한 추가 처리 가능
}
