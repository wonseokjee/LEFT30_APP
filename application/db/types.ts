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

/*
 * v3 저장 구조(타이머 개편 eng 리뷰 2 R7, eng 리뷰 3 R8·R14). 시각은 모두 UTC 밀리초 정수.
 * 카테고리와 세부 항목은 item 한 표: 카테고리는 parent_id가 NULL, 세부 항목은 카테고리 id를 가리킨다.
 */
export const SYSTEM_ITEMS = [
  { id: 'focus', name: '집중', hidden: false },
  { id: 'exercise', name: '운동', hidden: false },
  { id: 'other', name: '기타', hidden: false },
  { id: 'rest', name: '휴식', hidden: true },
  { id: 'relationship', name: '관계', hidden: true },
  { id: 'sleep', name: '수면', hidden: true },
] as const;
export type SystemItemId = (typeof SYSTEM_ITEMS)[number]['id'];

// 옛 slot·plan 카테고리 → 기본 항목. 업무·자기개발은 집중으로 합친다(CEO 리뷰 2 D4b).
export const CATEGORY_ITEM: Record<Category, SystemItemId> = {
  work: 'focus',
  self_dev: 'focus',
  exercise: 'exercise',
  rest: 'rest',
  relationship: 'relationship',
  sleep: 'sleep',
};

export type ItemRow = {
  id: string; // 기본 항목은 SystemItemId, 사용자 항목은 uuid v7
  parent_id: string | null;
  name: string;
  hidden: number; // 0 | 1
  updated_at: number;
};

// 기록 방식: 옛 출처 값 + 타이머 방식(eng 리뷰 3 R14). inferred는 옛 자료에만 있다.
export const TIMER_HOWS = ['stopwatch', 'pomodoro', 'timer'] as const;
export type TimerKind = (typeof TIMER_HOWS)[number];
export type EntryHow = SlotSource | TimerKind;

export type EntryRow = {
  id: string; // uuid v7
  item_id: string;
  how: EntryHow;
  start_at: number;
  end_at: number | null; // null = 진행 중(동시에 하나)
  planned_end_at: number | null; // 타이머만
  tz: string;
  note: string | null;
  deleted: number; // 0 | 1
  updated_at: number;
};

export type PauseRow = { entry_id: string; start_at: number; end_at: number | null };

// 뽀모도로 세션의 구간 설정(v4). 한 바퀴 = 집중 + 휴식, 마지막 바퀴도 휴식까지.
export type PomodoroRow = { entry_id: string; focus_min: number; break_min: number; rounds: number };

export type GoalRow = {
  local_date: string; // YYYY-MM-DD
  item_id: string;
  target_minutes: number;
  position: number;
  updated_at: number;
};

export type EventRow = {
  id: string;
  type: EventType;
  ts: string;
  props: Record<string, unknown> | null;
};
