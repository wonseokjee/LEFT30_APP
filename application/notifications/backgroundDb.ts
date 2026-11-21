import type { Db } from '@/db/types';
import { openAppDb } from '@/db/expoDb';
import { initDb } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { getRuntime } from '@/runtime/appRuntime';

/*
 * 백그라운드 작업(알림 버튼)용 DB. 앱이 떠 있으면 같은 JS에서 돌므로 앱의 런타임을 쓰고(liveRuntime),
 * 앱이 꺼져 있을 때만 따로 연다.
 */
let dbPromise: Promise<Db> | null = null;
export function backgroundDb(): Promise<Db> {
  dbPromise ??= (async () => {
    const db = await openAppDb();
    const r = await initDb(db, MIGRATIONS);
    if (!r.ok) throw new Error('db init failed');
    return db;
  })();
  return dbPromise;
}

export function liveRuntime() {
  try {
    return getRuntime();
  } catch {
    return null;
  }
}
