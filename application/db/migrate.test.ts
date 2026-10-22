import { openNodeDb } from '@/test/nodeDb';
import { initDb, LocalMigrationError, migrate } from './migrate';
import { MIGRATIONS, type Migration } from './schema';
import { saveSlot } from './records';

const version = async (db: ReturnType<typeof openNodeDb>) =>
  (await db.first<{ user_version: number }>('PRAGMA user_version'))!.user_version;

const slot = {
  slot_start: '2026-10-21T00:00:00.000Z',
  tz: 'Asia/Seoul',
  category: 'work' as const,
  note: null,
  source: 'answered' as const,
  answered_at: '2026-10-21T00:31:00.000Z',
  client_updated_at: '2026-10-21T00:31:00.000Z',
};

describe('로컬 SQLite 마이그레이션(R1)', () => {
  it('버전은 1부터 빈틈없이 이어진다', () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
  });

  it('새 DB는 최신 버전까지 올라가고, 다시 실행하면 아무것도 하지 않는다', async () => {
    const db = openNodeDb();
    expect(await migrate(db, MIGRATIONS)).toEqual({ from: 0, to: MIGRATIONS.length });
    expect(await version(db)).toBe(MIGRATIONS.length);
    expect(await migrate(db, MIGRATIONS)).toEqual({ from: MIGRATIONS.length, to: MIGRATIONS.length });
  });

  it('v1 데이터를 가진 DB가 v2로 올라가도 데이터가 남는다', async () => {
    const db = openNodeDb();
    const v1 = MIGRATIONS.filter((m) => m.version === 1);
    await migrate(db, v1);
    await saveSlot(db, slot);

    const v2: Migration = {
      version: 2,
      up: (tx) => tx.exec("ALTER TABLE slot ADD COLUMN mood TEXT NOT NULL DEFAULT 'none'"),
    };
    expect(await migrate(db, [...v1, v2])).toEqual({ from: 1, to: 2 });
    expect(await db.all('SELECT slot_start, category, mood FROM slot')).toEqual([
      { slot_start: slot.slot_start, category: 'work', mood: 'none' },
    ]);
  });

  it('실패한 버전은 통째로 롤백되고 데이터와 버전은 그대로다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    await saveSlot(db, slot);
    const before = await version(db);

    const broken: Migration = {
      version: before + 1,
      up: async (tx) => {
        await tx.exec('ALTER TABLE slot ADD COLUMN half_done TEXT');
        await tx.exec('THIS IS NOT SQL');
      },
    };
    await expect(migrate(db, [...MIGRATIONS, broken])).rejects.toBeInstanceOf(LocalMigrationError);
    expect(await version(db)).toBe(before);
    const columns = await db.all<{ name: string }>('PRAGMA table_info(slot)');
    expect(columns.map((c) => c.name)).not.toContain('half_done');
    expect(await db.all('SELECT category FROM slot')).toEqual([{ category: 'work' }]);
  });

  it('initDb는 실패를 돌려주고 local_migration_failed를 큐에 남긴다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    const broken: Migration = {
      version: MIGRATIONS.length + 1,
      up: (tx) => tx.exec('THIS IS NOT SQL'),
    };
    const result = await initDb(db, [...MIGRATIONS, broken]);
    expect(result.ok).toBe(false);

    const queued = await db.all<{ kind: string; payload: string }>('SELECT kind, payload FROM sync_queue');
    expect(queued).toHaveLength(1);
    expect(queued[0].kind).toBe('event');
    expect(JSON.parse(queued[0].payload)).toMatchObject({
      type: 'local_migration_failed',
      props: { from: MIGRATIONS.length, failed: MIGRATIONS.length + 1 },
    });
  });
});
