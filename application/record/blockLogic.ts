import type { BlockEndHow, BlockRow, Category, Db, SlotRow } from '@/db/types';
import { blocksBetween, getBlock, logEvent, saveBlock, saveSlot } from '@/db/records';
import { localParts, MINUTE_MS, SLOT_MS } from '@/lib/localTime';
import { uuidv4 } from '@/lib/uuid';
import { capToQuiet, type Quiet } from '@/scheduler/plan';

/*
 * 집중 블록(지금부터)과 계획 블록(Todo)의 동작. 설계: docs/designs/left30-focus-block.md
 *
 *  집중:  start ──▶ active ──(끝 시각)──▶ awaiting ──(끝 시트 답)──▶ ended(answer)
 *                    │  끝내기 ─▶ ended(end_now)    │ 다음 30분 알림 시각까지 답 없음 ─▶ ended(no_answer)
 *                    └  30분 더 ─▶ active(끝 시각 +30분)
 *  계획:  planned ──(시작 시각)──▶ active ── 이하 같음. 집중을 시작하면 겹친 계획은 cancelled.
 *
 * 블록 칸 = 끝나는 시각(알림 시각)이 (start, end]에 드는 30분 칸. 스케줄러가 빼는 알림과 같다.
 * 칸을 미리 쓰지 않는다(SPEC-1). 집중 블록은 끝난 칸만 앱을 열 때·끝 시트에서 declared로 채우고,
 * 계획 블록은 끝 시트에서 [여기서 끝]이나 Todo 체크로 답할 때 채운다. 이미 기록된 칸은 덮지 않는다
 * (Todo 체크의 겹침 확인에서 사용자가 고르면 덮는다).
 */

const QUARTER = 15 * MINUTE_MS;

// now 다음의 현지 :00/:30 경계.
export function nextBoundary(now: Date, tz: string): Date {
  let t = Math.floor(now.getTime() / QUARTER) * QUARTER + QUARTER;
  while (localParts(new Date(t), tz).minuteOfDay % 30 !== 0) t += QUARTER;
  return new Date(t);
}

// 블록 칸의 slot_start 목록(UTC ISO), 시간 순.
export function blockSlots(block: Pick<BlockRow, 'start_at' | 'end_at'>, tz: string): string[] {
  const start = Date.parse(block.start_at);
  const end = Date.parse(block.end_at);
  const out: string[] = [];
  let t = Math.floor(start / QUARTER) * QUARTER + QUARTER;
  for (; t <= end; t += QUARTER) {
    if (localParts(new Date(t), tz).minuteOfDay % 30 !== 0) continue;
    out.push(new Date(t - SLOT_MS).toISOString());
  }
  return out;
}

async function event(db: Db, type: 'block_started' | 'block_ended', props: Record<string, unknown>) {
  await logEvent(db, { id: uuidv4(), type, ts: new Date().toISOString(), props });
}

// 끝난 블록 칸 중 비어 있는 칸만 declared로 채운다. overwrite면 다른 카테고리 칸도 덮는다.
async function fillSlots(
  db: Db,
  block: BlockRow,
  upTo: Date,
  now: Date,
  overwrite = false,
): Promise<number> {
  let n = 0;
  for (const slotStart of blockSlots(block, block.tz)) {
    if (Date.parse(slotStart) + SLOT_MS > upTo.getTime()) break;
    const existing = await db.first<SlotRow>('SELECT * FROM slot WHERE slot_start = ?', [slotStart]);
    if (existing && (!overwrite || existing.category === block.category)) continue;
    await saveSlot(db, {
      slot_start: slotStart,
      tz: block.tz,
      category: block.category,
      note: existing?.note ?? null,
      source: 'declared',
      answered_at: now.toISOString(),
      client_updated_at: now.toISOString(),
    });
    n++;
  }
  return n;
}

async function update(db: Db, block: BlockRow, patch: Partial<BlockRow>, now: Date): Promise<BlockRow> {
  const next = { ...block, ...patch, client_updated_at: now.toISOString() };
  await saveBlock(db, next);
  return next;
}

export const FOCUS_HOURS = [1, 2, 3] as const;

// 집중 길이 선택지의 끝 시각(다음 경계 + 시간, 방해금지에서 자름). 시작할 수 없으면(지금이 방해금지) null.
export function focusEnd(now: Date, hours: number, tz: string, quiet: Quiet): Date | null {
  const raw = new Date(nextBoundary(now, tz).getTime() + hours * 60 * MINUTE_MS);
  const capped = new Date(capToQuiet(now.toISOString(), raw.toISOString(), tz, quiet));
  return capped.getTime() > now.getTime() ? capped : null;
}

// Home [집중]: 지금부터 집중 블록. 겹친 진행 중·예정 계획 블록은 집중이 대신한다(cancelled).
export async function startFocus(
  db: Db,
  params: { category: Category; hours: number; now: Date; tz: string; quiet: Quiet; id?: string },
): Promise<BlockRow | null> {
  const { category, hours, now, tz, quiet } = params;
  const end = focusEnd(now, hours, tz, quiet);
  if (!end) return null;
  for (const b of await blocksBetween(db, now.toISOString(), end.toISOString())) {
    if (b.state === 'active' || b.state === 'planned' || b.state === 'awaiting') {
      if (b.kind === 'focus') await update(db, b, { state: 'ended', ended_how: 'end_now' }, now);
      else await update(db, b, { state: 'cancelled' }, now);
    }
  }
  const block: BlockRow = {
    id: params.id ?? uuidv4(),
    kind: 'focus',
    category,
    title: null,
    start_at: now.toISOString(),
    end_at: end.toISOString(),
    tz,
    state: 'active',
    ended_how: null,
    deleted: false,
    client_updated_at: now.toISOString(),
  };
  await saveBlock(db, block);
  await event(db, 'block_started', { kind: 'focus', source: 'home', hours });
  return block;
}

