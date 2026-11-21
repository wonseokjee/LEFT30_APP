import type { Db, ItemRow } from '@/db/types';
import { MINUTE_MS } from '@/lib/localTime';
import { uuidv7 } from '@/lib/uuid';

/*
 * 세부 항목(eng 리뷰 3 D1 B: 항목 쓰기는 todoLogic과 따로). 시작 시트·기록 시트·목표 추가 시트가 쓴다.
 * 최근 칩(R7) = 30일 안에 기록한 숨기지 않은 세부 항목, 마지막 기록 순, 6개까지.
 */

export const ITEM_NAME_MAX = 10;
export const RECENT_DAYS = 30;
export const RECENT_LIMIT = 6;

export type ItemChip = Pick<ItemRow, 'id' | 'name'>;

export async function recentItems(db: Db, parentId: string, now: number): Promise<ItemChip[]> {
  return db.all<ItemChip>(
    `SELECT i.id, i.name FROM item i JOIN entry e ON e.item_id = i.id
     WHERE i.parent_id = ? AND i.hidden = 0 AND e.deleted = 0 AND e.start_at >= ?
     GROUP BY i.id ORDER BY MAX(e.start_at) DESC LIMIT ?`,
    [parentId, now - RECENT_DAYS * 24 * 60 * MINUTE_MS, RECENT_LIMIT],
  );
}

export async function getItem(db: Db, id: string): Promise<ItemChip | null> {
  return db.first<ItemChip>('SELECT id, name FROM item WHERE id = ?', [id]);
}

// 항목 이름 다듬기: 앞뒤 공백을 지우고 10자까지. 비면 null.
export function cleanItemName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return null;
  return [...name].slice(0, ITEM_NAME_MAX).join('');
}

// [+ 새 항목]. 같은 이름이 있으면 그 항목을 고른다(디자인 리뷰 2 D13). 숨긴 항목이면 꺼낸다.
export async function findOrCreateItem(db: Db, parentId: string, raw: string, now: number): Promise<ItemChip> {
  const name = cleanItemName(raw);
  if (!name) throw new Error('empty item name');
  return db.transaction(async (tx) => {
    const found = await tx.first<ItemRow>('SELECT * FROM item WHERE parent_id = ? AND name = ?', [parentId, name]);
    if (found) {
      if (found.hidden) await tx.run('UPDATE item SET hidden = 0, updated_at = ? WHERE id = ?', [now, found.id]);
      return { id: found.id, name: found.name };
    }
    const id = uuidv7(now);
    await tx.run('INSERT INTO item (id, parent_id, name, hidden, updated_at) VALUES (?, ?, ?, 0, ?)', [
      id,
      parentId,
      name,
      now,
    ]);
    return { id, name };
  });
}
