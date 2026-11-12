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
  // 같은 연결의 트랜잭션. 끝날 때까지 다른 호출은 기다린다(db/serial.ts). 안의 쿼리는 반드시 tx로 실행한다.
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

// declared: 집중 블록 칸, 계획 블록 끝에서 확인한 칸. batch: 놓친 칸 묶어서 채우기.
export type SlotSource = 'answered' | 'continued' | 'late' | 'inferred' | 'declared' | 'batch';

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
  | 'local_migration_failed'
  | 'pause_set'
  | 'block_started'
  | 'block_ended'
  | 'batch_filled'
  | 'plan_block_set';

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

// 서버 block.entity와 같다. 상태 기계는 server/src/Entity/block.entity.ts 참고.
export type BlockKind = 'focus' | 'plan';
export type BlockState = 'planned' | 'active' | 'awaiting' | 'ended' | 'cancelled';
export type BlockEndHow = 'answer' | 'extend' | 'end_now' | 'no_answer' | 'checked';

export type BlockRow = {
  id: string;
  kind: BlockKind;
  category: Category;
  title: string | null;
  start_at: string; // UTC ISO
  end_at: string; // UTC ISO
  tz: string;
  state: BlockState;
  ended_how: BlockEndHow | null;
  deleted: boolean;
  client_updated_at: string;
};

export type EventRow = {
  id: string;
  type: EventType;
  ts: string;
  props: Record<string, unknown> | null;
};
