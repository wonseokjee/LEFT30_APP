import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { saveSlot, setSetting } from '@/db/records';
import {
  desiredSchedule,
  horizonDays,
  inQuiet,
  pingContent,
  pingsPerDay,
  MAX_PINGS,
} from './plan';
import { createScheduler, EXPIRY_ID, QUIET_KEY, type Notifier } from './scheduler';

const SEOUL = 'Asia/Seoul';
// 23:00~07:00 (현지)
const NIGHT = { startMin: 23 * 60, endMin: 7 * 60 };
// 2026-10-21 10:10 KST
const NOW = new Date('2026-10-21T01:10:00.000Z');

describe('예약 계산', () => {
  it('방해금지는 자정을 넘겨도 맞게 판정한다', () => {
    expect(inQuiet(23 * 60, NIGHT)).toBe(true);
    expect(inQuiet(6 * 60 + 30, NIGHT)).toBe(true);
    expect(inQuiet(7 * 60, NIGHT)).toBe(false);
    expect(inQuiet(22 * 60 + 30, NIGHT)).toBe(false);
    expect(inQuiet(0, null)).toBe(false);
  });

  it('예약 기간은 floor(398 / 하루 칸 수)일이다', () => {
    expect(pingsPerDay(null)).toBe(48);
    expect(horizonDays(null)).toBe(8);
    expect(pingsPerDay(NIGHT)).toBe(32);
    expect(horizonDays(NIGHT)).toBe(12);
    expect(horizonDays({ startMin: 0, endMin: 0 })).toBe(8);
  });

  it('현지 :00/:30에 울리고, 방해금지 칸은 빼며, 398개를 넘지 않는다', () => {
    const { pings, days, expiryAt } = desiredSchedule({ now: NOW, tz: SEOUL, quiet: NIGHT, recent: [] });
    expect(days).toBe(12);
    expect(pings.length).toBeLessThanOrEqual(MAX_PINGS);
    // 10:10 다음 알림은 10:30(10:00 칸)
    expect(pings[0]).toEqual({
      slotStart: '2026-10-21T01:00:00.000Z',
      fireAt: '2026-10-21T01:30:00.000Z',
      textKind: 'default',
    });
    const fireHours = new Set(pings.map((p) => (new Date(p.fireAt).getUTCHours() + 9) % 24 * 60 + new Date(p.fireAt).getUTCMinutes()));
    expect(fireHours.has(23 * 60)).toBe(true); // 22:30 칸은 23:00에 묻는다
    expect(fireHours.has(23 * 60 + 30)).toBe(false);
    expect(fireHours.has(7 * 60)).toBe(false); // 06:30 칸은 방해금지
    expect(fireHours.has(7 * 60 + 30)).toBe(true);
    // 만료 안내는 마지막 알림 하루 전
    expect(Date.parse(pings[pings.length - 1].fireAt) - Date.parse(expiryAt!)).toBe(24 * 3600_000);
  });

  it(':45 오프셋 시간대도 현지 :00/:30에 맞춘다', () => {
    const { pings } = desiredSchedule({ now: NOW, tz: 'Asia/Kathmandu', quiet: null, recent: [] });
    for (const p of pings.slice(0, 5)) expect(new Date(p.fireAt).getUTCMinutes() % 30).toBe(15);
  });

  it('맥락 문구는 다음 칸 하나에만, 직전 60분 안 answered·continued 칸 기준으로 넣는다', () => {
    const recent = [
      { slot_start: '2026-10-21T00:00:00.000Z', category: 'rest' as const, source: 'answered' as const },
      { slot_start: '2026-10-21T00:30:00.000Z', category: 'work' as const, source: 'continued' as const },
    ];
    const { pings } = desiredSchedule({ now: NOW, tz: SEOUL, quiet: null, recent });
    expect(pings[0].textKind).toBe('context:work');
    expect(pings.slice(1).every((p) => p.textKind === 'default')).toBe(true);

    const late = [{ slot_start: '2026-10-21T00:30:00.000Z', category: 'work' as const, source: 'late' as const }];
    expect(desiredSchedule({ now: NOW, tz: SEOUL, quiet: null, recent: late }).pings[0].textKind).toBe('default');
  });

  it('문구는 받침에 맞춰 쓴다', () => {
    expect(pingContent('context:work').body).toBe('방금도 업무였나요?');
    expect(pingContent('context:sleep').body).toBe('방금도 수면이었나요?');
    expect(pingContent('default').body).toBe('지난 30분, 뭐 했어요?');
  });
});

// yields: 호출마다 마이크로태스크를 몇 번 양보해서 동시 실행이 서로 끼어들 틈을 만든다.
// (jest-expo 환경에서는 setTimeout(0)이 한 번에 10ms 넘게 걸려 타이머를 쓰지 않는다.)
function fakeNotifier(yields = 0) {
  const scheduled = new Map<string, { fireAt: string; body: string }>();
  let calls = 0;
  let granted = true;
  const wait = async () => {
    for (let i = 0; i < yields; i++) await Promise.resolve();
  };
  const notifier: Notifier = {
    hasPermission: async () => granted,
    schedule: async (id, fireAt, content) => {
      calls++;
      await wait();
      scheduled.set(id, { fireAt: fireAt.toISOString(), body: content.body });
    },
    cancel: async (id) => {
      calls++;
      await wait();
      scheduled.delete(id);
    },
  };
  return {
    notifier,
    scheduled,
    calls: () => calls,
    setGranted: (g: boolean) => (granted = g),
  };
}

