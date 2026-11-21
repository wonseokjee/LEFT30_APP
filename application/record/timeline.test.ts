import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import type { BlockRow } from '@/db/types';
import { saveEntry } from './entries';
import { buildPva } from './planVsActual';
import { activeMinutesIn, blockAt, buildColumn, dayBounds, loadTimelineEntries, type TimelineEntry } from './timeline';
import { pauseTimer, resumeTimer, startTimer, stopTimer } from './timerLogic';

const SEOUL = 'Asia/Seoul';
const NY = 'America/New_York';
const DATE = '2026-11-20';
const DAY = dayBounds(DATE, SEOUL);
const MIN = 60_000;
// 서울 그날 hh:mm(UTC 밀리초)
const k = (hhmm: string, date = DATE) => {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  return Date.UTC(y, mo - 1, d, h - 9, m);
};
const NOW = k('20:00');

let n = 0;
function entry(extra: Partial<TimelineEntry> & Pick<TimelineEntry, 'start_at' | 'end_at'>): TimelineEntry {
  n += 1;
  return { id: `e${n}`, name: '집중', item_id: 'focus', root_id: 'focus', how: 'answered', pauses: [], pomodoro: null, ...extra };
}
const col = (entries: TimelineEntry[], plans?: { start: number; end: number; label: string }[]) =>
  buildColumn({ day: DAY, tz: SEOUL, now: NOW, entries, plans });

describe('시간표 타임라인(4.3a)', () => {
  it('알림 답이 같은 항목으로 맞닿으면 한 덩어리, 타이머는 같은 항목이어도 따로', () => {
    const c = col([
      entry({ start_at: k('09:00'), end_at: k('09:30') }),
      entry({ start_at: k('09:30'), end_at: k('10:00') }),
      entry({ start_at: k('10:00'), end_at: k('10:42'), how: 'timer' }),
      entry({ start_at: k('10:42'), end_at: k('11:00') }),
    ]);
    expect(c.blocks.map((b) => [b.from / 60, b.to / 60, b.timer, b.entryIds.length])).toEqual([
      [9, 10, false, 2],
      [10, 10.7, true, 1],
      [10.7, 11, false, 1],
    ]);
  });

  it('다른 항목은 맞닿아도 따로, 15분 미만은 이름 없이', () => {
    const c = col([
      entry({ start_at: k('09:00'), end_at: k('09:30') }),
      entry({ start_at: k('09:30'), end_at: k('09:40'), item_id: 'exercise', root_id: 'exercise', name: '운동' }),
    ]);
    expect(c.blocks.map((b) => [b.name, b.showName])).toEqual([
      ['집중', true],
      ['운동', false],
    ]);
  });

  it('멈춤: 1분 미만은 없음, 1~5분은 옅게, 5분 이상은 끊고 뒤 조각은 이름 없이 점선으로 잇는다', () => {
    const c = col([
      entry({
        how: 'stopwatch',
        start_at: k('15:43'),
        end_at: k('17:30'),
        pauses: [
          { start_at: k('16:00'), end_at: k('16:00') + 30_000 },
          { start_at: k('16:10'), end_at: k('16:13') },
          { start_at: k('16:40'), end_at: k('16:52') },
        ],
      }),
    ]);
    const [a, b] = c.blocks;
    expect([a.from, a.to, b.from, b.to].map((m) => m - 15 * 60)).toEqual([43, 100, 112, 150]);
    expect(a.soft.map(([s, t]) => [s - 16 * 60, t - 16 * 60])).toEqual([[10, 13]]);
    expect([a.showName, a.linked, b.showName, b.linked]).toEqual([true, false, false, true]);
  });

  it('(BREAK A) 뽀모도로는 휴식 포함 한 덩어리, 휴식은 옅게. 멈춘 만큼 휴식 자리가 밀린다', () => {
    const c = col([
      entry({
        how: 'pomodoro',
        start_at: k('13:00'),
        end_at: k('14:10'),
        pomodoro: { focus_min: 25, break_min: 5, rounds: 2 },
        pauses: [{ start_at: k('13:10'), end_at: k('13:20') }],
      }),
    ]);
    expect(c.blocks).toHaveLength(2); // 10분 멈춤에서 끊김
    const soft = c.blocks.flatMap((b) => b.soft).map(([s, t]) => [s - 13 * 60, t - 13 * 60]);
    expect(soft).toEqual([
      [35, 40],
      [65, 70],
    ]);
  });

  it('진행 중은 지금까지, 지금 멈춤 중이면 멈춘 시각까지', () => {
    const running = col([entry({ how: 'stopwatch', start_at: k('19:00'), end_at: null })]);
    expect(running.blocks[0]).toMatchObject({ to: 20 * 60, running: true });
    const paused = col([
      entry({ how: 'stopwatch', start_at: k('19:00'), end_at: null, pauses: [{ start_at: k('19:30'), end_at: null }] }),
    ]);
    expect(paused.blocks.map((b) => b.to)).toEqual([19.5 * 60]);
  });

  it('자정을 넘는 기록은 그날 몫만 그린다', () => {
    const c = col([entry({ how: 'stopwatch', start_at: k('23:30', '2026-11-19'), end_at: k('00:40') })]);
    expect(c.blocks.map((b) => [b.from, b.to])).toEqual([[0, 40]]);
  });

  it('(D27) 계획 상자는 기록이 없는 곳에만, 15분 미만 남는 조각은 그리지 않는다', () => {
    const c = col(
      [entry({ start_at: k('14:00'), end_at: k('14:50'), how: 'timer' })],
      [{ start: k('14:00'), end: k('16:00'), label: '계획 업무' }, { start: k('17:00'), end: k('17:10'), label: '계획 운동' }],
    );
    expect(c.plans).toEqual([{ from: 14 * 60 + 50, to: 16 * 60, label: '계획 업무' }]);
  });

  it('누른 자리의 블록, 빈 곳이면 null', () => {
    const c = col([entry({ start_at: k('09:00'), end_at: k('09:30') })]);
    expect(blockAt(c, 9 * 60 + 10)?.name).toBe('집중');
    expect(blockAt(c, 9 * 60 + 30)).toBeNull();
  });

  it('서머타임 날에도 기록은 현지 시각 자리에 놓인다', () => {
    const day = dayBounds('2026-03-08', NY); // 02:00~03:00이 없다
    const at = (h: number) => Date.UTC(2026, 2, 8, h); // 뉴욕 09:00 = 13:00Z(EDT)
    const c = buildColumn({ day, tz: NY, now: at(20), entries: [entry({ start_at: at(13), end_at: at(14) })] });
    expect(c.blocks.map((b) => [b.from, b.to])).toEqual([[9 * 60, 10 * 60]]);
  });
});

