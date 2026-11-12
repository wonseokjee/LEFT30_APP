import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { saveBlock, saveSlot, setSetting } from '@/db/records';
import type { BlockRow } from '@/db/types';
import {
  ALL_DAYS,
  desiredSchedule,
  horizonDays,
  inQuiet,
  isPaused,
  normalizePause,
  normalizeQuiet,
  WEEKDAYS,
  pingContent,
  pingsPerDay,
  MAX_PINGS,
  capToQuiet,
} from './plan';
import { blockEndId, createScheduler, EXPIRY_ID, PAUSE_KEY, QUIET_KEY, type Notifier } from './scheduler';

const SEOUL = 'Asia/Seoul';
// 23:00~07:00 (현지, 매일)
const NIGHT = [{ startMin: 23 * 60, endMin: 7 * 60, days: ALL_DAYS }];
// 평일 09:00~18:00
const WORK = [{ startMin: 9 * 60, endMin: 18 * 60, days: WEEKDAYS }];
// 2026-10-21(수) 10:10 KST
const NOW = new Date('2026-10-21T01:10:00.000Z');
const at = (minuteOfDay: number, weekday: number) => ({ minuteOfDay, weekday });
const WED = 3;
const FRI = 5;
const SAT = 6;
const SUN = 0;

describe('예약 계산', () => {
  it('방해금지는 자정을 넘겨도 맞게 판정한다', () => {
    expect(inQuiet(at(23 * 60, WED), NIGHT)).toBe(true);
    expect(inQuiet(at(6 * 60 + 30, WED), NIGHT)).toBe(true);
    expect(inQuiet(at(7 * 60, WED), NIGHT)).toBe(false);
    expect(inQuiet(at(22 * 60 + 30, WED), NIGHT)).toBe(false);
    expect(inQuiet(at(0, WED), [])).toBe(false);
  });

  it('(D19) 요일을 고른 방해금지는 그 요일에만 적용한다', () => {
    expect(inQuiet(at(10 * 60, WED), WORK)).toBe(true);
    expect(inQuiet(at(18 * 60, WED), WORK)).toBe(false);
    expect(inQuiet(at(10 * 60, SAT), WORK)).toBe(false);
    expect(inQuiet(at(10 * 60, SUN), WORK)).toBe(false);
  });

  it('(D19) 자정을 넘기는 방해금지는 시작한 요일 기준으로 다음 날 아침까지 이어진다', () => {
    const fridayNight = [{ startMin: 23 * 60, endMin: 7 * 60, days: [FRI] }];
    expect(inQuiet(at(23 * 60 + 30, FRI), fridayNight)).toBe(true);
    expect(inQuiet(at(2 * 60, SAT), fridayNight)).toBe(true);
    expect(inQuiet(at(2 * 60, FRI), fridayNight)).toBe(false); // 목요일 밤은 고르지 않음
    expect(inQuiet(at(23 * 60 + 30, SAT), fridayNight)).toBe(false);
    expect(inQuiet(at(2 * 60, SUN), fridayNight)).toBe(false);
  });

  it('(D19) 여러 방해금지 중 하나라도 걸리면 묻지 않는다', () => {
    const both = [...NIGHT, ...WORK];
    expect(inQuiet(at(1 * 60, SAT), both)).toBe(true);
    expect(inQuiet(at(12 * 60, WED), both)).toBe(true);
    expect(inQuiet(at(12 * 60, SAT), both)).toBe(false);
  });

  it('(D25) 일시 중지는 until 전까지만이고, null이면 계속이다', () => {
    const until = '2026-10-21T03:00:00.000Z';
    expect(isPaused({ until }, new Date('2026-10-21T02:59:00Z'))).toBe(true);
    expect(isPaused({ until }, new Date(until))).toBe(false);
    expect(isPaused({ until: null }, new Date('2030-01-01T00:00:00Z'))).toBe(true);
    expect(isPaused(null, NOW)).toBe(false);
    expect(normalizePause({ until: 'x' })).toBeNull();
    expect(normalizePause(null)).toBeNull();
    expect(normalizePause({ until: null })).toEqual({ until: null });
  });

  it('예전 한 개짜리 형식과 빈 값도 목록으로 읽는다', () => {
    expect(normalizeQuiet({ startMin: 23 * 60, endMin: 7 * 60 })).toEqual(NIGHT);
    expect(normalizeQuiet(null)).toEqual([]);
    expect(normalizeQuiet(WORK)).toEqual(WORK);
  });

  it('예약 기간은 floor(398 / 하루 칸 수)일이다', () => {
    expect(pingsPerDay([])).toBe(48);
    expect(horizonDays([])).toBe(8);
    expect(pingsPerDay(NIGHT)).toBe(32);
    expect(horizonDays(NIGHT)).toBe(12);
    expect(horizonDays([{ startMin: 0, endMin: 0, days: ALL_DAYS }])).toBe(8);
    // 요일마다 다르면 가장 많이 묻는 요일(주말 32칸) 기준
    expect(pingsPerDay([...NIGHT, ...WORK])).toBe(32);
  });

  it('(D19) 평일 업무 시간은 평일에만 빠지고 주말에는 묻는다', () => {
    const { pings } = desiredSchedule({ now: NOW, tz: SEOUL, quiet: WORK, recent: [] });
    const starts = new Set(pings.map((p) => p.slotStart));
    expect(starts.has('2026-10-21T03:00:00.000Z')).toBe(false); // 수 12:00
    expect(starts.has('2026-10-24T03:00:00.000Z')).toBe(true); // 토 12:00
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
    const { pings } = desiredSchedule({ now: NOW, tz: 'Asia/Kathmandu', quiet: [], recent: [] });
    for (const p of pings.slice(0, 5)) expect(new Date(p.fireAt).getUTCMinutes() % 30).toBe(15);
  });

  it('맥락 문구는 다음 칸 하나에만, 직전 60분 안 answered·continued 칸 기준으로 넣는다', () => {
    const recent = [
      { slot_start: '2026-10-21T00:00:00.000Z', category: 'rest' as const, source: 'answered' as const },
      { slot_start: '2026-10-21T00:30:00.000Z', category: 'work' as const, source: 'continued' as const },
    ];
    const { pings } = desiredSchedule({ now: NOW, tz: SEOUL, quiet: [], recent });
    expect(pings[0].textKind).toBe('context:work');
    expect(pings.slice(1).every((p) => p.textKind === 'default')).toBe(true);

    const late = [{ slot_start: '2026-10-21T00:30:00.000Z', category: 'work' as const, source: 'late' as const }];
    expect(desiredSchedule({ now: NOW, tz: SEOUL, quiet: [], recent: late }).pings[0].textKind).toBe('default');
  });

  it('(E1) 블록 동안 칸 알림을 빼고 끝 시각에 끝 알림 하나를 건다', () => {
    // 13:30–15:30(KST) 업무 블록 = 04:30–06:30Z
    const block = { id: 'b1', category: 'work' as const, startAt: '2026-10-21T04:30:00.000Z', endAt: '2026-10-21T06:30:00.000Z' };
    const d = desiredSchedule({ now: NOW, tz: SEOUL, quiet: NIGHT, recent: [], blocks: [block] });
    const fires = new Set(d.pings.map((p) => p.fireAt));
    expect(fires.has('2026-10-21T04:30:00.000Z')).toBe(true); // 13:30 알림(13:00 칸)은 울린다
    for (const f of ['05:00', '05:30', '06:00', '06:30']) expect(fires.has(`2026-10-21T${f}:00.000Z`)).toBe(false);
    expect(fires.has('2026-10-21T07:00:00.000Z')).toBe(true);
    expect(d.blockEnds).toEqual([{ blockId: 'b1', fireAt: block.endAt, body: '업무 13:30–15:30 끝' }]);
    // 끝 알림 몫만큼 칸 알림 몫이 줄어 합계가 398을 넘지 않는다.
    expect(d.pings.length + d.blockEnds.length).toBeLessThanOrEqual(MAX_PINGS);
  });

  it('(E1) 이미 끝난 블록과 일시 중지 시각의 끝 알림은 걸지 않는다', () => {
    const past = { id: 'p', category: 'work' as const, startAt: '2026-10-20T00:00:00.000Z', endAt: '2026-10-20T01:00:00.000Z' };
    const paused = { id: 'q', category: 'rest' as const, startAt: '2026-10-21T02:00:00.000Z', endAt: '2026-10-21T02:30:00.000Z' };
    const d = desiredSchedule({
      now: NOW,
      tz: SEOUL,
      quiet: NIGHT,
      recent: [],
      blocks: [past, paused],
      pause: { until: '2026-10-21T03:00:00.000Z' },
    });
    expect(d.blockEnds).toEqual([]);
  });

  it('(E3) 블록이 방해금지에 걸치면 방해금지 시작에서 끝낸다', () => {
    // 22:00 KST(13:00Z)부터 3시간, 방해금지 23:00 → 23:00(14:00Z)에서 끝
    expect(capToQuiet('2026-10-21T13:00:00.000Z', '2026-10-21T16:00:00.000Z', SEOUL, NIGHT)).toBe('2026-10-21T14:00:00.000Z');
    // 걸치지 않으면 그대로
    expect(capToQuiet('2026-10-21T04:00:00.000Z', '2026-10-21T06:00:00.000Z', SEOUL, NIGHT)).toBe('2026-10-21T06:00:00.000Z');
    // 22:41(13:41Z)에 시작해도 23:00에서 끝
    expect(capToQuiet('2026-10-21T13:41:00.000Z', '2026-10-21T15:00:00.000Z', SEOUL, NIGHT)).toBe('2026-10-21T14:00:00.000Z');
  });

  it('문구는 높임말이고 카테고리마다 자연스러운 문장을 쓴다', () => {
    expect(pingContent('context:work').body).toBe('방금도 일하셨나요?');
    expect(pingContent('context:sleep').body).toBe('방금도 주무셨나요?');
    expect(pingContent('context:relationship').body).toBe('방금도 사람들과 시간을 보내셨나요?');
    expect(pingContent('default').body).toBe('지난 30분, 무엇을 하셨나요?');
  });
});

