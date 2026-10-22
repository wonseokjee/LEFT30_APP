import type { Db } from '@/db/types';
import { logEvent, type QueueKind } from '@/db/records';
import { singleFlight } from '@/lib/singleFlight';
import { uuidv4 } from '@/lib/uuid';

/*
 * 동기화 큐(R4, R3). 서버 계약은 server/src/sync/sync.dto.ts와 같다.
 *
 *  기록 → SQLite upsert + sync_queue(id++)
 *                              │
 *         ┌── single-flight ◀──┘   (실행 중 요청은 끝난 뒤 1회로 합침)
 *         ▼
 *  POST {tz, items[qid = 큐 id]}   (≤500건, ≤maxBytes)
 *    ├ 200 → accepted qid만 삭제, rejected는 sync_dead_letter + sync_rejected 이벤트
 *    ├ 401 → refresh 후 1회 재시도, 실패하면 needs_login (큐 보존)
 *    ├ 413 → 배치를 반으로 나눠 재시도 (1건이면 dead-letter)
 *    ├ 400 → 배치 전체 dead-letter (서버는 항목별로 검증하므로 형식 오류일 때만 온다)
 *    └ 네트워크·그 밖의 상태 → retry (큐 보존, 백오프 후 다시)
 *
 * 응답을 기다리는 동안 같은 칸을 고치면 새 큐 항목이 생긴다. 응답에 없는 그 항목은 지워지지 않고
 * 다음 실행에 보내진다. 서버는 client_updated_at이 더 최신일 때만 덮어쓰므로 최신 값이 남는다.
 */

export const ENDPOINT: Record<QueueKind, string> = {
  slot: '/sync/slots',
  plan: '/sync/plans',
  event: '/events',
};
const KINDS: QueueKind[] = ['slot', 'plan', 'event'];

export type BatchResult = {
  accepted: number[];
  rejected: { qid: number | null; reason: string }[];
};

// 네트워크 오류는 throw한다. HTTP 상태는 그대로 돌려준다.
export interface Transport {
  post(path: string, body: unknown): Promise<{ status: number; data?: unknown }>;
}

export interface Auth {
  // refresh 토큰으로 access 토큰을 다시 받는다. 실패하면 false.
  refresh(): Promise<boolean>;
}

export type SyncOutcome =
  | { status: 'done'; sent: number }
  | { status: 'retry'; sent: number }
  | { status: 'needs_login'; sent: number };

type QueueRow = { id: number; kind: QueueKind; payload: string };

export type SyncOptions = {
  db: Db;
  transport: Transport;
  auth: Auth;
  getTz: () => string;
  maxItems?: number;
  maxBytes?: number;
};

const MAX_ITEMS = 500;
// 서버 상한 1MB보다 여유를 둔다.
const MAX_BYTES = 900_000;

export function createSyncEngine(opts: SyncOptions) {
  const maxItems = opts.maxItems ?? MAX_ITEMS;
  const maxBytes = opts.maxBytes ?? MAX_BYTES;
  const { db } = opts;

  async function deadLetter(rows: QueueRow[], reason: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      for (const row of rows) {
        await tx.run(
          `INSERT OR REPLACE INTO sync_dead_letter (queue_id, kind, payload, reason, rejected_at)
           VALUES (?, ?, ?, ?, ?)`,
          [row.id, row.kind, row.payload, reason, now],
        );
        await tx.run('DELETE FROM sync_queue WHERE id = ?', [row.id]);
      }
    });
    for (const row of rows) {
      // sync_rejected 자체가 거절되면 다시 이벤트를 만들지 않는다(무한 반복 방지).
      if (row.kind === 'event' && JSON.parse(row.payload).type === 'sync_rejected') continue;
      await logEvent(db, {
        id: uuidv4(),
        type: 'sync_rejected',
        ts: now,
        props: { kind: row.kind, reason: reason.slice(0, 300) },
      });
    }
  }

  // 'ok' | 'retry' | 'needs_login'
  async function sendChunk(
    kind: QueueKind,
    rows: QueueRow[],
    refreshed: boolean,
  ): Promise<'ok' | 'retry' | 'needs_login'> {
    const body = {
      tz: opts.getTz(),
      items: rows.map((r) => ({ ...JSON.parse(r.payload), qid: r.id })),
    };
    let res: { status: number; data?: unknown };
    try {
      res = await opts.transport.post(ENDPOINT[kind], body);
    } catch {
      return 'retry';
    }

    if (res.status === 200) {
      const result = res.data as BatchResult;
      const sent = new Set(rows.map((r) => r.id));
      const accepted = result.accepted.filter((id) => sent.has(id));
      if (accepted.length > 0) {
        await db.run(
          `DELETE FROM sync_queue WHERE id IN (${accepted.map(() => '?').join(',')})`,
          accepted,
        );
      }
      for (const r of result.rejected) {
        const row = rows.find((x) => x.id === r.qid);
        if (row) await deadLetter([row], r.reason);
      }
      return 'ok';
    }
    if (res.status === 401) {
      if (!refreshed && (await opts.auth.refresh())) return sendChunk(kind, rows, true);
      return 'needs_login';
    }
    if (res.status === 413) {
      if (rows.length === 1) {
        await deadLetter(rows, 'payload too large');
        return 'ok';
      }
      const half = Math.ceil(rows.length / 2);
      const first = await sendChunk(kind, rows.slice(0, half), refreshed);
      if (first !== 'ok') return first;
      return sendChunk(kind, rows.slice(half), refreshed);
    }
    if (res.status === 400) {
      await deadLetter(rows, 'batch rejected (400)');
      return 'ok';
    }
    return 'retry';
  }

  // 큐 순서(id)대로 maxItems·maxBytes 안에서 자른다.
  function chunk(rows: QueueRow[]): QueueRow[][] {
    const chunks: QueueRow[][] = [];
    let current: QueueRow[] = [];
    let bytes = 0;
    for (const row of rows) {
      const size = row.payload.length + 32;
      if (current.length > 0 && (current.length >= maxItems || bytes + size > maxBytes)) {
        chunks.push(current);
        current = [];
        bytes = 0;
      }
      current.push(row);
      bytes += size;
    }
    if (current.length > 0) chunks.push(current);
    return chunks;
  }

  async function runOnce(): Promise<SyncOutcome> {
    let sent = 0;
    for (const kind of KINDS) {
      // 이번 실행에서 이미 보낸 id 뒤부터 읽는다. 응답에 빠진 항목은 다음 실행으로 넘긴다.
      let cursor = 0;
      for (;;) {
        const rows = await db.all<QueueRow>(
          'SELECT id, kind, payload FROM sync_queue WHERE kind = ? AND id > ? ORDER BY id LIMIT ?',
          [kind, cursor, maxItems],
        );
        if (rows.length === 0) break;
        for (const c of chunk(rows)) {
          const r = await sendChunk(kind, c, false);
          if (r !== 'ok') return { status: r, sent };
          sent += c.length;
        }
        cursor = rows[rows.length - 1].id;
      }
    }
    return { status: 'done', sent };
  }

  return {
    // 기록 저장 후, 앱이 포그라운드로 올 때, 백오프 타이머에서 부른다.
    requestSync: singleFlight(runOnce),
  };
}

// 실패가 이어질수록 늘리는 재시도 간격(5초에서 시작, 최대 10분).
export function backoffMs(failures: number): number {
  return Math.min(5_000 * 2 ** Math.max(0, failures - 1), 10 * 60_000);
}
