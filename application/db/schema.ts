import type { Db } from './types';

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
];
