import { openNodeDb } from '@/test/nodeDb';
import { migrate } from './migrate';
import { MIGRATIONS } from './schema';
import {
  ACCOUNT_KEY,
  blocksBetween,
  claimAccount,
  getBlock,
  getSetting,
  saveBlock,
  saveSlot,
  wipeLocalData,
} from './records';

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  await saveSlot(db, {
    slot_start: '2026-10-21T00:30:00.000Z',
    tz: 'Asia/Seoul',
    category: 'work',
    note: null,
    source: 'answered',
    answered_at: '2026-10-21T01:00:00.000Z',
    client_updated_at: '2026-10-21T01:00:00.000Z',
  });
  return db;
}

const count = async (db: Awaited<ReturnType<typeof setup>>, table: string) =>
  (await db.first<{ n: number }>(`SELECT count(*) AS n FROM ${table}`))!.n;

describe('계정 전환 (D10)', () => {
  it('이 기기의 첫 로그인은 기록과 보내지 못한 큐를 지우지 않는다', async () => {
    const db = await setup();
    expect(await claimAccount(db, 'user-a')).toBe(false);
    expect(await count(db, 'slot')).toBe(1);
    expect(await count(db, 'sync_queue')).toBe(1);
    expect(await getSetting(db, ACCOUNT_KEY)).toBe('user-a');
  });

  it('같은 계정으로 다시 로그인하면 그대로 둔다', async () => {
    const db = await setup();
    await claimAccount(db, 'user-a');
    expect(await claimAccount(db, 'user-a')).toBe(false);
    expect(await count(db, 'sync_queue')).toBe(1);
  });

  it('다른 계정으로 로그인하면 이전 사람의 기록과 큐를 지우고 새 계정을 기억한다', async () => {
    const db = await setup();
    await claimAccount(db, 'user-a');
    expect(await claimAccount(db, 'user-b')).toBe(true);
    expect(await count(db, 'slot')).toBe(0);
    expect(await count(db, 'sync_queue')).toBe(0);
    expect(await getSetting(db, ACCOUNT_KEY)).toBe('user-b');
  });
});

describe('블록 저장 (E1)', () => {
  const base = {
    id: 'p1',
    kind: 'plan' as const,
    category: 'work' as const,
    title: '보고서 쓰기',
    start_at: '2026-10-21T05:00:00.000Z',
    end_at: '2026-10-21T07:00:00.000Z',
    tz: 'Asia/Seoul',
    state: 'planned' as const,
    ended_how: null,
    deleted: false,
    client_updated_at: '2026-10-21T00:00:00.000Z',
  };

  it('저장할 때마다 스냅숏을 큐에 넣고, 겹치는 구간의 지우지 않은 블록만 돌려준다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    await saveBlock(db, base);
    await saveBlock(db, { ...base, id: 'p2', start_at: '2026-10-21T10:00:00.000Z', end_at: '2026-10-21T11:00:00.000Z' });

    // 06:00–06:30(UTC)과 겹치는 것은 p1뿐, 07:00에 끝나는 p1은 07:00–08:00과 겹치지 않는다.
    expect((await blocksBetween(db, '2026-10-21T06:00:00.000Z', '2026-10-21T06:30:00.000Z')).map((b) => b.id)).toEqual(['p1']);
    expect(await blocksBetween(db, '2026-10-21T07:00:00.000Z', '2026-10-21T08:00:00.000Z')).toEqual([]);

    // 지우기는 deleted=true 저장. 조회에서 빠지고 큐에는 지운 스냅숏이 간다.
    await saveBlock(db, { ...base, deleted: true, client_updated_at: '2026-10-21T01:00:00.000Z' });
    expect((await blocksBetween(db, '2026-10-21T00:00:00.000Z', '2026-10-22T00:00:00.000Z')).map((b) => b.id)).toEqual(['p2']);
    expect(await getBlock(db, 'p1')).toMatchObject({ deleted: true });
    const queued = await db.all<{ kind: string; payload: string }>('SELECT kind, payload FROM sync_queue ORDER BY id');
    expect(queued.map((q) => q.kind)).toEqual(['block', 'block', 'block']);
    expect(JSON.parse(queued[2].payload)).toMatchObject({ id: 'p1', deleted: true });
  });

  it('회원탈퇴 정리에서 블록도 지운다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    await saveBlock(db, base);
    await wipeLocalData(db);
    expect(await db.all('SELECT id FROM block')).toEqual([]);
  });
});

