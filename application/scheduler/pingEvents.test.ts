import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { setSetting, ACCOUNT_KEY } from '@/db/records';
import { logPingAnswered, logPingDisplayed, logPingScheduled } from './pingEvents';

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  await setSetting(db, ACCOUNT_KEY, 'u1');
  const sched = (slotStart: string) =>
    db.run('INSERT INTO scheduled_slot (slot_start, notification_id, scheduled_at, text_kind) VALUES (?, ?, ?, ?)', [
      slotStart,
      `slot:${slotStart}`,
      '2026-11-12T00:00:00.000Z',
      'plain',
    ]);
  const events = () => db.all<{ id: string; type: string; ts: string; props: string }>('SELECT * FROM event ORDER BY ts');
  const queued = async () => (await db.all('SELECT id FROM sync_queue WHERE kind = ?', ['event'])).length;
  return { db, sched, events, queued };
}

describe('S3 핑 이벤트', () => {
  it('ping_scheduled는 도래한 예약 칸만, 앱을 여러 번 열어도 한 번만 남긴다', async () => {
    const { db, sched, events, queued } = await setup();
    await sched('2026-11-12T03:00:00.000Z'); // 12:00 칸 → 12:30에 울림
    await sched('2026-11-12T03:30:00.000Z'); // 12:30 칸 → 13:00에 울림(아직)
    const now = new Date('2026-11-12T03:45:00.000Z');
    await logPingScheduled(db, now);
    await logPingScheduled(db, now);
    const rows = await events();
    expect(rows.map((r) => [r.type, r.ts])).toEqual([['ping_scheduled', '2026-11-12T03:30:00.000Z']]);
    expect(await queued()).toBe(1);
  });

  it('ping_displayed는 같은 칸을 여러 경로로 봐도 첫 관측만 남기고 지연을 적는다', async () => {
    const { db, events } = await setup();
    const slot = '2026-11-12T03:00:00.000Z';
    await logPingDisplayed(db, slot, new Date('2026-11-12T03:30:20.000Z'));
    await logPingDisplayed(db, slot, new Date('2026-11-12T03:40:00.000Z'));
    const rows = await events();
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0].props)).toEqual({ slot_start: slot, delay_ms: 20_000 });
  });

  it('ping_answered는 칸마다 하나', async () => {
    const { db, events } = await setup();
    const slot = '2026-11-12T03:00:00.000Z';
    await logPingAnswered(db, slot, 'answered', new Date('2026-11-12T03:31:00.000Z'));
    await logPingAnswered(db, slot, 'answered', new Date('2026-11-12T03:35:00.000Z'));
    expect((await events()).map((r) => r.type)).toEqual(['ping_answered']);
  });
});
