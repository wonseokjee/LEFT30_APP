import { openNodeDb } from '@/test/nodeDb';
import { initDb, LocalMigrationError, migrate } from './migrate';
import { MIGRATIONS, type Migration } from './schema';
import { blocksBetween, saveBlock, saveSlot, wipeLocalData } from './records';
import { SYSTEM_ITEMS, type BlockRow, type SlotRow } from './types';

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

  it('실제 v1 → v2: 보내지 못한 큐와 순번을 그대로 이어 받고, block 큐를 받을 수 있다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS.filter((m) => m.version === 1));
    await saveSlot(db, slot);
    await saveSlot(db, { ...slot, slot_start: '2026-10-21T00:30:00.000Z' });
    // 첫 항목은 이미 보냈다고 치고 지운다. 순번(2)은 남아야 한다.
    await db.run('DELETE FROM sync_queue WHERE id = 1');

    expect(await migrate(db, MIGRATIONS)).toEqual({ from: 1, to: MIGRATIONS.length });
    expect(await db.all('SELECT id, kind FROM sync_queue')).toEqual([{ id: 2, kind: 'slot' }]);

    await saveBlock(db, {
      id: 'b1',
      kind: 'focus',
      category: 'work',
      title: null,
      start_at: '2026-10-21T01:00:00.000Z',
      end_at: '2026-10-21T03:00:00.000Z',
      tz: 'Asia/Seoul',
      state: 'active',
      ended_how: null,
      deleted: false,
      client_updated_at: '2026-10-21T01:00:00.000Z',
    });
    expect(await db.all('SELECT id, kind FROM sync_queue ORDER BY id')).toEqual([
      { id: 2, kind: 'slot' },
      { id: 3, kind: 'block' },
    ]);
    expect(await blocksBetween(db, '2026-10-21T00:00:00.000Z', '2026-10-22T00:00:00.000Z')).toHaveLength(1);
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

describe('v3: 항목·기록·멈춤·목표 표(eng 리뷰 2 R7, eng 리뷰 3 R8·R14)', () => {
  const upTo = (v: number) => MIGRATIONS.filter((m) => m.version <= v);
  const ms = (iso: string) => Date.parse(iso);
  const T = (hhmm: string) => `2026-11-18T${hhmm}:00.000Z`;
  const block = (patch: Partial<BlockRow>): BlockRow => ({
    id: 'b1',
    kind: 'focus',
    category: 'work',
    title: null,
    start_at: T('01:00'),
    end_at: T('03:00'),
    tz: 'Asia/Seoul',
    state: 'active',
    ended_how: null,
    deleted: false,
    client_updated_at: T('01:00'),
    ...patch,
  });
  const at = (start: string, patch: Partial<SlotRow> = {}): SlotRow => ({
    ...slot,
    slot_start: start,
    client_updated_at: start,
    ...patch,
  });
  type E = { item_id: string; how: string; start_at: number; end_at: number | null; planned_end_at: number | null };

  it('기본 항목 여섯 개를 넣고, 옛 휴식·관계·수면은 숨긴다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    const expected = SYSTEM_ITEMS.map((i) => ({ id: i.id, parent_id: null, name: i.name, hidden: i.hidden ? 1 : 0 }));
    expected.sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(await db.all('SELECT id, parent_id, name, hidden FROM item ORDER BY id')).toEqual(expected);
  });

  it('slot은 30분 기록이 되고 업무·자기개발은 집중으로, 출처는 how로 옮겨진다', async () => {
    const db = openNodeDb();
    await migrate(db, upTo(2));
    await saveSlot(db, at(T('00:00'), { category: 'work', source: 'answered' }));
    await saveSlot(db, at(T('00:30'), { category: 'self_dev', source: 'continued' }));
    await saveSlot(db, at(T('01:00'), { category: 'exercise', source: 'late', note: '산책' }));
    await saveSlot(db, at(T('01:30'), { category: 'sleep', source: 'inferred' }));

    await migrate(db, MIGRATIONS);
    const rows = await db.all<E & { note: string | null; id: string }>(
      'SELECT id, item_id, how, start_at, end_at, planned_end_at, note FROM entry ORDER BY start_at',
    );
    expect(rows.map(({ id: _id, ...r }) => r)).toEqual([
      { item_id: 'focus', how: 'answered', start_at: ms(T('00:00')), end_at: ms(T('00:30')), planned_end_at: null, note: null },
      { item_id: 'focus', how: 'continued', start_at: ms(T('00:30')), end_at: ms(T('01:00')), planned_end_at: null, note: null },
      { item_id: 'exercise', how: 'late', start_at: ms(T('01:00')), end_at: ms(T('01:30')), planned_end_at: null, note: '산책' },
      { item_id: 'sleep', how: 'inferred', start_at: ms(T('01:30')), end_at: ms(T('02:00')), planned_end_at: null, note: null },
    ]);
    // 분 합계가 같다(4칸 × 30분)
    const total = rows.reduce((sum, r) => sum + (r.end_at! - r.start_at), 0);
    expect(total).toBe(4 * 30 * 60_000);
    // id는 uuid v7이고 시작 시각을 담는다
    expect(parseInt(rows[0].id.replace(/-/g, '').slice(0, 12), 16)).toBe(ms(T('00:00')));
    // 옛 slot은 지우지 않는다(W2까지)
    expect(await db.all('SELECT slot_start FROM slot')).toHaveLength(4);
  });

  it('진행 중 집중 블록은 진행 중 타이머 기록이 되고, 그 블록의 declared 칸은 옮기지 않는다', async () => {
    const db = openNodeDb();
    await migrate(db, upTo(2));
    await saveBlock(db, block({}));
    await saveSlot(db, at(T('00:30'), { category: 'work', source: 'answered' })); // 블록 앞
    await saveSlot(db, at(T('01:00'), { category: 'work', source: 'declared' })); // 블록 안, 앱 열 때 채움
    await saveSlot(db, at(T('01:30'), { category: 'work', source: 'declared' }));

    await migrate(db, MIGRATIONS);
    expect(
      await db.all<E>('SELECT item_id, how, start_at, end_at, planned_end_at FROM entry ORDER BY start_at'),
    ).toEqual([
      { item_id: 'focus', how: 'answered', start_at: ms(T('00:30')), end_at: ms(T('01:00')), planned_end_at: null },
      { item_id: 'focus', how: 'timer', start_at: ms(T('01:00')), end_at: null, planned_end_at: ms(T('03:00')) },
    ]);
  });

  it('끝난 집중 블록과 계획 블록은 옮기지 않는다(끝난 칸은 이미 slot에 있음)', async () => {
    const db = openNodeDb();
    await migrate(db, upTo(2));
    await saveBlock(db, block({ state: 'ended', ended_how: 'answer' }));
    await saveBlock(db, block({ id: 'p1', kind: 'plan', state: 'active' }));
    await saveSlot(db, at(T('01:00'), { category: 'work', source: 'declared' }));

    await migrate(db, MIGRATIONS);
    expect(await db.all('SELECT how FROM entry')).toEqual([{ how: 'declared' }]);
  });

  it('진행 중 기록은 동시에 하나만 허락한다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    const insert = (id: string) =>
      db.run(
        `INSERT INTO entry (id, item_id, how, start_at, end_at, planned_end_at, tz, note, deleted, updated_at)
         VALUES (?, 'focus', 'stopwatch', 1, NULL, NULL, 'Asia/Seoul', NULL, 0, 1)`,
        [id],
      );
    await insert('e1');
    await expect(insert('e2')).rejects.toThrow(/UNIQUE/);
  });

  it('STRICT와 외래 키: 글자 시각·없는 항목은 거절하고, 기록을 지우면 멈춤도 지워진다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    const insert = (item: string, start: string | number) =>
      db.run(
        `INSERT INTO entry (id, item_id, how, start_at, end_at, planned_end_at, tz, note, deleted, updated_at)
         VALUES ('e1', ?, 'answered', ?, 2, NULL, 'Asia/Seoul', NULL, 0, 1)`,
        [item, start],
      );
    await expect(insert('focus', '2026-11-18T00:00:00.000Z')).rejects.toThrow(/cannot store TEXT/);
    await expect(insert('nope', 1)).rejects.toThrow(/FOREIGN KEY/);
    await insert('focus', 1);
    await db.run('INSERT INTO pause (entry_id, start_at, end_at) VALUES (?, ?, ?)', ['e1', 1, 2]);
    await db.run("DELETE FROM entry WHERE id = 'e1'");
    expect(await db.all('SELECT * FROM pause')).toEqual([]);
  });

  it('목표 표는 날짜 + 항목이 열쇠이고 순서 칸이 있다(R8)', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    const add = (item: string, position: number) =>
      db.run('INSERT INTO plan_v3 (local_date, item_id, target_minutes, position, updated_at) VALUES (?, ?, 60, ?, 1)', [
        '2026-11-18',
        item,
        position,
      ]);
    await add('exercise', 1);
    await add('focus', 0);
    await expect(add('focus', 2)).rejects.toThrow(/UNIQUE/);
    expect(await db.all('SELECT item_id FROM plan_v3 ORDER BY position')).toEqual([
      { item_id: 'focus' },
      { item_id: 'exercise' },
    ]);
  });

  it('옮기다 실패하면 v3 전체가 롤백되고 slot은 그대로다', async () => {
    const db = openNodeDb();
    await migrate(db, upTo(2));
    await saveSlot(db, at(T('00:00')));
    await db.run("UPDATE slot SET category = 'bogus'"); // 알 수 없는 카테고리 → item_id NULL
    await expect(migrate(db, MIGRATIONS)).rejects.toBeInstanceOf(LocalMigrationError);
    expect(await version(db)).toBe(2);
    const tables = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
    expect(tables.map((t) => t.name)).not.toContain('entry');
    expect(await db.all('SELECT category FROM slot')).toEqual([{ category: 'bogus' }]);
  });

  it('회원탈퇴 지우기는 기록·목표·사용자 항목을 지우고 기본 항목은 남긴다', async () => {
    const db = openNodeDb();
    await migrate(db, upTo(2));
    await saveSlot(db, at(T('00:00')));
    await migrate(db, MIGRATIONS);
    await db.run("INSERT INTO item (id, parent_id, name, hidden, updated_at) VALUES ('u1', 'focus', '영어', 0, 1)");
    await wipeLocalData(db);
    expect(await db.all('SELECT * FROM entry')).toEqual([]);
    expect(await db.all('SELECT id FROM item')).toHaveLength(SYSTEM_ITEMS.length);
  });
});
