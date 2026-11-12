import type { Category, Db, SlotRow } from '@/db/types';
import { saveSlot, tzAt } from '@/db/records';
import { logPingAnswered } from '@/scheduler/pingEvents';
import { sourceFor } from './recordLogic';

/*
 * 알림 버튼 [그대로 계속 · 카테고리](EXP-2 통과, docs/designs/left30-focus-block.md).
 * 앱을 열지 않고 백그라운드 작업에서 그 칸을 기록한다. 그사이 다른 길로 기록된 칸은 덮지 않는다.
 * 칸 종료 후 60분 안이면 continued, 지나면 late(기록 시트와 같은 규칙).
 */
export async function saveContinue(
  db: Db,
  params: { slotStart: string; category: Category; now: Date; fallbackTz: string },
): Promise<'saved' | 'exists'> {
  const { slotStart, category, now } = params;
  const existing = await db.first<SlotRow>('SELECT * FROM slot WHERE slot_start = ?', [slotStart]);
  if (existing) return 'exists';
  const at = now.toISOString();
  const row: SlotRow = {
    slot_start: slotStart,
    tz: await tzAt(db, new Date(slotStart), params.fallbackTz),
    category,
    note: null,
    source: sourceFor(slotStart, now, null, true),
    answered_at: at,
    client_updated_at: at,
  };
  await saveSlot(db, row);
  await logPingAnswered(db, slotStart, row.source, now);
  return 'saved';
}

// 백그라운드 작업이 받은 알림 데이터. Android는 data를 content.dataString(JSON 문자열)으로 준다(EXP-2 실측).
export function readPingData(content: { data?: unknown; dataString?: unknown } | undefined): Record<string, unknown> {
  if (content?.data && typeof content.data === 'object') return content.data as Record<string, unknown>;
  if (typeof content?.dataString === 'string') {
    try {
      const parsed: unknown = JSON.parse(content.dataString);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}
