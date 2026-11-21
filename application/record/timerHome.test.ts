import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { findOrCreateItem, recentItems } from './items';
import {
  clockSpeech,
  clockText,
  DEFAULT_PREFS,
  durationText,
  homeDate,
  idleState,
  nextPingSeconds,
  forgotHours,
  readTimerPrefs,
  saveTimerPrefs,
  stopLine,
  timerView,
} from './timerHome';
import { pauseTimer, readRunning, startTimer, stopTimer } from './timerLogic';

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 21, 1, 0);
const TZ = 'Asia/Seoul';

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  return db;
}

describe('(T5) 큰 숫자 형식', () => {
  it('1시간 미만은 분:초, 1시간부터는 시:분, 앞자리 0 없음', () => {
    expect([5, 599, 3599, 3600, 4980, 43500].map(clockText)).toEqual(['0:05', '9:59', '59:59', '1:00', '1:23', '12:05']);
  });
  it('화면 읽기는 단위를 붙인다', () => {
    expect([5, 60, 761, 3600, 4980].map(clockSpeech)).toEqual(['5초', '1분', '12분 41초', '1시간', '1시간 23분']);
  });
  it('기록한 길이와 정지 줄', () => {
    expect([30_000, 45 * MIN, 83 * MIN, 120 * MIN].map(durationText)).toEqual(['1분 미만', '45분', '1시간 23분', '2시간']);
    expect(stopLine('집중', 83 * MIN)).toBe('집중 1시간 23분 기록함');
  });
});

describe('(T5) 진행 중 숫자와 라벨', () => {
  it('스톱워치는 지난 시간, 일시정지하면 멈춘다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: T0, tz: TZ });
    let v = timerView((await readRunning(db))!, '집중', T0 + 83 * MIN);
    expect([v.seconds, v.label, v.speech, v.paused]).toEqual([83 * 60, '집중 · 스톱워치', '1시간 23분 지남', false]);
    await pauseTimer(db, T0 + 10 * MIN);
    v = timerView((await readRunning(db))!, '집중', T0 + 20 * MIN);
    expect([v.seconds, v.paused]).toEqual([600, true]);
  });

  it('타이머는 남은 시간, 일시정지 중에는 멈춘 시각 기준, 끝에 닿으면 ended', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'timer', itemId: 'focus', now: T0, tz: TZ, minutes: 60 });
    const r = (await readRunning(db))!;
    expect(timerView(r, '집중', T0 + 15 * MIN).seconds).toBe(45 * 60);
    expect(timerView(r, '집중', T0 + 61 * MIN)).toMatchObject({ seconds: 0, ended: true });
    await pauseTimer(db, T0 + 15 * MIN);
    expect(timerView((await readRunning(db))!, '집중', T0 + 40 * MIN).seconds).toBe(45 * 60);
  });

  it('뽀모도로는 단계의 남은 시간, 휴식이면 "휴식 · n/m바퀴"', async () => {
    const db = await setup();
    await startTimer(db, {
      kind: 'pomodoro',
      itemId: 'focus',
      now: T0,
      tz: TZ,
      pomodoro: { focus_min: 25, break_min: 5, rounds: 4 },
    });
    const r = (await readRunning(db))!;
    expect(timerView(r, 'TOEIC', T0 + 10 * MIN)).toMatchObject({ seconds: 15 * 60, label: 'TOEIC · 뽀모도로 1/4바퀴' });
    expect(timerView(r, 'TOEIC', T0 + 57 * MIN)).toMatchObject({ seconds: 3 * 60, label: '휴식 · 2/4바퀴' });
    expect(timerView(r, 'TOEIC', T0 + 120 * MIN).ended).toBe(true);
  });

  it('(FORGOT) 스톱워치 3시간부터 묻고, 일시정지 중이거나 다른 방식이면 묻지 않는다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: T0, tz: TZ });
    const r = (await readRunning(db))!;
    expect(forgotHours(r, T0 + 179 * MIN)).toBeNull();
    expect(forgotHours(r, T0 + 6 * 60 * MIN + 5 * MIN)).toBe(6);
    await pauseTimer(db, T0 + 200 * MIN);
    expect(forgotHours((await readRunning(db))!, T0 + 400 * MIN)).toBeNull();
    await stopTimer(db, T0 + 400 * MIN);
    await startTimer(db, { kind: 'timer', itemId: 'focus', now: T0, tz: TZ, minutes: 600 });
    expect(forgotHours((await readRunning(db))!, T0 + 300 * MIN)).toBeNull();
  });
});

