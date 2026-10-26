import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { createTestApp, login, resetDb } from './helpers';

// ENG-2 인증 회귀 계약
describe('auth (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(() => resetDb(dataSource));
  afterAll(() => app.close());

  it('Kakao 토큰으로 로그인하면 사용자를 만들고 access·refresh를 발급한다', async () => {
    const first = await login(app, 1001);
    expect(first.userId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.access).toBeTruthy();
    expect(first.refresh).toBeTruthy();

    const again = await login(app, 1001);
    expect(again.userId).toBe(first.userId);

    await request(app.getHttpServer())
      .get('/sync')
      .set('Authorization', `Bearer ${first.access}`)
      .expect(200);
  });

  it('refresh 토큰으로 새 access를 받는다', async () => {
    const { refresh } = await login(app, 1002);
    const res = await request(app.getHttpServer())
      .post('/auth/reissueAccessToken')
      .set('Authorization', `Bearer ${refresh}`)
      .send({ userId: 'ignored' })
      .expect(200);
    const access = res.headers['authorization'].replace('Bearer ', '');

    await request(app.getHttpServer())
      .get('/sync')
      .set('Authorization', `Bearer ${access}`)
      .expect(200);
  });

  it('refresh 토큰은 60일 동안 쓸 수 있다', async () => {
    const { refresh } = await login(app, 1006);
    const { iat, exp } = new JwtService().decode<{ iat: number; exp: number }>(
      refresh,
    );
    expect(exp - iat).toBe(60 * 24 * 60 * 60);
  });

  it('refresh 토큰으로 API를 부르거나 access로 재발급하면 401이다', async () => {
    const { access, refresh } = await login(app, 1003);
    await request(app.getHttpServer())
      .get('/sync')
      .set('Authorization', `Bearer ${refresh}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/reissueAccessToken')
      .set('Authorization', `Bearer ${access}`)
      .expect(401);
  });

  it('만료된 access는 401이다', async () => {
    const { userId } = await login(app, 1004);
    const expired = new JwtService().sign(
      { sub: userId, type: 'access' },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: -10 },
    );
    await request(app.getHttpServer())
      .get('/sync')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
  });

  it('다시 로그인하면 이전 refresh 토큰은 쓸 수 없다', async () => {
    const old = await login(app, 1005);
    // 같은 초에 다시 발급해도 이전 토큰은 무효여야 한다(jwtid).
    await login(app, 1005);
    await request(app.getHttpServer())
      .post('/auth/reissueAccessToken')
      .set('Authorization', `Bearer ${old.refresh}`)
      .expect(401);
  });
});
