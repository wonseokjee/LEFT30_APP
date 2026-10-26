import { serialDb, type RawQueries } from './serial';
import { openNodeDb } from '@/test/nodeDb';
import { migrate } from './migrate';
import { MIGRATIONS } from './schema';
import { saveSlot } from './records';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

// 실행한 SQL을 순서대로 남기는 가짜 연결
function fakeRaw() {
  const log: string[] = [];
  const raw: RawQueries = {
    exec: async (sql) => {
      log.push(sql);
    },
    run: async (sql) => {
      log.push(sql);
      return { changes: 1, lastInsertRowId: 0 };
    },
    all: async (sql) => {
      log.push(sql);
      return [];
    },
    first: async (sql) => {
      log.push(sql);
      return null;
    },
  };
  return { raw, log };
}

describe('serialDb (D2)', () => {
  it('트랜잭션 도중 들어온 바깥 쓰기는 COMMIT 뒤에 실행된다', async () => {
    const { raw, log } = fakeRaw();
    const db = serialDb(raw);
    const gate = deferred();

    const tx = db.transaction(async (t) => {
      await t.run('TX WRITE 1');
      await gate.promise;
      await t.run('TX WRITE 2');
    });
    // 트랜잭션이 멈춰 있는 동안 다른 곳(예: 스케줄러)이 쓴다
    await Promise.resolve();
    const outside = db.run('OUTSIDE WRITE');
    await Promise.resolve();
    gate.resolve();
    await Promise.all([tx, outside]);

    expect(log).toEqual(['BEGIN', 'TX WRITE 1', 'TX WRITE 2', 'COMMIT', 'OUTSIDE WRITE']);
  });

  it('트랜잭션이 실패하면 ROLLBACK하고, 줄이 막히지 않아 다음 호출이 실행된다', async () => {
    const { raw, log } = fakeRaw();
    const db = serialDb(raw);

    await expect(
      db.transaction(async (t) => {
        await t.run('TX WRITE');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await db.run('AFTER');

    expect(log).toEqual(['BEGIN', 'TX WRITE', 'ROLLBACK', 'AFTER']);
  });

  it('트랜잭션 안에서 다시 트랜잭션을 열면 거절한다', async () => {
    const { raw } = fakeRaw();
    const db = serialDb(raw);
    await expect(db.transaction((t) => t.transaction(async () => undefined))).rejects.toThrow(
      'nested transaction',
    );
  });

  it('실제 SQLite에서 기록 저장과 알림 예약 기록을 동시에 써도 둘 다 남는다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    const writes = Array.from({ length: 20 }, (_, i) =>
      db.run(
        `INSERT INTO scheduled_slot (slot_start, notification_id, scheduled_at, text_kind)
         VALUES (?, ?, ?, 'default')`,
        [`2026-10-21T${String(i).padStart(2, '0')}:00:00.000Z`, `slot:${i}`, '2026-10-21T00:00:00.000Z'],
      ),
    );
    const save = saveSlot(db, {
      slot_start: '2026-10-21T00:30:00.000Z',
      tz: 'Asia/Seoul',
      category: 'work',
      note: null,
      source: 'answered',
      answered_at: '2026-10-21T01:00:00.000Z',
      client_updated_at: '2026-10-21T01:00:00.000Z',
    });
    await Promise.all([...writes, save]);

    expect((await db.first<{ n: number }>('SELECT count(*) AS n FROM scheduled_slot'))!.n).toBe(20);
    expect((await db.first<{ n: number }>('SELECT count(*) AS n FROM slot'))!.n).toBe(1);
    expect((await db.first<{ n: number }>('SELECT count(*) AS n FROM sync_queue'))!.n).toBe(1);
  });
});
