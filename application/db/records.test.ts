import { openNodeDb } from '@/test/nodeDb';
import { migrate } from './migrate';
import { MIGRATIONS } from './schema';
import { ACCOUNT_KEY, claimAccount, getSetting, saveSlot } from './records';

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
