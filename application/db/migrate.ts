import type { Db } from './types';
import type { Migration } from './schema';
import { logEvent } from './records';
import { uuidv4 } from '@/lib/uuid';

export class LocalMigrationError extends Error {
  constructor(
    readonly fromVersion: number,
    readonly failedVersion: number,
    readonly cause: unknown,
  ) {
    super(`local migration v${failedVersion} failed: ${String(cause)}`);
  }
}

// PRAGMA user_version보다 높은 마이그레이션을 버전 순서대로 하나씩 트랜잭션으로 실행한다(R1).
// 실패하면 그 버전만 롤백되고 데이터는 지우지 않는다.
export async function migrate(
  db: Db,
  migrations: Migration[],
): Promise<{ from: number; to: number }> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  let current = from;
  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  for (const m of ordered) {
    if (m.version <= current) continue;
    try {
      await db.transaction(async (tx) => {
        await m.up(tx);
        await tx.exec(`PRAGMA user_version = ${m.version}`);
      });
    } catch (e) {
      throw new LocalMigrationError(current, m.version, e);
    }
    current = m.version;
  }
  return { from, to: current };
}

export type InitResult =
  | { ok: true; from: number; to: number }
  | { ok: false; error: LocalMigrationError };

// 앱 시작 시 호출한다. 실패하면 화면은 "업데이트 중 문제가 생겼어요"를 띄운다.
// local_migration_failed는 큐에 넣어 두고 다음에 보낸다. 큐 테이블이 아직 없으면(v0 실패) 남기지 못한다.
export async function initDb(db: Db, migrations: Migration[]): Promise<InitResult> {
  try {
    return { ok: true, ...(await migrate(db, migrations)) };
  } catch (e) {
    if (!(e instanceof LocalMigrationError)) throw e;
    try {
      await logEvent(db, {
        id: uuidv4(),
        type: 'local_migration_failed',
        ts: new Date().toISOString(),
        props: {
          from: e.fromVersion,
          failed: e.failedVersion,
          message: String(e.cause).slice(0, 300),
        },
      });
    } catch {
      // 기록 실패는 무시한다. 오류 화면이 우선이다.
    }
    return { ok: false, error: e };
  }
}
