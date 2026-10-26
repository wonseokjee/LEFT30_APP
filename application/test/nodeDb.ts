// 테스트용 Db 구현. Node 내장 node:sqlite로 실제 SQLite를 쓴다(의존성 추가 없음).
import type { Db, SqlValue } from '@/db/types';
import { serialDb } from '@/db/serial';

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

// 앱(expoDb.ts)과 같은 직렬 래퍼를 씌운다.
export function openNodeDb(path = ':memory:'): Db & { close(): void; raw: Raw } {
  const raw: Raw = new DatabaseSync(path);
  return { ...serialDb(queries(raw)), close: () => raw.close(), raw };
}
