import { SLOT_MS } from '@/lib/localTime';
import { uuidv7 } from '@/lib/uuid';
import { isoToMs } from './time';
import { CATEGORY_ITEM, SYSTEM_ITEMS, type BlockRow, type Db, type EntryRow, type SlotRow } from './types';

export type Migration = {
  version: number;
  up: (tx: Db) => Promise<void>;
};

// 로컬 SQLite 스키마(R1). 버전은 1부터 빈틈없이 올린다. 이미 배포한 버전은 고치지 않고 새 버전을 추가한다.
// slot·plan·event는 서버와 같은 구조(user_id 제외)이고, 나머지는 앱 전용이다.
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (tx) => {
      await tx.exec(`
        CREATE TABLE slot (
          slot_start TEXT PRIMARY KEY,
          tz TEXT NOT NULL,
          category TEXT NOT NULL,
          note TEXT,
          source TEXT NOT NULL,
          answered_at TEXT,
          client_updated_at TEXT NOT NULL
        );
        CREATE TABLE plan (
          local_date TEXT NOT NULL,
          category TEXT NOT NULL,
          target_minutes INTEGER NOT NULL,
          client_updated_at TEXT NOT NULL,
          PRIMARY KEY (local_date, category)
        );
        CREATE TABLE event (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          ts TEXT NOT NULL,
          props TEXT
        );
        CREATE TABLE scheduled_slot (
          slot_start TEXT PRIMARY KEY,
          notification_id TEXT NOT NULL,
          scheduled_at TEXT NOT NULL,
          text_kind TEXT NOT NULL
        );
        CREATE TABLE tz_change (
          at TEXT NOT NULL,
          tz TEXT NOT NULL
        );
        CREATE TABLE sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL CHECK (kind IN ('slot', 'plan', 'event')),
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE sync_dead_letter (
          queue_id INTEGER PRIMARY KEY,
          kind TEXT NOT NULL,
          payload TEXT NOT NULL,
          reason TEXT NOT NULL,
          rejected_at TEXT NOT NULL
        );
        CREATE TABLE setting (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    },
  },
  {
    // 집중 블록·계획 블록(docs/designs/left30-focus-block.md E1). 서버 block과 같은 구조(user_id 제외).
    // sync_queue의 kind CHECK에 'block'을 더하려면 SQLite는 표를 다시 만들어야 한다.
    // AUTOINCREMENT 순번을 이어 받아 qid와 dead-letter queue_id가 겹치지 않게 한다.
    version: 2,
    up: async (tx) => {
      await tx.exec(`
        CREATE TABLE block (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT,
          start_at TEXT NOT NULL,
          end_at TEXT NOT NULL,
          tz TEXT NOT NULL,
          state TEXT NOT NULL,
          ended_how TEXT,
          deleted INTEGER NOT NULL DEFAULT 0,
          client_updated_at TEXT NOT NULL
        );
        CREATE INDEX idx_block_start ON block (start_at);
        CREATE TABLE sync_queue_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL CHECK (kind IN ('slot', 'plan', 'event', 'block')),
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        INSERT INTO sync_queue_v2 (id, kind, payload, created_at)
          SELECT id, kind, payload, created_at FROM sync_queue;
        INSERT OR REPLACE INTO sqlite_sequence (name, seq)
          SELECT 'sync_queue_v2', seq FROM sqlite_sequence WHERE name = 'sync_queue';
        DROP TABLE sync_queue;
        ALTER TABLE sync_queue_v2 RENAME TO sync_queue;
      `);
    },
  },
  {
    // 타이머 개편 v3(docs/designs/left30-timer-modes.md eng 리뷰 2 R7, eng 리뷰 3 R8·R14).
    // 새 표는 STRICT, 시각은 UTC 밀리초. slot·plan·block은 W2까지 그대로 둔다(옛 표는 지우지 않음).
    // block을 item_id로 바꾸는 일은 할 일 화면 작업(T9)에서 한다(T1 범위 결정, 2026-11-18).
    version: 3,
    up: async (tx) => {
      await tx.exec(`
        CREATE TABLE item (
          id TEXT PRIMARY KEY,
          parent_id TEXT REFERENCES item(id),
          name TEXT NOT NULL,
          hidden INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        ) STRICT, WITHOUT ROWID;
        CREATE UNIQUE INDEX item_name ON item (IFNULL(parent_id, ''), name);

        CREATE TABLE entry (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL REFERENCES item(id),
          how TEXT NOT NULL,
          start_at INTEGER NOT NULL,
          end_at INTEGER,
          planned_end_at INTEGER,
          tz TEXT NOT NULL,
          note TEXT,
          deleted INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        ) STRICT;
        CREATE INDEX entry_start ON entry (start_at);
        CREATE UNIQUE INDEX entry_running ON entry ((1)) WHERE end_at IS NULL AND deleted = 0;

        CREATE TABLE pause (
          entry_id TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
          start_at INTEGER NOT NULL,
          end_at INTEGER,
          PRIMARY KEY (entry_id, start_at)
        ) STRICT, WITHOUT ROWID;

        CREATE TABLE plan_v3 (
          local_date TEXT NOT NULL,
          item_id TEXT NOT NULL REFERENCES item(id),
          target_minutes INTEGER NOT NULL,
          position INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (local_date, item_id)
        ) STRICT, WITHOUT ROWID;
      `);
      await migrateToV3(tx, Date.now());
    },
  },
];

const FOCUS_STATES_RUNNING = ['active', 'awaiting'];

// v3 데이터 옮기기. 옛 계획(plan)은 옮기지 않는다(CEO 리뷰 2 "옛 계획은 무시").
async function migrateToV3(tx: Db, now: number): Promise<void> {
  for (const it of SYSTEM_ITEMS) {
    await tx.run('INSERT INTO item (id, parent_id, name, hidden, updated_at) VALUES (?, NULL, ?, ?, ?)', [
      it.id,
      it.name,
      it.hidden ? 1 : 0,
      now,
    ]);
  }

  // 진행 중(또는 끝 시트를 기다리는) 집중 블록은 진행 중 타이머 기록 하나가 된다.
  // 그 블록이 앱을 열 때 미리 채운 declared 칸은 이 기록과 겹치므로 옮기지 않는다.
  const running = await tx.first<Omit<BlockRow, 'deleted'>>(
    `SELECT * FROM block WHERE kind = 'focus' AND deleted = 0 AND state IN (${FOCUS_STATES_RUNNING.map(() => '?').join(', ')})
     ORDER BY start_at DESC LIMIT 1`,
    FOCUS_STATES_RUNNING,
  );
  const runStart = running ? isoToMs(running.start_at) : 0;
  const runEnd = running ? isoToMs(running.end_at) : 0;
  const insideRunning = (s: SlotRow) =>
    running !== null &&
    s.source === 'declared' &&
    s.category === running.category &&
    isoToMs(s.slot_start) >= runStart &&
    isoToMs(s.slot_start) < runEnd;

  const slots = await tx.all<SlotRow>('SELECT * FROM slot ORDER BY slot_start');
  for (const s of slots) {
    if (insideRunning(s)) continue;
    const start = isoToMs(s.slot_start);
    await insertEntry(tx, {
      id: uuidv7(start),
      item_id: CATEGORY_ITEM[s.category],
      how: s.source,
      start_at: start,
      end_at: start + SLOT_MS,
      planned_end_at: null,
      tz: s.tz,
      note: s.note,
      deleted: 0,
      updated_at: isoToMs(s.client_updated_at),
    });
  }

  if (running) {
    await insertEntry(tx, {
      id: uuidv7(runStart),
      item_id: CATEGORY_ITEM[running.category],
      how: 'timer',
      start_at: runStart,
      end_at: null,
      planned_end_at: runEnd,
      tz: running.tz,
      note: null,
      deleted: 0,
      updated_at: now,
    });
  }
}

async function insertEntry(tx: Db, e: EntryRow): Promise<void> {
  await tx.run(
    `INSERT INTO entry (id, item_id, how, start_at, end_at, planned_end_at, tz, note, deleted, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [e.id, e.item_id, e.how, e.start_at, e.end_at, e.planned_end_at, e.tz, e.note, e.deleted, e.updated_at],
  );
}
