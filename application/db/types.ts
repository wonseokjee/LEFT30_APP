// 앱 로직이 쓰는 SQLite 최소 인터페이스.
// 앱은 expo-sqlite(expoDb.ts), 테스트는 node:sqlite(test/nodeDb.ts)로 구현한다.

export type SqlValue = string | number | null;

export interface Db {
  exec(sql: string): Promise<void>;
  run(
    sql: string,
    params?: SqlValue[],
  ): Promise<{ changes: number; lastInsertRowId: number }>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  // 배타 트랜잭션. 안의 쿼리는 반드시 tx로 실행한다.
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export const CATEGORIES = [
  'sleep',
  'rest',
  'exercise',
  'relationship',
  'self_dev',
  'work',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  sleep: '수면',
  rest: '휴식',
  exercise: '운동',
  relationship: '관계',
  self_dev: '자기개발',
  work: '업무',
};

export type SlotSource = 'answered' | 'continued' | 'late' | 'inferred';

// 서버 event.entity의 EVENT_TYPES와 같다.
export type EventType =
  | 'ping_scheduled'
  | 'ping_displayed'
  | 'ping_answered'
  | 'perm_state'
  | 'plan_set'
  | 'plan_vs_actual_viewed'
  | 'evening_summary_tapped'
  | 'feedback'
  | 'schedule_extended'
  | 'schedule_coverage'
  | 'sync_rejected'
  | 'local_migration_failed';

export type SlotRow = {
  slot_start: string; // UTC ISO (toISOString)
  tz: string;
  category: Category;
  note: string | null;
  source: SlotSource;
  answered_at: string | null;
  client_updated_at: string;
};

export type PlanRow = {
  local_date: string;
  category: Category;
  target_minutes: number;
  client_updated_at: string;
};

export type EventRow = {
  id: string;
  type: EventType;
  ts: string;
  props: Record<string, unknown> | null;
};