// yields: 호출마다 마이크로태스크를 몇 번 양보해서 동시 실행이 서로 끼어들 틈을 만든다.
// (jest-expo 환경에서는 setTimeout(0)이 한 번에 10ms 넘게 걸려 타이머를 쓰지 않는다.)
function fakeNotifier(yields = 0) {
  const scheduled = new Map<string, { fireAt: string; body: string; category?: string }>();
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
      scheduled.set(id, { fireAt: fireAt.toISOString(), body: content.body, category: content.categoryIdentifier });
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
    expect(fake.scheduled.get('slot:2026-10-21T01:00:00.000Z')!.body).toBe('방금도 일하셨나요?');
    // EXP-2: 다음 칸 하나에만 [그대로 계속 · 업무] 버튼
    expect(fake.scheduled.get('slot:2026-10-21T01:00:00.000Z')!.category).toBe('continue_work');
    const withButton = [...fake.scheduled.values()].filter((v) => v.category);
    expect(withButton).toHaveLength(1);
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

  it('(D25) 일시 중지하면 그 시각 전 칸만 빼고, 끝나면 다시 묻는다', async () => {
    const { db, fake, scheduler } = await setup();
    await scheduler.reschedule();
    // 10:10에 12:00까지 멈춤 → 10:30·11:00·11:30 알림이 빠지고 12:00 알림부터 남는다
    await setSetting(db, PAUSE_KEY, { until: '2026-10-21T03:00:00.000Z' });
    const r = await scheduler.reschedule();
    expect(r).toMatchObject({ status: 'ok', cancelled: 3, added: 0 });
    expect(fake.scheduled.has('slot:2026-10-21T01:00:00.000Z')).toBe(false); // 10:30에 울릴 10:00 칸
    expect(fake.scheduled.has('slot:2026-10-21T02:30:00.000Z')).toBe(true); // 12:00에 울릴 11:30 칸

    // 다시 켜면 빠졌던 칸만 다시 건다
    await setSetting(db, PAUSE_KEY, null);
    expect(await scheduler.reschedule()).toMatchObject({ status: 'ok', cancelled: 0, added: 3 });
  });

  it('(D25) 다시 켤 때까지 멈추면 칸 알림과 만료 안내를 모두 지운다', async () => {
    const { db, fake, scheduler } = await setup();
    await scheduler.reschedule();
    await setSetting(db, PAUSE_KEY, { until: null });
    await scheduler.reschedule();
    expect(fake.scheduled.size).toBe(0);
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

  it('(D4) 강제 종료로 OS 알람이 사라져도 rearm하면 같은 id로 전부 다시 걸린다', async () => {
    const { fake, scheduler } = await setup();
    await scheduler.reschedule();
    const before = new Map(fake.scheduled);
    fake.scheduled.clear(); // 강제 종료: OS 알람은 사라졌지만 scheduled_slot 기록은 남아 있다

    expect(await scheduler.reschedule()).toMatchObject({ added: 0, cancelled: 0 }); // 차이만 보면 못 알아챈다
    const r = await scheduler.rearm();
    expect(r).toMatchObject({ status: 'ok', cancelled: 0 });
    expect(new Map([...fake.scheduled].sort())).toEqual(new Map([...before].sort()));
  });

  it('(D4) rearm은 일반 재계산과 동시에 돌지 않고 한 번으로 합쳐진다', async () => {
    const { fake, scheduler } = await setup(3);
    await scheduler.reschedule();
    fake.scheduled.clear();
    const calls = fake.calls();
    await Promise.all([scheduler.reschedule(), scheduler.rearm(), scheduler.reschedule()]);
    const pings = [...fake.scheduled.keys()].filter((k) => k.startsWith('slot:')).length;
    expect(pings).toBe(12 * 32);
    // 첫 실행(차이 없음) + 합쳐진 두 번째 실행(rearm) 한 번만 API를 부른다.
    expect(fake.calls() - calls).toBe(pings + 1);
  });

  it('(D4) rearm 중 예약이 한 번 실패해도 다음 재계산이 전부 다시 건다', async () => {
    const { fake, scheduler } = await setup();
    await scheduler.reschedule();
    const before = new Map(fake.scheduled);
    fake.scheduled.clear();

    const schedule = fake.notifier.schedule;
    let failed = false;
    fake.notifier.schedule = async (...args) => {
      if (!failed && fake.scheduled.size === 10) {
        failed = true;
        throw new Error('alarm api failed');
      }
      return schedule(...args);
    };
    await expect(scheduler.rearm()).rejects.toThrow('alarm api failed');
    expect(fake.scheduled.size).toBe(10);

    expect(await scheduler.reschedule()).toMatchObject({ status: 'ok', cancelled: 0 });
    expect(new Map([...fake.scheduled].sort())).toEqual(new Map([...before].sort()));
  });

  it('(E1) 블록을 저장하면 그 시간 칸 알림을 빼고 끝 알림을 걸며, 지우면 되돌린다', async () => {
    const { db, fake, scheduler } = await setup();
    await scheduler.reschedule();
    const block: BlockRow = {
      id: 'b1',
      kind: 'plan',
      category: 'work',
      title: '보고서',
      start_at: '2026-10-21T04:30:00.000Z',
      end_at: '2026-10-21T06:30:00.000Z',
      tz: SEOUL,
      state: 'planned',
      ended_how: null,
      deleted: false,
      client_updated_at: NOW.toISOString(),
    };
    await saveBlock(db, block);
    const r = await scheduler.reschedule();
    // 14:00·14:30·15:00·15:30 칸 알림 4개 취소, 끝 알림 1개 추가
    expect(r).toMatchObject({ status: 'ok', cancelled: 4, added: 1 });
    expect(fake.scheduled.get(blockEndId('b1'))).toEqual({ fireAt: block.end_at, body: '업무 13:30–15:30 끝' });
    expect(fake.scheduled.has('slot:2026-10-21T05:00:00.000Z')).toBe(false);

    // 바뀐 게 없으면 다시 실행해도 그대로
    expect(await scheduler.reschedule()).toMatchObject({ status: 'ok', added: 0, cancelled: 0 });

    // 연장하면 끝 알림만 옮긴다(16:00 칸 알림도 빠짐)
    await saveBlock(db, { ...block, end_at: '2026-10-21T07:00:00.000Z', client_updated_at: '2026-10-21T02:00:00.000Z' });
    expect(await scheduler.reschedule()).toMatchObject({ status: 'ok', cancelled: 2, added: 1 });
    expect(fake.scheduled.get(blockEndId('b1'))!.fireAt).toBe('2026-10-21T07:00:00.000Z');

    // 지우면 끝 알림을 취소하고 칸 알림을 되돌린다
    await saveBlock(db, { ...block, deleted: true, client_updated_at: '2026-10-21T02:30:00.000Z' });
    const back = await scheduler.reschedule();
    expect(back).toMatchObject({ status: 'ok', cancelled: 1, added: 5 });
    expect(fake.scheduled.has(blockEndId('b1'))).toBe(false);
    expect(fake.scheduled.has('slot:2026-10-21T05:00:00.000Z')).toBe(true);
  });

  it('(E1) 끝난 블록(ended)은 끝 알림을 걸지 않는다', async () => {
    const { db, fake, scheduler } = await setup();
    await saveBlock(db, {
      id: 'b2',
      kind: 'focus',
      category: 'work',
      title: null,
      start_at: '2026-10-21T01:00:00.000Z',
      end_at: '2026-10-21T03:00:00.000Z',
      tz: SEOUL,
      state: 'ended',
      ended_how: 'end_now',
      deleted: false,
      client_updated_at: NOW.toISOString(),
    });
    await scheduler.reschedule();
    expect(fake.scheduled.has(blockEndId('b2'))).toBe(false);
    expect(fake.scheduled.has('slot:2026-10-21T01:30:00.000Z')).toBe(true);
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
