import * as SQLite from 'expo-sqlite';
import type { SqlValue } from './types';
import { serialDb } from './serial';

export const DB_NAME = 'left30.db';

// 연결 하나만 쓴다. 트랜잭션과 다른 호출의 순서는 serialDb가 맞춘다.
export async function openAppDb() {
  const raw = await SQLite.openDatabaseAsync(DB_NAME);
  // v3 표의 REFERENCES(항목·기록·멈춤)를 지키게 한다. 연결마다 켜야 하고 트랜잭션 안에서는 바뀌지 않는다.
  await raw.execAsync('PRAGMA foreign_keys = ON');
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
