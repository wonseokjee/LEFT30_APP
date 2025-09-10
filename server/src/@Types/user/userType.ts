export type User = {
  id: string;
  email?: string;
  kakaoId?: string;
  name?: string;
  role: 'student' | 'worker';
  refreshToken?: string;
};

export type kakaoProfile = {
  id: number;
  connected_at: string;
};