describe('(T5) 시작 시트 값', () => {
  it('지난번 값을 기억하고, 처음은 스톱워치·25/5·4바퀴', async () => {
    const db = await setup();
    expect(await readTimerPrefs(db)).toEqual(DEFAULT_PREFS);
    await saveTimerPrefs(db, { ...DEFAULT_PREFS, kind: 'pomodoro', itemId: 'x' });
    expect(await readTimerPrefs(db)).toMatchObject({ kind: 'pomodoro', itemId: 'x', minutes: 60 });
  });

  it('새 항목: 같은 이름이면 그 항목, 10자까지, 숨긴 항목은 꺼낸다', async () => {
    const db = await setup();
    const a = await findOrCreateItem(db, 'focus', '  TOEIC   RC ', T0);
    expect(a.name).toBe('TOEIC RC');
    expect((await findOrCreateItem(db, 'focus', 'TOEIC RC', T0)).id).toBe(a.id);
    expect((await findOrCreateItem(db, 'focus', '가나다라마바사아자차카', T0)).name).toBe('가나다라마바사아자차');
    await db.run('UPDATE item SET hidden = 1 WHERE id = ?', [a.id]);
    await findOrCreateItem(db, 'focus', 'TOEIC RC', T0);
    expect((await db.first<{ hidden: number }>('SELECT hidden FROM item WHERE id = ?', [a.id]))!.hidden).toBe(0);
    await expect(findOrCreateItem(db, 'focus', '   ', T0)).rejects.toThrow();
  });

  it('최근 칩은 30일 안에 기록한 집중 세부 항목, 마지막 기록 순', async () => {
    const db = await setup();
    const a = await findOrCreateItem(db, 'focus', '영어', T0);
    const b = await findOrCreateItem(db, 'focus', '수학', T0);
    await findOrCreateItem(db, 'focus', '기록 없음', T0);
    const old = await findOrCreateItem(db, 'focus', '옛날', T0);
    await startTimer(db, { kind: 'stopwatch', itemId: old.id, now: T0 - 31 * 24 * 60 * MIN, tz: TZ });
    await stopTimer(db, T0 - 31 * 24 * 60 * MIN + MIN);
    await startTimer(db, { kind: 'stopwatch', itemId: b.id, now: T0, tz: TZ });
    await stopTimer(db, T0 + MIN);
    await startTimer(db, { kind: 'stopwatch', itemId: a.id, now: T0 + 2 * MIN, tz: TZ });
    await stopTimer(db, T0 + 3 * MIN);
    expect((await recentItems(db, 'focus', T0 + 10 * MIN)).map((x) => x.name)).toEqual(['영어', '수학']);
  });
});

describe('(T11) 평소 숫자 자리', () => {
  const at = (hhmm: string, sec = 0) => {
    const [h, m] = hhmm.split(':').map(Number);
    return Date.UTC(2026, 10, 21, h - 9, m, sec); // 서울
  };
  it('다음 :00/:30까지 남은 초', () => {
    expect(nextPingSeconds(at('19:47', 35), TZ)).toBe(12 * 60 + 25);
    expect(nextPingSeconds(at('19:30', 0), TZ)).toBe(30 * 60);
    expect(nextPingSeconds(at('19:59', 59), TZ)).toBe(1);
  });
  it('라벨: 방해금지 > 알림 꺼짐 > 평소, 방해금지는 끝나는 시각과 잠', () => {
    const quiet = [{ startMin: 23 * 60, endMin: 7 * 60, days: [0, 1, 2, 3, 4, 5, 6] }];
    expect(idleState({ now: at('20:00'), tz: TZ, quiet, pause: null })).toEqual({ label: '다음 30분 기록 알림까지', sleeping: false });
    expect(idleState({ now: at('20:00'), tz: TZ, quiet, pause: { until: null } }).label).toBe('30분 기록 알림 꺼짐');
    expect(idleState({ now: at('23:30'), tz: TZ, quiet, pause: { until: null } })).toEqual({
      label: '방해금지 · 7:00부터 30분 기록 알림',
      sleeping: true,
    });
  });
  it('날짜', () => {
    expect(homeDate(at('19:47'), TZ)).toBe('11월 21일 (토)');
  });
});