describe('(T4) 계획 대비 실제 분 단위', () => {
  it('멈춘 시간은 빼고, 진행 중은 지금까지, 어제 몫은 빼고 센다', () => {
    const entries = [
      entry({ how: 'stopwatch', start_at: k('23:00', '2026-11-19'), end_at: k('00:30') }),
      entry({ how: 'timer', start_at: k('10:00'), end_at: k('10:50'), pauses: [{ start_at: k('10:20'), end_at: k('10:23') }] }),
      entry({ how: 'stopwatch', start_at: k('19:40'), end_at: null }),
    ];
    expect(entries.map((e) => activeMinutesIn(e, DAY, NOW))).toEqual([30, 47, 20]);
  });

  it('옛 업무·자기개발 계획은 집중 줄로 합치고, 차이가 가장 큰 줄을 숫자 두 개로', () => {
    const pva = buildPva(
      [
        entry({ start_at: k('09:00'), end_at: k('10:00') }),
        entry({ start_at: k('18:00'), end_at: k('18:30'), item_id: 'exercise', root_id: 'exercise', name: '운동' }),
      ],
      [
        { category: 'work', target_minutes: 120 },
        { category: 'self_dev', target_minutes: 60 },
      ],
      [{ category: 'exercise', start_at: new Date(k('19:00')).toISOString(), end_at: new Date(k('20:00')).toISOString() } as BlockRow],
      DAY,
      NOW,
    );
    expect(pva.rows).toEqual([
      { item: 'focus', name: '집중', target: 180, actual: 60 },
      { item: 'exercise', name: '운동', target: 60, actual: 30 },
    ]);
    expect(pva.line).toBe('오늘 집중 1h · 계획 3h');
  });

  it('계획도 기록도 없으면 empty', () => {
    expect(buildPva([], [], [], DAY, NOW)).toEqual({ state: 'empty', rows: [], line: null });
  });
});

describe('DB에서 읽기', () => {
  it('알림 답과 타이머 세션을 항목 이름·멈춤과 함께 읽는다', async () => {
    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    const iso = (t: number) => new Date(t).toISOString();
    await saveEntry(db, [
      { slot_start: iso(k('09:00')), tz: SEOUL, category: 'exercise', note: null, source: 'answered', answered_at: iso(k('09:31')), client_updated_at: iso(k('09:31')) },
    ]);
    await startTimer(db, { kind: 'stopwatch', itemId: 'focus', now: k('10:00'), tz: SEOUL });
    await pauseTimer(db, k('10:10'));
    await resumeTimer(db, k('10:20'));
    await stopTimer(db, k('10:40'));
    const rows = await loadTimelineEntries(db, DAY[0], DAY[1]);
    expect(rows.map((r) => [r.name, r.how, r.pauses.length])).toEqual([
      ['운동', 'answered', 0],
      ['집중', 'stopwatch', 1],
    ]);
    const c = buildColumn({ day: DAY, tz: SEOUL, now: NOW, entries: rows });
    expect(c.blocks.map((b) => [b.from - 9 * 60, b.to - 9 * 60])).toEqual([
      [0, 30],
      [60, 70],
      [80, 100],
    ]);
  });
});
