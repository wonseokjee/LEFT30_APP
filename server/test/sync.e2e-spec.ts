import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { createTestApp, login, resetDb } from './helpers';

const TZ = 'Asia/Seoul';

function slot(qid: number, slotStart: string, extra: Record<string, unknown> = {}) {
  return {
    qid,
    slot_start: slotStart,
    tz: TZ,
    category: 'work',
    source: 'answered',
    answered_at: slotStart,
    client_updated_at: '2026-10-21T05:00:00.000Z',
    ...extra,
  };
}

// 2026-10-21 00:00 UTC부터 i번째 30분 칸
function nthSlot(i: number): string {
  return new Date(Date.UTC(2026, 9, 21) + i * 30 * 60 * 1000).toISOString();
}

describe('sync (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let access: string;
  let userId: string;

  const post = (path: string, body: unknown, token = access) =>
    request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);
  const restore = (since?: string, token = access) =>
    request(app.getHttpServer())
      .get('/sync')
      .query(since ? { since } : {})
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });
  beforeEach(async () => {
    await resetDb(dataSource);
    ({ access, userId } = await login(app, 2001));
  });
  afterAll(() => app.close());

  it('/health는 DB까지 확인하고 200이다', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  describe('POST /sync/slots', () => {
    it('upsert하고 qid로 응답하며, last_tz를 갱신한다', async () => {
      const res = await post('/sync/slots', {
        tz: TZ,
        items: [slot(1, nthSlot(0)), slot(2, nthSlot(1))],
      }).expect(200);
      expect(res.body).toEqual({ accepted: [1, 2], rejected: [] });

      const [user] = await dataSource.query('SELECT last_tz FROM "user" WHERE id = $1', [userId]);
      expect(user.last_tz).toBe(TZ);
    });

    it('client_updated_at이 더 최신인 값만 남는다', async () => {
      await post('/sync/slots', {
        items: [slot(1, nthSlot(0), { category: 'rest', client_updated_at: '2026-10-21T06:00:00Z' })],
      }).expect(200);
      // 오래된 수정이 늦게 도착해도 덮어쓰지 않는다. 처리는 됐으니 accepted다.
      const stale = await post('/sync/slots', {
        items: [slot(2, nthSlot(0), { category: 'work', client_updated_at: '2026-10-21T05:00:00Z' })],
      }).expect(200);
      expect(stale.body.accepted).toEqual([2]);

      const [row] = await dataSource.query('SELECT category FROM slot');
      expect(row.category).toBe('rest');

      await post('/sync/slots', {
        items: [slot(3, nthSlot(0), { category: 'sleep', client_updated_at: '2026-10-21T07:00:00Z' })],
      }).expect(200);
      const [updated] = await dataSource.query('SELECT category FROM slot');
      expect(updated.category).toBe('sleep');
    });

    it('같은 칸이 한 배치에 두 번 있어도 최신 값이 남는다', async () => {
      await post('/sync/slots', {
        items: [
          slot(1, nthSlot(0), { category: 'rest', client_updated_at: '2026-10-21T06:00:00Z' }),
          slot(2, nthSlot(0), { category: 'exercise', client_updated_at: '2026-10-21T06:01:00Z' }),
        ],
      }).expect(200);
      const rows = await dataSource.query('SELECT category FROM slot');
      expect(rows).toEqual([{ category: 'exercise' }]);
    });

    it('잘못된 항목만 rejected로 돌려주고 나머지는 저장한다(R3)', async () => {
      const res = await post('/sync/slots', {
        items: [
          slot(1, nthSlot(0)),
          slot(2, '2026-10-21T00:10:00.000Z'), // :00/:30이 아님
          slot(3, nthSlot(2), { category: 'gaming' }),
          slot(4, nthSlot(3), { tz: 'Mars/Base' }),
          'not-an-object',
          slot(5, nthSlot(4)),
        ],
      }).expect(200);
      expect(res.body.accepted).toEqual([1, 5]);
      expect(res.body.rejected.map((r: { qid: number | null }) => r.qid)).toEqual([2, 3, 4, null]);
      const [{ count }] = await dataSource.query('SELECT count(*)::int AS count FROM slot');
      expect(count).toBe(2);
    });

    it(':45 오프셋 시간대에서는 현지 :00/:30을 기준으로 맞춘다', async () => {
      // 카트만두(+05:45) 현지 06:00 = 00:15 UTC
      const res = await post('/sync/slots', {
        items: [slot(1, '2026-10-21T00:15:00.000Z', { tz: 'Asia/Kathmandu' })],
      }).expect(200);
      expect(res.body.accepted).toEqual([1]);
    });

    it('500건을 넘으면 413이다', async () => {
      const items = Array.from({ length: 501 }, (_, i) => slot(i, nthSlot(i)));
      await post('/sync/slots', { items }).expect(413);
    });

    it('본문이 1MB를 넘으면 413이다', async () => {
      const note = 'x'.repeat(400);
      const items = Array.from({ length: 3000 }, (_, i) => slot(i, nthSlot(i), { note }));
      await post('/sync/slots', { items }).expect(413);
    });

    it('토큰이 없으면 401이다', async () => {
      await request(app.getHttpServer()).post('/sync/slots').send({ items: [] }).expect(401);
    });
  });

  describe('POST /sync/plans', () => {
    it('upsert하고 target_minutes=0도 저장한다', async () => {
      const base = { local_date: '2026-10-21', client_updated_at: '2026-10-21T00:00:00Z' };
      const res = await post('/sync/plans', {
        items: [
          { qid: 1, ...base, category: 'work', target_minutes: 360 },
          { qid: 2, ...base, category: 'exercise', target_minutes: 0 },
          { qid: 3, ...base, local_date: '2026-02-30', category: 'rest', target_minutes: 60 },
          { qid: 4, ...base, category: 'rest', target_minutes: 2000 },
        ],
      }).expect(200);
      expect(res.body.accepted).toEqual([1, 2]);
      expect(res.body.rejected.map((r: { qid: number }) => r.qid)).toEqual([3, 4]);

      await post('/sync/plans', {
        items: [{ qid: 5, ...base, client_updated_at: '2026-10-21T01:00:00Z', category: 'work', target_minutes: 300 }],
      }).expect(200);
      const rows = await dataSource.query(
        'SELECT category, target_minutes FROM plan ORDER BY category',
      );
      expect(rows).toEqual([
        { category: 'exercise', target_minutes: 0 },
        { category: 'work', target_minutes: 300 },
      ]);
    });
  });

  describe('POST /events', () => {
    it('같은 배치를 두 번 보내도 행 수가 변하지 않는다', async () => {
      const items = [
        { qid: 1, id: randomUUID(), type: 'plan_set', ts: '2026-10-21T00:00:00Z', props: { local_date: '2026-10-21', mode: 'custom', source: 'manual' } },
        { qid: 2, id: randomUUID(), type: 'ping_answered', ts: '2026-10-21T00:30:00Z' },
      ];
      await post('/events', { items }).expect(200);
      const again = await post('/events', { items }).expect(200);
      expect(again.body.accepted).toEqual([1, 2]);
      const [{ count }] = await dataSource.query('SELECT count(*)::int AS count FROM event');
      expect(count).toBe(2);
    });

    it('알 수 없는 타입과 500자를 넘는 피드백 메모는 rejected다', async () => {
      const res = await post('/events', {
        items: [
          { qid: 1, id: randomUUID(), type: 'unknown', ts: '2026-10-21T00:00:00Z' },
          { qid: 2, id: randomUUID(), type: 'feedback', ts: '2026-10-21T00:00:00Z', props: { screen: 'today', memo: 'x'.repeat(501) } },
          { qid: 3, id: randomUUID(), type: 'feedback', ts: '2026-10-21T00:00:00Z', props: { screen: 'today', memo: 'x'.repeat(500) } },
        ],
      }).expect(200);
      expect(res.body.accepted).toEqual([3]);
      expect(res.body.rejected.map((r: { qid: number }) => r.qid)).toEqual([1, 2]);
    });
  });

  describe('GET /sync', () => {
    it('since 이후 행만 돌려주고, 다른 사용자의 행은 보이지 않는다', async () => {
      await post('/sync/slots', { items: [slot(1, nthSlot(0))] }).expect(200);
      const first = await restore();
      expect(first.body.slots).toHaveLength(1);
      expect(first.body.slots[0]).toMatchObject({ category: 'work', tz: TZ });
      expect(first.body.has_more).toBe(false);

      await post('/sync/plans', {
        items: [{ qid: 2, local_date: '2026-10-21', category: 'work', target_minutes: 60, client_updated_at: '2026-10-21T00:00:00Z' }],
      }).expect(200);
      const next = await restore(first.body.cursor);
      expect(next.body.slots).toHaveLength(0);
      expect(next.body.plans).toEqual([
        expect.objectContaining({ local_date: '2026-10-21', category: 'work', target_minutes: 60 }),
      ]);

      const other = await login(app, 2002);
      const otherView = await restore(undefined, other.access);
      expect(otherView.body.slots).toHaveLength(0);
      expect(otherView.body.plans).toHaveLength(0);
    });

    it('500행을 넘으면 나눠 보내고, 끝까지 따라가면 빠짐없이 한 번씩 받는다', async () => {
      await post('/sync/slots', { items: Array.from({ length: 500 }, (_, i) => slot(i, nthSlot(i))) }).expect(200);
      await post('/sync/slots', { items: Array.from({ length: 300 }, (_, i) => slot(i, nthSlot(500 + i))) }).expect(200);

      const seen = new Set<string>();
      let cursor: string | undefined;
      for (let page = 0; page < 10; page++) {
        const res = await restore(cursor);
        for (const s of res.body.slots) seen.add(s.slot_start);
        cursor = res.body.cursor;
        if (!res.body.has_more) break;
      }
      expect(seen.size).toBe(800);
    });
  });

  describe('DELETE /me', () => {
    it('사용자와 slot·plan·event를 모두 지우고, 이후 토큰은 쓸 수 없다', async () => {
      const other = await login(app, 2003);
      await post('/sync/slots', { items: [slot(1, nthSlot(0))] }).expect(200);
      await post('/sync/slots', { items: [slot(1, nthSlot(0))] }, other.access).expect(200);
      await post('/events', {
        items: [{ qid: 1, id: randomUUID(), type: 'feedback', ts: '2026-10-21T00:00:00Z', props: { screen: 'today', memo: '불편해요' } }],
      }).expect(200);

      await request(app.getHttpServer())
        .delete('/me')
        .set('Authorization', `Bearer ${access}`)
        .expect(200);

      for (const table of ['slot', 'plan', 'event']) {
        const [{ count }] = await dataSource.query(
          `SELECT count(*)::int AS count FROM "${table}" WHERE user_id = $1`,
          [userId],
        );
        expect(count).toBe(0);
      }
      const users = await dataSource.query('SELECT id FROM "user" WHERE id = $1', [userId]);
      expect(users).toHaveLength(0);
      // 다른 사용자의 데이터는 그대로다.
      const [{ count }] = await dataSource.query(
        'SELECT count(*)::int AS count FROM slot WHERE user_id = $1',
        [other.userId],
      );
      expect(count).toBe(1);

      await post('/sync/slots', { items: [slot(2, nthSlot(1))] }).expect(401);
    });
  });
});
