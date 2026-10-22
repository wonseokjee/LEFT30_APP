import * as SQLite from 'expo-sqlite';
import type { Db, SqlValue } from './types';

export const DB_NAME = 'left30.db';

function wrap(raw: SQLite.SQLiteDatabase): Db {
  const db: Db = {
    exec: (sql) => raw.execAsync(sql),
    run: async (sql, params: SqlValue[] = []) => {
      const r = await raw.runAsync(sql, params);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    all: (sql, params: SqlValue[] = []) => raw.getAllAsync(sql, params),
    first: (sql, params: SqlValue[] = []) => raw.getFirstAsync(sql, params),
    // 배타 트랜잭션: 바깥에서 동시에 실행되는 쿼리가 섞여 들어오지 않는다.
    transaction: async (fn) => {
      let result: Awaited<ReturnType<typeof fn>> | undefined;
      await raw.withExclusiveTransactionAsync(async (txn) => {
        result = await fn(wrap(txn));
      });
      return result as Awaited<ReturnType<typeof fn>>;
    },
  };
  return db;
}

export async function openAppDb(): Promise<Db> {
  return wrap(await SQLite.openDatabaseAsync(DB_NAME));
}
