import type { BlockRow, Category, Db, EventRow, PlanRow, SlotRow } from './types';
import { CATEGORIES } from './types';

export type QueueKind = 'slot' | 'plan' | 'event' | 'block';

// 로컬에 먼저 쓰고 같은 트랜잭션에서 동기화 큐에 넣는다.
// 큐 payload는 저장 시점의 스냅숏이다. 같은 칸을 다시 고치면 새 큐 항목이 생긴다(R4).
export async function enqueue(tx: Db, kind: QueueKind, payload: object): Promise<void> {
  await tx.run(
    'INSERT INTO sync_queue (kind, payload, created_at) VALUES (?, ?, ?)',
    [kind, JSON.stringify(payload), new Date().toISOString()],
  );
}

export async function saveSlot(db: Db, slot: SlotRow): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO slot (slot_start, tz, category, note, source, answered_at, client_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (slot_start) DO UPDATE SET
         tz = excluded.tz, category = excluded.category, note = excluded.note,
         source = excluded.source, answered_at = excluded.answered_at,
         client_updated_at = excluded.client_updated_at`,
      [
        slot.slot_start,
        slot.tz,
        slot.category,
        slot.note,
        slot.source,
        slot.answered_at,
        slot.client_updated_at,
      ],
    );
    await enqueue(tx, 'slot', slot);
  });
}

// 하루 계획 전체를 저장한다. 계획에서 뺀 카테고리는 0으로 저장한다(삭제 없음).
export async function savePlan(
  db: Db,
  localDate: string,
  targets: Partial<Record<Category, number>>,
  clientUpdatedAt: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const category of CATEGORIES) {
      const row: PlanRow = {
        local_date: localDate,
        category,
        target_minutes: targets[category] ?? 0,
        client_updated_at: clientUpdatedAt,
      };
      await tx.run(
        `INSERT INTO plan (local_date, category, target_minutes, client_updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (local_date, category) DO UPDATE SET
           target_minutes = excluded.target_minutes,
           client_updated_at = excluded.client_updated_at`,
        [row.local_date, row.category, row.target_minutes, row.client_updated_at],
      );
      await enqueue(tx, 'plan', row);
    }
  });
}

// 블록 저장. 지우기도 deleted=true로 저장해 서버에 알린다(복원에 삭제가 없어서).
export async function saveBlock(db: Db, block: BlockRow): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO block (id, kind, category, title, start_at, end_at, tz, state, ended_how,
                          deleted, client_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         kind = excluded.kind, category = excluded.category, title = excluded.title,
         start_at = excluded.start_at, end_at = excluded.end_at, tz = excluded.tz,
         state = excluded.state, ended_how = excluded.ended_how, deleted = excluded.deleted,
         client_updated_at = excluded.client_updated_at`,
      [
        block.id,
        block.kind,
        block.category,
        block.title,
        block.start_at,
        block.end_at,
        block.tz,
        block.state,
        block.ended_how,
        block.deleted ? 1 : 0,
        block.client_updated_at,
      ],
    );
    await enqueue(tx, 'block', block);
  });
}

type BlockDbRow = Omit<BlockRow, 'deleted'> & { deleted: number };

function toBlock(row: BlockDbRow): BlockRow {
  return { ...row, deleted: row.deleted === 1 };
}

// [from, to)와 겹치는 지우지 않은 블록, 시작 순.
export async function blocksBetween(db: Db, from: string, to: string): Promise<BlockRow[]> {
  const rows = await db.all<BlockDbRow>(
    `SELECT * FROM block WHERE deleted = 0 AND start_at < ? AND end_at > ? ORDER BY start_at`,
    [to, from],
  );
  return rows.map(toBlock);
}

export async function getBlock(db: Db, id: string): Promise<BlockRow | null> {
  const row = await db.first<BlockDbRow>('SELECT * FROM block WHERE id = ?', [id]);
  return row ? toBlock(row) : null;
}

// 같은 id는 한 번만 기록하고 한 번만 큐에 넣는다.
export async function logEvent(db: Db, event: EventRow): Promise<void> {
  await db.transaction(async (tx) => {
    const { changes } = await tx.run(
      'INSERT OR IGNORE INTO event (id, type, ts, props) VALUES (?, ?, ?, ?)',
      [event.id, event.type, event.ts, event.props ? JSON.stringify(event.props) : null],
    );
    if (changes > 0) await enqueue(tx, 'event', event);
  });
}

// 기록 직후 토스트의 "되돌리기". 저장 전 값이 있으면 그 값을 새 시각으로 다시 저장하고,
// 없던 칸이면 로컬 행과 아직 보내지 않은 큐 항목을 지운다(서버에는 삭제 API가 없다).
export async function undoSlot(db: Db, saved: SlotRow, previous: SlotRow | null): Promise<void> {
  if (previous) {
    await saveSlot(db, { ...previous, client_updated_at: new Date().toISOString() });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM slot WHERE slot_start = ?', [saved.slot_start]);
    await tx.run(
      "DELETE FROM sync_queue WHERE kind = 'slot' AND json_extract(payload, '$.slot_start') = ?",
      [saved.slot_start],
    );
  });
}

// 회원탈퇴(DELETE /me) 성공 후 로컬 데이터를 모두 지운다. 남은 큐가 다시 로그인했을 때 재업로드되지 않게 한다.
export async function wipeLocalData(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    for (const table of [
      'slot',
      'plan',
      'event',
      'block',
      'scheduled_slot',
      'tz_change',
      'sync_queue',
      'sync_dead_letter',
      'setting',
    ]) {
      await tx.run(`DELETE FROM ${table}`);
    }
  });
}

export const ACCOUNT_KEY = 'account_user_id';

// 로그인 직후: 이 기기의 로컬 데이터가 다른 계정 것이면 지운다(eng review D10).
// 같은 계정의 재로그인이나 이 기기의 첫 로그인은 지우지 않는다. 보내지 못한 큐를 지키기 위해서다.
// 지웠으면 true. 예약된 알림 취소는 호출하는 쪽이 한다.
export async function claimAccount(db: Db, userId: string): Promise<boolean> {
  const previous = await getSetting<string>(db, ACCOUNT_KEY);
  if (previous === userId) return false;
  const wiped = previous !== null;
  if (wiped) await wipeLocalData(db);
  await setSetting(db, ACCOUNT_KEY, userId);
  return wiped;
}

export async function getSetting<T>(db: Db, key: string): Promise<T | null> {
  const row = await db.first<{ value: string }>('SELECT value FROM setting WHERE key = ?', [key]);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function setSetting(db: Db, key: string, value: unknown): Promise<void> {
  await db.run(
    'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}

// 시간대가 바뀌었을 때만 기록한다. 늦게 채우는 칸은 그 칸 시각에 유효했던 시간대를 쓴다.
export async function noteTz(db: Db, tz: string, at: Date): Promise<boolean> {
  const last = await db.first<{ tz: string }>(
    'SELECT tz FROM tz_change ORDER BY at DESC, rowid DESC LIMIT 1',
  );
  if (last?.tz === tz) return false;
  await db.run('INSERT INTO tz_change (at, tz) VALUES (?, ?)', [at.toISOString(), tz]);
  return true;
}

export async function tzAt(db: Db, instant: Date, fallback: string): Promise<string> {
  const row = await db.first<{ tz: string }>(
    'SELECT tz FROM tz_change WHERE at <= ? ORDER BY at DESC, rowid DESC LIMIT 1',
    [instant.toISOString()],
  );
  return row?.tz ?? fallback;
}
