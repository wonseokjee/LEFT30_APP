import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import {
  KakaoApiService,
  KakaoProfile,
} from '../src/auth/kakao/kakaoapi.service';

// 테스트 DB는 .env.test(NODE_ENV=test)의 DB_NAME이다. 운영 DB와 분리한다.
// Kakao /v2/user/me는 목킹한다: "kakao-<숫자>" 토큰을 그 숫자 id의 사용자로 본다.
export const kakaoMock = {
  getKakaoUser: jest.fn(async (token: string): Promise<KakaoProfile> => {
    const match = /^kakao-(\d+)$/.exec(token);
    if (!match) throw new Error('unexpected kakao token');
    return { id: Number(match[1]), connected_at: '2026-10-21T00:00:00Z' };
  }),
};

export async function createTestApp(): Promise<{
  app: NestExpressApplication;
  dataSource: DataSource;
}> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(KakaoApiService)
    .useValue(kakaoMock)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();
  return { app, dataSource };
}

export async function resetDb(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    'TRUNCATE "event", "plan", "slot", "user" RESTART IDENTITY CASCADE',
  );
}

export async function login(
  app: NestExpressApplication,
  kakaoId: number,
): Promise<{ userId: string; access: string; refresh: string }> {
  const res = await request(app.getHttpServer())
    .get('/auth/kakaoLogin')
    .set('Authorization', `Bearer kakao-${kakaoId}`)
    .expect(200);
  return {
    userId: res.body.user_id,
    access: (res.headers['authorization'] as string).replace('Bearer ', ''),
    refresh: res.headers['x-refresh-token'] as string,
  };
}
