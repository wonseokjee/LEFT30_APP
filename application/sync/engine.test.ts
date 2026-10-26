import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { logEvent, saveSlot } from '@/db/records';
import type { SlotRow } from '@/db/types';
import { backoffMs, createSyncEngine, type Auth, type Transport } from './engine';

type Item = Record<string, unknown> & { qid: number };
type Handler = (path: string, body: { tz?: string; items: Item[] }) => Promise<{ status: number; data?: unknown }>;

// 서버 동작을 흉내 낸다: 칸은 client_updated_at이 더 최신일 때만 덮어쓴다(LWW).
function fakeServer() {
  const slots = new Map<string, Item>();
  const calls: { path: string; qids: number[] }[] = [];
  const accept: Handler = async (path, body) => {
    for (const item of body.items) {
      if (path === '/sync/slots') {
        const prev = slots.get(item.slot_start as string);
        if (!prev || (prev.client_updated_at as string) < (item.client_updated_at as string)) {
          slots.set(item.slot_start as string, item);
        }
      }
    }
    return { status: 200, data: { accepted: body.items.map((i) => i.qid), rejected: [] } };
  };
  let handler: Handler = accept;
  const transport: Transport = {
    post: (path, body) => {
      const b = body as { tz?: string; items: Item[] };
      calls.push({ path, qids: b.items.map((i) => i.qid) });
      return handler(path, b);
    },
  };
  return {
    slots,
    calls,
    transport,
    accept,
    use(h: Handler) {
      handler = h;
    },
  };
}

function slot(i: number, extra: Partial<SlotRow> = {}): SlotRow {
  const start = new Date(Date.UTC(2026, 9, 21) + i * 30 * 60 * 1000).toISOString();
  return {
    slot_start: start,
    tz: 'Asia/Seoul',
    category: 'work',
    note: null,
    source: 'answered',
    answered_at: start,
    client_updated_at: '2026-10-21T05:00:00.000Z',
    ...extra,
  };
}

async function setup(auth: Auth = { refresh: async () => 'denied' }) {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  const server = fakeServer();
  const engine = createSyncEngine({ db, transport: server.transport, auth, getTz: () => 'Asia/Seoul' });
  const queueIds = async () =>
    (await db.all<{ id: number }>('SELECT id FROM sync_queue ORDER BY id')).map((r) => r.id);
  return { db, server, engine, queueIds };
}

