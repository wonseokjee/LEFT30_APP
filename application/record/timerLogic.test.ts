import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { getSetting, setSetting } from '@/db/records';
import { PAUSE_KEY } from '@/scheduler/plan';
import {
  activeMs,
  AFTER_TIMER_KEY,
  cancelStop,
  coverUntil,
  extendTimer,
  pauseTimer,
  pomodoroPhase,
  readRunning,
  resumeTimer,
  settleTimer,
  startTimer,
  stopTimer,
  timerSignals,
  TIMER_ANSWER_MS,
  type PomodoroCfg,
} from './timerLogic';

const MIN = 60_000;
const T0 = Date.parse('2026-11-20T01:00:00.000Z'); // 10:00 KST
const at = (min: number) => T0 + min * MIN;
const POMO: PomodoroCfg = { focus_min: 25, break_min: 5, rounds: 4 };
const tz = 'Asia/Seoul';

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  return db;
}

describe('시작', () => {
  it('세 종류의 정한 끝: 스톱워치 없음, 타이머 정한 분, 뽀모도로 바퀴 × (집중 + 휴식)', async () => {
    const db = await setup();
    const sw = await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: at(0), tz });
    expect(sw.running.entry.planned_end_at).toBeNull();
    await stopTimer(db, at(1));
    const tm = await startTimer(db, { kind: 'timer', itemId: 'focus', now: at(2), tz, minutes: 50 });
    expect(tm.running.entry.planned_end_at).toBe(at(52));
    await stopTimer(db, at(3));
    const pm = await startTimer(db, { kind: 'pomodoro', itemId: 'focus', now: at(4), tz, pomodoro: POMO });
    expect(pm.running.entry.planned_end_at).toBe(at(4 + 120));
    expect(pm.running.pomodoro).toEqual(POMO);
  });

  it('두 번 눌러도 하나만 시작하고 진행 중인 세션을 돌려준다', async () => {
    const db = await setup();
    const a = await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: at(0), tz });
    const b = await startTimer(db, { kind: 'timer', itemId: 'exercise', now: at(0), tz, minutes: 30 });
    expect(a.status).toBe('started');
    expect(b.status).toBe('running');
    expect(b.running.entry.id).toBe(a.running.entry.id);
    expect(await db.all('SELECT id FROM entry')).toHaveLength(1);
  });
});

describe('일시정지·재개·정지', () => {
  it('재개하면 정한 끝이 멈춘 길이만큼 뒤로 간다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'timer', itemId: 'focus', now: at(0), tz, minutes: 30 });
    expect(await pauseTimer(db, at(10))).toBe(true);
    expect(await pauseTimer(db, at(11))).toBe(false); // 이미 멈춤
    expect(await resumeTimer(db, at(17))).toBe(true);
    const r = (await readRunning(db))!;
    expect(r.entry.planned_end_at).toBe(at(37));
    expect(activeMs(r.entry, r.pauses, at(20))).toBe(13 * MIN);
  });

  it('일시정지 중 정지하면 멈춘 시각에 끝내고 멈춘 꼬리를 남기지 않는다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: at(0), tz });
    await pauseTimer(db, at(40));
    const s = (await stopTimer(db, at(55)))!;
    expect(s.endAt).toBe(at(40));
    expect(await db.all('SELECT * FROM pause')).toEqual([]);
    expect(await readRunning(db)).toBeNull();
  });

  it('[정지 취소]는 세션과 멈춤을 그대로 되살린다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: at(0), tz });
    await pauseTimer(db, at(40));
    const s = (await stopTimer(db, at(55)))!;
    expect(await cancelStop(db, s, at(55))).toBe(true);
    const r = (await readRunning(db))!;
    expect(r.entry.end_at).toBeNull();
    expect(r.pauses).toEqual([{ entry_id: r.entry.id, start_at: at(40), end_at: null }]);
  });

  it('뽀모도로를 늦게 정지해도 마지막 바퀴 끝을 넘지 않는다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'pomodoro', itemId: 'focus', now: at(0), tz, pomodoro: { ...POMO, rounds: 1 } });
    expect((await stopTimer(db, at(90)))!.endAt).toBe(at(30));
  });
});

describe('정지 뒤 30분 알림(G15)', () => {
  it('기본(항상 켜기)은 알림 스위치를 건드리지 않는다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: at(0), tz });
    await stopTimer(db, at(10));
    expect(await getSetting(db, PAUSE_KEY)).toBeNull();
  });

  it('항상 끄기면 정지할 때 알림을 다시 켤 때까지 끄고, 정지 취소하면 되돌린다', async () => {
    const db = await setup();
    await setSetting(db, AFTER_TIMER_KEY, 'off');
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: at(0), tz });
    const s = (await stopTimer(db, at(10)))!;
    expect(await getSetting(db, PAUSE_KEY)).toEqual({ until: null });
    await cancelStop(db, s, at(10));
    expect(await getSetting(db, PAUSE_KEY)).toBeNull();
  });
});

