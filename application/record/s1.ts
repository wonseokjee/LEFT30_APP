import type { EventRow } from '@/db/types';
import { localParts } from '@/lib/localTime';

/*
 * S1-COUNT(CEO 리뷰 D16): 하루 중 답한 행동이 있었던 서로 다른 30분 시간대 수. 3곳 이상이면 그날은 통과.
 * 답한 행동 = 알림 답(ping_answered), 블록 시작, 블록 끝 답(답 없음 제외), 묶어서 채우기(따로 채울게요 제외),
 * Todo 계획 블록 저장. 분석(서버 이벤트)과 앱 테스트에서 같은 규칙으로 센다.
 */

export const S1_DAILY_MIN = 3;

export function isAnswerAction(e: Pick<EventRow, 'type' | 'props'>): boolean {
  const props = (e.props ?? {}) as Record<string, unknown>;
  switch (e.type) {
    case 'ping_answered':
    case 'block_started':
    case 'plan_block_set':
      return true;
    case 'block_ended':
      return props.how !== 'no_answer';
    case 'batch_filled':
      return props.deferred !== true;
    default:
      return false;
  }
}

// 그 현지 날짜에 답한 30분 시간대 수.
export function answeredPeriods(events: Pick<EventRow, 'type' | 'ts' | 'props'>[], date: string, tz: string): number {
  const periods = new Set<number>();
  for (const e of events) {
    if (!isAnswerAction(e)) continue;
    const p = localParts(new Date(e.ts), tz);
    if (p.date === date) periods.add(Math.floor(p.minuteOfDay / 30));
  }
  return periods.size;
}