// 30분 더(끝 시트·Home). 방해금지에서 자르고, 늘릴 수 없으면 그대로 둔다.
export async function extendBlock(db: Db, block: BlockRow, now: Date, quiet: Quiet): Promise<BlockRow> {
  // 칸 경계를 지키려고 지금이 아니라 원래 끝 시각에서 30분을 더한다(끝 시트는 끝 시각 뒤 30분 안에만 뜬다).
  const raw = new Date(Date.parse(block.end_at) + SLOT_MS).toISOString();
  const end = capToQuiet(block.end_at, raw, block.tz, quiet);
  if (Date.parse(end) <= Date.parse(block.end_at)) return block;
  const next = await update(db, block, { end_at: end, state: 'active', ended_how: null }, now);
  await event(db, 'block_ended', { kind: block.kind, how: 'extend' });
  return next;
}

// Home [끝내기]: 끝난 칸까지만 채우고 끝낸다. 진행 중 칸은 평소 알림이 묻는다.
export async function endFocusNow(db: Db, block: BlockRow, now: Date): Promise<BlockRow> {
  await fillSlots(db, block, now, now);
  const next = await update(db, block, { state: 'ended', ended_how: 'end_now' }, now);
  await event(db, 'block_ended', { kind: block.kind, how: 'end_now' });
  return next;
}

// 끝 시트 [여기서 끝] 또는 Todo 체크. 블록 칸 전체를 채운다(비어 있는 칸만, overwrite면 겹친 칸도).
export async function answerBlock(
  db: Db,
  block: BlockRow,
  now: Date,
  how: Extract<BlockEndHow, 'answer' | 'checked'> = 'answer',
  overwrite = false,
): Promise<BlockRow> {
  await fillSlots(db, block, new Date(block.end_at), now, overwrite);
  const next = await update(db, block, { state: 'ended', ended_how: how }, now);
  await event(db, 'block_ended', { kind: block.kind, how });
  return next;
}

// Todo 체크 전에: 블록 칸 중 다른 카테고리로 이미 기록된 칸(DR-3 겹침 시트).
export async function conflictingSlots(db: Db, block: BlockRow): Promise<SlotRow[]> {
  const slots = blockSlots(block, block.tz);
  if (slots.length === 0) return [];
  const rows = await db.all<SlotRow>(
    `SELECT * FROM slot WHERE slot_start IN (${slots.map(() => '?').join(',')}) ORDER BY slot_start`,
    slots,
  );
  return rows.filter((r) => r.category !== block.category);
}

/*
 * 앱을 열 때·포그라운드로 올 때. 시간이 지난 블록의 상태를 옮기고, 집중 블록의 끝난 칸을 채운다.
 * 돌려준 블록 id가 있으면 그 블록의 끝 시트를 띄운다(끝 알림을 놓쳤거나 앱을 연 경우).
 */
export async function settleBlocks(db: Db, now: Date): Promise<{ endSheet: string | null }> {
  const rows = await db.all<{ id: string }>(
    `SELECT id FROM block WHERE deleted = 0 AND state IN ('planned', 'active', 'awaiting') ORDER BY end_at`,
  );
  let endSheet: string | null = null;
  for (const { id } of rows) {
    let b = (await getBlock(db, id))!;
    const start = Date.parse(b.start_at);
    const end = Date.parse(b.end_at);
    if (b.state === 'planned' && start <= now.getTime()) b = await update(db, b, { state: 'active' }, now);
    if (b.kind === 'focus' && b.state === 'active') await fillSlots(db, b, now, now);
    if (b.state === 'active' && end <= now.getTime()) {
      if (b.kind === 'focus') await fillSlots(db, b, new Date(end), now);
      b = await update(db, b, { state: 'awaiting' }, now);
    }
    if (b.state === 'awaiting') {
      // 다음 30분 알림 시각이 지나도록 답이 없으면 끝낸다. 계획 블록 칸은 비어 있어 놓친 칸 묶음이 맡는다.
      if (now.getTime() >= end + SLOT_MS) {
        await update(db, b, { state: 'ended', ended_how: 'no_answer' }, now);
        await event(db, 'block_ended', { kind: b.kind, how: 'no_answer' });
      } else {
        endSheet = b.id;
      }
    }
  }
  return { endSheet };
}

// Home 표시용: 지금 진행 중인 블록(집중 우선).
export async function activeBlock(db: Db, now: Date): Promise<BlockRow | null> {
  const iso = now.toISOString();
  const rows = await blocksBetween(db, iso, new Date(now.getTime() + 1).toISOString());
  const live = rows.filter((b) => b.state === 'active');
  return live.find((b) => b.kind === 'focus') ?? live[0] ?? null;
}

// "1시간 49분", 1시간 미만이면 "49분"(디자인 리뷰 DR-1a). 분:초 카운트다운과 헷갈리지 않게 단위를 붙인다.
export function remainingLabel(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / MINUTE_MS));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}