async function setup(yields = 0) {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  await setSetting(db, QUIET_KEY, NIGHT);
  const fake = fakeNotifier(yields);
  let now = NOW;
  const scheduler = createScheduler({ db, notifier: fake.notifier, getTz: () => SEOUL, now: () => now });
  return { db, fake, scheduler, setNow: (d: Date) => (now = d) };
}

describe('스케줄러', () => {
  it('처음에는 전부 걸고, 바뀐 게 없으면 다시 실행해도 아무것도 하지 않는다', async () => {
    const { fake, scheduler } = await setup();
    const first = await scheduler.reschedule();
    expect(first).toMatchObject({ status: 'ok', days: 12, cancelled: 0 });
    const pingCount = [...fake.scheduled.keys()].filter((k) => k.startsWith('slot:')).length;
    expect(first.status === 'ok' && first.added).toBe(pingCount);
    expect(fake.scheduled.has(EXPIRY_ID)).toBe(true);
    expect(fake.scheduled.size).toBeLessThanOrEqual(400);

    const callsBefore = fake.calls();
    expect(await scheduler.reschedule()).toEqual({ status: 'ok', days: 12, added: 0, cancelled: 0 });
    expect(fake.calls()).toBe(callsBefore);
  });

  it('기록하면 다음 칸 문구만 바뀐다', async () => {
    const { db, fake, scheduler } = await setup();
    await scheduler.reschedule();
    await saveSlot(db, {
      slot_start: '2026-10-21T00:30:00.000Z',
      tz: SEOUL,
      category: 'work',
      note: null,
      source: 'answered',
      answered_at: NOW.toISOString(),
      client_updated_at: NOW.toISOString(),
    });
    expect(await scheduler.reschedule()).toEqual({ status: 'ok', days: 12, added: 1, cancelled: 1 });
    expect(fake.scheduled.get('slot:2026-10-21T01:00:00.000Z')!.body).toBe('방금도 업무였나요?');
  });

  it('방해금지를 바꾸면 해당 칸만 취소·추가한다', async () => {
    const { db, fake, scheduler } = await setup();
    await scheduler.reschedule();
    await setSetting(db, QUIET_KEY, { startMin: 22 * 60, endMin: 7 * 60 });
    const r = await scheduler.reschedule();
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    // 22:00, 22:30 칸이 빠지고, 줄어든 하루 칸 수만큼 기간이 늘어난다(398/30 = 13일).
    expect(r.days).toBe(13);
    expect(r.cancelled).toBeGreaterThan(0);
    expect(r.added).toBeGreaterThan(0);
    expect(r.added + r.cancelled).toBeLessThan(fake.scheduled.size);
  });

  it('(R5) 동시에 여러 번 불러도 결과는 한 번 실행한 것과 같다', async () => {
    const solo = await setup();
    await solo.scheduler.reschedule();

    const { db, fake, scheduler } = await setup(3);
    await Promise.all(Array.from({ length: 5 }, () => scheduler.reschedule()));
    expect(new Map([...fake.scheduled].sort())).toEqual(new Map([...solo.fake.scheduled].sort()));
    // 합쳐진 두 번째 실행은 바뀐 게 없어 알림 API를 부르지 않는다.
    expect(fake.calls()).toBe(solo.fake.calls());
    const rows = await db.all<{ n: number }>('SELECT count(*) AS n FROM scheduled_slot');
    expect(rows[0].n).toBe([...fake.scheduled.keys()].filter((k) => k.startsWith('slot:')).length);
  });

  it('권한이 없으면 아무것도 걸지 않는다', async () => {
    const { fake, scheduler } = await setup();
    fake.setGranted(false);
    expect(await scheduler.reschedule()).toEqual({ status: 'no_permission' });
    expect(fake.scheduled.size).toBe(0);
  });

  it('시간이 지나 앱을 열면 지난 칸은 두고 앞쪽을 연장하며 만료 안내도 민다', async () => {
    const { fake, scheduler, setNow } = await setup();
    await scheduler.reschedule();
    const expiryBefore = fake.scheduled.get(EXPIRY_ID)!.fireAt;
    setNow(new Date(NOW.getTime() + 24 * 3600_000));
    const r = await scheduler.reschedule();
    expect(r).toMatchObject({ status: 'ok', cancelled: 0 });
    expect(r.status === 'ok' && r.added).toBe(32);
    expect(Date.parse(fake.scheduled.get(EXPIRY_ID)!.fireAt) - Date.parse(expiryBefore)).toBe(24 * 3600_000);
  });
});