describe('동기화 큐', () => {
  it('응답받은 id만 지우고 큐가 비면 done이다', async () => {
    const { db, server, engine, queueIds } = await setup();
    await saveSlot(db, slot(0));
    await saveSlot(db, slot(1));
    expect(await engine.requestSync()).toEqual({ status: 'done', sent: 2 });
    expect(await queueIds()).toEqual([]);
    expect(server.calls).toEqual([{ path: '/sync/slots', qids: [1, 2] }]);
  });

  it('(R4) 응답을 기다리는 동안 같은 칸을 고쳐도 최신 값이 서버에 남는다', async () => {
    const { db, server, engine, queueIds } = await setup();
    await saveSlot(db, slot(0, { category: 'rest', client_updated_at: '2026-10-21T06:00:00.000Z' }));

    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(async (path, body) => {
      await gate;
      return server.accept(path, body);
    });

    const first = engine.requestSync();
    await new Promise((r) => setTimeout(r, 0));
    // 첫 요청이 서버에 가 있는 동안 같은 칸을 고치고 다시 동기화를 요청한다.
    await saveSlot(db, slot(0, { category: 'sleep', client_updated_at: '2026-10-21T06:05:00.000Z' }));
    const second = engine.requestSync();
    server.use(server.accept);
    release();

    await first;
    await second;
    expect(server.calls.map((c) => c.qids)).toEqual([[1], [2]]);
    expect(server.slots.get(slot(0).slot_start)!.category).toBe('sleep');
    expect(await queueIds()).toEqual([]);
  });

  it('(R3) rejected 항목은 dead-letter로 옮기고 sync_rejected를 남기며, 나머지는 막히지 않는다', async () => {
    const { db, server, engine, queueIds } = await setup();
    await saveSlot(db, slot(0));
    await saveSlot(db, slot(1));
    server.use(async (path, body) => {
      if (path !== '/sync/slots') return server.accept(path, body);
      return { status: 200, data: { accepted: [1], rejected: [{ qid: 2, reason: 'bad category' }] } };
    });

    expect((await engine.requestSync()).status).toBe('done');
    expect(await db.all('SELECT queue_id, reason FROM sync_dead_letter')).toEqual([
      { queue_id: 2, reason: 'bad category' },
    ]);
    const eventCall = server.calls.find((c) => c.path === '/events');
    expect(eventCall?.qids).toHaveLength(1);
    expect(await queueIds()).toEqual([]);
    const [event] = await db.all<{ type: string; props: string }>('SELECT type, props FROM event');
    expect(event.type).toBe('sync_rejected');
    expect(JSON.parse(event.props)).toEqual({ kind: 'slot', reason: 'bad category' });
  });

  it('응답에 빠진 항목은 지우지 않고 다음 실행에 다시 보낸다', async () => {
    const { db, server, engine, queueIds } = await setup();
    await saveSlot(db, slot(0));
    await saveSlot(db, slot(1));
    server.use(async () => ({ status: 200, data: { accepted: [1], rejected: [] } }));
    await engine.requestSync();
    expect(await queueIds()).toEqual([2]);

    server.use(server.accept);
    await engine.requestSync();
    expect(await queueIds()).toEqual([]);
  });

  it('500건을 넘으면 나눠 보낸다', async () => {
    const { db, server, engine } = await setup();
    for (let i = 0; i < 501; i++) await saveSlot(db, slot(i));
    expect(await engine.requestSync()).toEqual({ status: 'done', sent: 501 });
    expect(server.calls.map((c) => c.qids.length)).toEqual([500, 1]);
  });

  it('413이면 반으로 나눠 다시 보낸다', async () => {
    const { db, server, engine, queueIds } = await setup();
    for (let i = 0; i < 4; i++) await saveSlot(db, slot(i));
    server.use(async (path, body) =>
      body.items.length > 2 ? { status: 413 } : server.accept(path, body),
    );
    expect((await engine.requestSync()).status).toBe('done');
    expect(server.calls.map((c) => c.qids)).toEqual([[1, 2, 3, 4], [1, 2], [3, 4]]);
    expect(await queueIds()).toEqual([]);
  });

  it('401이면 refresh 후 다시 보낸다', async () => {
    let refreshed = false;
    const { db, server, engine, queueIds } = await setup({
      refresh: async () => {
        refreshed = true;
        return 'ok';
      },
    });
    await saveSlot(db, slot(0));
    server.use(async (path, body) => (refreshed ? server.accept(path, body) : { status: 401 }));
    expect((await engine.requestSync()).status).toBe('done');
    expect(await queueIds()).toEqual([]);
  });

  it('(D6) refresh가 장애(error)면 로그인 안내 없이 retry이고 큐는 그대로 남는다', async () => {
    const { db, server, engine, queueIds } = await setup({ refresh: async () => 'error' });
    await saveSlot(db, slot(0));
    server.use(async () => ({ status: 401 }));
    expect(await engine.requestSync()).toEqual({ status: 'retry', sent: 0 });
    expect(await queueIds()).toEqual([1]);
  });

  it('refresh가 거절되면 needs_login이고 큐는 그대로 남는다', async () => {
    const { db, server, engine, queueIds } = await setup();
    await saveSlot(db, slot(0));
    server.use(async () => ({ status: 401 }));
    expect(await engine.requestSync()).toEqual({ status: 'needs_login', sent: 0 });
    expect(await queueIds()).toEqual([1]);
  });

  it('네트워크 오류와 5xx는 retry이고 큐는 그대로 남는다', async () => {
    const { db, server, engine, queueIds } = await setup();
    await saveSlot(db, slot(0));
    server.use(async () => {
      throw new Error('offline');
    });
    expect((await engine.requestSync()).status).toBe('retry');
    server.use(async () => ({ status: 503 }));
    expect((await engine.requestSync()).status).toBe('retry');
    expect(await queueIds()).toEqual([1]);
  });

  it('같은 이벤트 id는 한 번만 큐에 들어간다', async () => {
    const { db, queueIds } = await setup();
    const event = { id: '0b8c6f3e-7d7a-4d1e-9f1a-1d2c3b4a5e6f', type: 'feedback' as const, ts: '2026-10-21T00:00:00.000Z', props: { screen: 'today' } };
    await logEvent(db, event);
    await logEvent(db, event);
    expect(await queueIds()).toHaveLength(1);
  });

  it('재시도 간격은 5초에서 두 배씩 늘고 10분에서 멈춘다', () => {
    expect([1, 2, 3, 10, 20].map(backoffMs)).toEqual([5_000, 10_000, 20_000, 600_000, 600_000]);
  });
});
