import * as SQLite from 'expo-sqlite';
import type { SqlValue } from './types';
import { serialDb } from './serial';

export const DB_NAME = 'left30.db';

// 연결 하나만 쓴다. 트랜잭션과 다른 호출의 순서는 serialDb가 맞춘다.
export async function openAppDb() {
  const raw = await SQLite.openDatabaseAsync(DB_NAME);
  return serialDb({
    exec: (sql) => raw.execAsync(sql),
    run: async (sql, params: SqlValue[] = []) => {
      const r = await raw.runAsync(sql, params);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    all: (sql, params: SqlValue[] = []) => raw.getAllAsync(sql, params),
    first: (sql, params: SqlValue[] = []) => raw.getFirstAsync(sql, params),
  });
}
