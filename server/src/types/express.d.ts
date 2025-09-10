declare namespace Express {
  export interface Request {
    user?: User; // User는 실제 사용자 타입으로 교체
  }
}
