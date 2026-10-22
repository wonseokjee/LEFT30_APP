// 테스트용 Db 구현. Node 내장 node:sqlite로 실제 SQLite를 쓴다(의존성 추가 없음).
import type { Db, SqlValue } from '@/db/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

type Raw = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...p: SqlValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...p: SqlValue[]): object[];
    get(...p: SqlValue[]): object | undefined;
  };
  close(): void;
};

function queries(raw: Raw): Omit<Db, 'transaction'> {
  return {
    exec: async (sql) => raw.exec(sql),
    run: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    all: async <T,>(sql: string, params: SqlValue[] = []) =>
      raw.prepare(sql).all(...params).map((row) => ({ ...row }) as T),
    first: async <T,>(sql: string, params: SqlValue[] = []) => {
      const row = raw.prepare(sql).get(...params);
      return row ? ({ ...row } as T) : null;
    },
  };
}

// expo-sqlite의 배타 트랜잭션처럼, 트랜잭션 중에는 바깥 쿼리가 끝날 때까지 기다린다.
export function openNodeDb(path = ':memory:'): Db & { close(): void; raw: Raw } {
  const raw: Raw = new DatabaseSync(path);
  const q = queries(raw);
  let lock: Promise<void> = Promise.resolve();

  const withLock = <T,>(fn: () => Promise<T>): Promise<T> => {
    const run = lock.then(fn);
    lock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const txDb: Db = {
    ...q,
    transaction: () => Promise.reject(new Error('nested transaction')),
  };

  return {
    exec: (sql) => withLock(() => q.exec(sql)),
    run: (sql, p) => withLock(() => q.run(sql, p)),
    all: (sql, p) => withLock(() => q.all(sql, p)),
    first: (sql, p) => withLock(() => q.first(sql, p)),
    transaction: (fn) =>
      withLock(async () => {
        raw.exec('BEGIN');
        try {
          const result = await fn(txDb);
          raw.exec('COMMIT');
          return result;
        } catch (e) {
          raw.exec('ROLLBACK');
          throw e;
        }
      }),
    close: () => raw.close(),
    raw,
  };
}
