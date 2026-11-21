import type { QueueKind } from '@/db/records';

/*
 * 지금 서버가 받는 값(T6, eng 발견 1, CEO SYNC D11).
 *
 * 앱 타입(db/types.ts)과 따로 둔다. 앱에 새 값(집중·기타 카테고리, 새 이벤트)을 먼저 더해도
 * 이 목록은 서버가 바뀔 때(W2)만 바꾼다. 목록에 없는 값을 가진 큐 항목은 보내지 않고 큐에 남겨,
 * 서버가 거절해 dead letter로 사라지는 일을 막는다. 서버를 고친 뒤 목록을 늘리면 그때 올라간다.
 * 서버 원본: server/src/Entity/*.entity.ts (serverKnown.test.ts가 같은지 본다).
 */
export const SERVER_KNOWN = {
  categories: ['sleep', 'rest', 'exercise', 'relationship', 'self_dev', 'work'],
  slotSources: ['answered', 'continued', 'late', 'inferred', 'declared', 'batch'],
  blockKinds: ['focus', 'plan'],
  blockStates: ['planned', 'active', 'awaiting', 'ended', 'cancelled'],
  blockEndHows: ['answer', 'extend', 'end_now', 'no_answer', 'checked'],
  eventTypes: [
    'ping_scheduled',
    'ping_displayed',
    'ping_answered',
    'perm_state',
    'plan_set',
    'plan_vs_actual_viewed',
    'evening_summary_tapped',
    'feedback',
    'schedule_extended',
    'schedule_coverage',
    'sync_rejected',
    'local_migration_failed',
    'pause_set',
    'block_started',
    'block_ended',
    'batch_filled',
    'plan_block_set',
  ],
} as const;

type Lists = { [K in keyof typeof SERVER_KNOWN]: readonly string[] };

// 큐 항목의 값 칸이 서버 목록 안에 있는지. 형식 검사(시각·길이)는 서버에 맡긴다.
export function serverKnows(kind: QueueKind, payload: Record<string, unknown>, known: Lists = SERVER_KNOWN): boolean {
  const has = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v);
  switch (kind) {
    case 'slot':
      return has(known.categories, payload.category) && has(known.slotSources, payload.source);
    case 'plan':
      return has(known.categories, payload.category);
    case 'block':
      return (
        has(known.blockKinds, payload.kind) &&
        has(known.categories, payload.category) &&
        has(known.blockStates, payload.state) &&
        (payload.ended_how == null || has(known.blockEndHows, payload.ended_how))
      );
    case 'event':
      return has(known.eventTypes, payload.type);
  }
}
