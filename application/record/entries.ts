import { deleteSlot, writeSlot } from '@/db/records';
import { isoToMs } from '@/db/time';
import { CATEGORY_ITEM, TIMER_HOWS, type Db, type SlotRow } from '@/db/types';
import { SLOT_MS } from '@/lib/localTime';
import { uuidv7 } from '@/lib/uuid';

/*
 * 기록 쓰기의 유일한 입구(타이머 개편 T2, docs/designs/left30-timer-modes.md Section 1).
 *
 *  알림 답·그대로 계속·묶어 채우기·집중 블록 칸·할 일 체크·메모
 *        │  SlotRow(30분 칸)
 *        ▼
 *  saveEntry ── 한 트랜잭션 ──┬─▶ entry: 칸 [start, start+30분)에서 타이머가 덮은 부분을 뺀 빈 조각만(OVERLAP D12)
 *                            └─▶ slot: 옛 칸에도 그대로(임시, 읽는 곳이 모두 entry로 옮기면 지움. 2026-11-19 사용자 "가")
 *
 * 같은 칸에 다시 쓰면(고치기·메모·되돌리기) 그 칸 안의 타이머가 아닌 기록을 지우고 새로 쓴다.
 * 타이머 기록(스톱워치·뽀모도로·타이머)은 지우지 않는다. 5분 이상 멈춘 구간(또는 지금 멈춤 중)은 타이머가 덮지 않은
 * 것으로 본다. 5분 미만 멈춤은 세션 덩어리 안이라 덮은 것으로 본다(PAUSE "5분 이상 틈은 알림 답으로 채울 수 있다").
 */

const TIMER_IN = TIMER_HOWS.map((h) => `'${h}'`).join(', ');
const GAP_MIN_MS = 5 * 60 * 1000;

type Span = [number, number];

// 여러 칸을 한 트랜잭션으로(놓친 칸 묶음이 일부만 써지지 않게).
export async function saveEntry(db: Db, slots: SlotRow[]): Promise<void> {
  if (slots.length === 0) return;
  await db.transaction(async (tx) => {
    for (const slot of slots) {
      await writeSlot(tx, slot);
      await putAnswer(tx, slot);
    }
  });
}

// 기록 직후 [되돌리기]. 저장 전 값이 있으면 그 값을 새 시각으로 다시 쓰고, 없던 칸이면 칸과 기록을 지운다.
export async function undoEntry(db: Db, saved: SlotRow, previous: SlotRow | null): Promise<void> {
  await db.transaction(async (tx) => {
    if (previous) {
      const restored = { ...previous, client_updated_at: new Date().toISOString() };
      await writeSlot(tx, restored);
      await putAnswer(tx, restored);
      return;
    }
    await deleteSlot(tx, saved.slot_start);
    const start = isoToMs(saved.slot_start);
    await clearAnswers(tx, start, start + SLOT_MS);
  });
}

async function clearAnswers(tx: Db, start: number, end: number): Promise<void> {
  await tx.run(
    `DELETE FROM entry WHERE start_at >= ? AND end_at IS NOT NULL AND end_at <= ? AND how NOT IN (${TIMER_IN})`,
    [start, end],
  );
}

async function putAnswer(tx: Db, slot: SlotRow): Promise<void> {
  const start = isoToMs(slot.slot_start);
  const end = start + SLOT_MS;
  await clearAnswers(tx, start, end);
  for (const [s, e] of emptyParts([start, end], await timerCover(tx, start, end))) {
    await tx.run(
      `INSERT INTO entry (id, item_id, how, start_at, end_at, planned_end_at, tz, note, deleted, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 0, ?)`,
      [uuidv7(s), CATEGORY_ITEM[slot.category], slot.source, s, e, slot.tz, slot.note, isoToMs(slot.client_updated_at)],
    );
  }
}

// [start, end)에서 타이머 기록이 덮은 구간들(5분 이상 멈춘 구간은 뺌). 진행 중 기록·멈춤은 끝을 열린 것으로 본다.
async function timerCover(tx: Db, start: number, end: number): Promise<Span[]> {
  const timers = await tx.all<{ id: string; start_at: number; end_at: number | null }>(
    `SELECT id, start_at, end_at FROM entry
     WHERE deleted = 0 AND how IN (${TIMER_IN}) AND start_at < ? AND (end_at IS NULL OR end_at > ?)`,
    [end, start],
  );
  const cover: Span[] = [];
  for (const t of timers) {
    const pauses = await tx.all<{ start_at: number; end_at: number | null }>(
      'SELECT start_at, end_at FROM pause WHERE entry_id = ?',
      [t.id],
    );
    const session: Span = [t.start_at, t.end_at ?? Infinity];
    const paused = pauses
      .filter((p) => p.end_at === null || p.end_at - p.start_at >= GAP_MIN_MS)
      .map((p): Span => [p.start_at, p.end_at ?? Infinity]);
    cover.push(...emptyParts(session, paused));
  }
  return cover;
}

// 칸들(UTC ISO 시작) 중 지우지 않은 기록이 조금이라도 겹치는 칸(GAP: 타이머 구간은 빈 시간이 아니다).
// 타이머 끝과 다음 알림 사이 자투리(15:47–16:00)는 다음 알림 답이 채우므로 겹친 칸은 묶음에 넣지 않는다.
export async function coveredSlots(db: Db, slots: string[]): Promise<Set<string>> {
  if (slots.length === 0) return new Set();
  const starts = slots.map(isoToMs);
  const from = Math.min(...starts);
  const to = Math.max(...starts) + SLOT_MS;
  const rows = await db.all<{ start_at: number; end_at: number | null }>(
    'SELECT start_at, end_at FROM entry WHERE deleted = 0 AND start_at < ? AND (end_at IS NULL OR end_at > ?)',
    [to, from],
  );
  return new Set(
    slots.filter((iso) => {
      const s = isoToMs(iso);
      return rows.some((r) => r.start_at < s + SLOT_MS && (r.end_at === null || r.end_at > s));
    }),
  );
}

// span에서 cut 구간들을 뺀 나머지 조각들(시작 순). 길이 0인 조각은 버린다.
export function emptyParts(span: Span, cut: Span[]): Span[] {
  const sorted = [...cut].sort((a, b) => a[0] - b[0]);
  const out: Span[] = [];
  let from = span[0];
  for (const [s, e] of sorted) {
    if (e <= from || s >= span[1]) continue;
    if (s > from) out.push([from, Math.min(s, span[1])]);
    from = Math.max(from, e);
    if (from >= span[1]) break;
  }
  if (from < span[1]) out.push([from, span[1]]);
  return out;
}
