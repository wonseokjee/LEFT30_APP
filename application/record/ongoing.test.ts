import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { ongoingContent } from './ongoing';
import { pauseTimer, readRunning, startTimer } from './timerLogic';

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 21, 1, 0);

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  return db;
}

describe('(T8) 진행 중 고정 알림 내용', () => {
  it('스톱워치는 멈춘 시간을 뺀 시작 시각을 기준으로 위로 센다', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: T0, tz: 'Asia/Seoul' });
    expect(ongoingContent((await readRunning(db))!, '집중', T0 + 10 * MIN)).toEqual({
      title: '집중 · 스톱워치',
      text: '',
      chronoBase: T0,
      countDown: false,
      paused: false,
    });
  });

  it('타이머는 정한 끝을 기준으로 아래로, 일시정지면 크로노미터 없이 멈춘 숫자', async () => {
    const db = await setup();
    await startTimer(db, { kind: 'timer', itemId: 'focus', now: T0, tz: 'Asia/Seoul', minutes: 60 });
    expect(ongoingContent((await readRunning(db))!, '집중', T0 + MIN)).toMatchObject({ chronoBase: T0 + 60 * MIN, countDown: true });
    await pauseTimer(db, T0 + 15 * MIN);
    expect(ongoingContent((await readRunning(db))!, '집중', T0 + 30 * MIN)).toMatchObject({
      text: '일시정지 중 · 45:00',
      chronoBase: null,
      paused: true,
    });
  });

  it('뽀모도로는 단계와 그 단계 남은 시간', async () => {
    const db = await setup();
    await startTimer(db, {
      kind: 'pomodoro',
      itemId: 'focus',
      now: T0,
      tz: 'Asia/Seoul',
      pomodoro: { focus_min: 25, break_min: 5, rounds: 4 },
    });
    const now = T0 + 57 * MIN;
    expect(ongoingContent((await readRunning(db))!, 'TOEIC', now)).toEqual({
      title: 'TOEIC · 뽀모도로',
      text: '휴식 2/4바퀴',
      chronoBase: now + 3 * MIN,
      countDown: true,
      paused: false,
    });
  });
});