describe('뽀모도로 단계 계산(BREAK A)', () => {
  it.each([
    [0, { round: 1, phase: 'focus', remainingMs: 25 * MIN, focusMs: 0 }],
    [25, { round: 1, phase: 'break', remainingMs: 5 * MIN, focusMs: 25 * MIN }],
    [31, { round: 2, phase: 'focus', remainingMs: 24 * MIN, focusMs: 26 * MIN }],
    [120, { round: 4, phase: 'done', remainingMs: 0, focusMs: 100 * MIN }],
  ])('%i분째', (min, expected) => {
    expect(pomodoroPhase(POMO, min * MIN)).toEqual(expected);
  });

  it('4바퀴 = 시간표 120분, 집중 100분', () => {
    expect(pomodoroPhase(POMO, 120 * MIN).focusMs).toBe(100 * MIN);
  });
});

describe('신호와 알림 쉬는 구간', () => {
  it('뽀모도로 신호는 바퀴마다 휴식 시작·집중 시작, 마지막은 끝', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'pomodoro', itemId: 'focus', now: at(0), tz, pomodoro: { ...POMO, rounds: 2 } });
    const sig = timerSignals((await readRunning(db))!, at(0));
    expect(sig.map((s) => [s.kind, s.round, (s.fireAt - T0) / MIN])).toEqual([
      ['break', 1, 25],
      ['focus', 2, 30],
      ['break', 2, 55],
      ['pomodoro_end', 2, 60],
    ]);
  });

  it('일시정지 중에는 신호가 없고 알림은 끝없이 쉰다. 재개하면 남은 신호를 멈춘 만큼 미뤄 다시 건다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'pomodoro', itemId: 'focus', now: at(0), tz, pomodoro: { ...POMO, rounds: 1 } });
    await pauseTimer(db, at(10));
    let r = (await readRunning(db))!;
    expect(timerSignals(r, at(12))).toEqual([]);
    expect(coverUntil(r)).toBe(Infinity);
    await resumeTimer(db, at(20));
    r = (await readRunning(db))!;
    expect(timerSignals(r, at(20)).map((s) => (s.fireAt - T0) / MIN)).toEqual([35, 40]);
    expect(coverUntil(r)).toBe(at(40));
  });

  it('스톱워치는 끝을 몰라 알림을 계속 쉬고, 타이머는 정한 끝에 신호 하나', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: at(0), tz });
    expect(coverUntil((await readRunning(db))!)).toBe(Infinity);
    await stopTimer(db, at(1));
    await startTimer(db, { kind: 'timer', itemId: 'focus', now: at(2), tz, minutes: 45 });
    const r = (await readRunning(db))!;
    expect(timerSignals(r, at(2)).map((s) => [s.kind, s.fireAt])).toEqual([['timer_end', at(47)]]);
    expect(coverUntil(r)).toBe(at(47));
  });
});

describe('앱을 열 때 정리', () => {
  it('뽀모도로 마지막 바퀴가 지났으면 그 시각에 끝낸다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'pomodoro', itemId: 'focus', now: at(0), tz, pomodoro: POMO });
    expect(await settleTimer(db, at(119))).toEqual({ endSheet: null, ended: false });
    expect(await settleTimer(db, at(200))).toEqual({ endSheet: null, ended: true });
    expect(await db.first('SELECT end_at FROM entry')).toEqual({ end_at: at(120) });
  });

  it('타이머 끝이 지나면 끝 시트, 30분 더 지나도록 답이 없으면 정한 끝에 끝낸다', async () => {
    const db = await setup();
    const { running } = await startTimer(db, { kind: 'timer', itemId: 'focus', now: at(0), tz, minutes: 30 });
    expect(await settleTimer(db, at(31))).toEqual({ endSheet: running.entry.id, ended: false });
    expect(await settleTimer(db, at(30) + TIMER_ANSWER_MS)).toEqual({ endSheet: null, ended: true });
    expect(await db.first('SELECT end_at FROM entry')).toEqual({ end_at: at(30) });
  });

  it('끝 시트 [30분 더]: 지난 끝이면 지금부터 30분', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'timer', itemId: 'focus', now: at(0), tz, minutes: 30 });
    await extendTimer(db, at(33));
    expect((await readRunning(db))!.entry.planned_end_at).toBe(at(63));
  });

  it('일시정지 중인 세션은 정리하지 않는다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'timer', itemId: 'focus', now: at(0), tz, minutes: 30 });
    await pauseTimer(db, at(5));
    expect(await settleTimer(db, at(300))).toEqual({ endSheet: null, ended: false });
  });
});
