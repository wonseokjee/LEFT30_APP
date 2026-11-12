import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import type { BlockRow, Category } from '@/db/types';
import { ALL_DAYS } from '@/scheduler/plan';
import { buildPva, eveningStartMin, noteHomeViewed } from './planVsActual';

const SEOUL = 'Asia/Seoul';
const DATE = '2026-10-21';
const z = (hhmm: string, day = 21) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, day, h - 9, m)).toISOString();
};
const slot = (hhmm: string, category: Category, day = 21) => ({ slot_start: z(hhmm, day), tz: SEOUL, category });
const block = (category: Category, s: string, e: string) => ({ category, start_at: z(s), end_at: z(e) }) as BlockRow;

describe('(D6) 오늘 계획 대비 실제', () => {
  it('계획도 기록도 없으면 empty, 줄 없음', () => {
    expect(buildPva([], [], [], DATE)).toEqual({ state: 'empty', rows: [], line: null });
  });

  it('계획만 있으면 planOnly', () => {
    const pva = buildPva([], [{ category: 'work', target_minutes: 360 }], [], DATE);
    expect(pva.state).toBe('planOnly');
    expect(pva.rows).toEqual([{ category: 'work', target: 360, actual: 0 }]);
  });

  it('기록만 있으면 가장 많이 한 일 한 줄. 다른 날 칸은 빼고, 같으면 업무가 먼저', () => {
    const pva = buildPva(
      [slot('09:00', 'rest'), slot('09:30', 'work'), slot('23:30', 'work', 20)],
      [],
      [],
      DATE,
    );
    expect(pva.state).toBe('actualOnly');
    expect(pva.line).toBe('오늘 가장 많이 한 일 · 업무 0.5h');
  });

  it('(DR-5) 블록 합이 목표보다 크면 목표를 올리고, 차이가 가장 큰 카테고리를 숫자 두 개로', () => {
    const pva = buildPva(
      [slot('09:00', 'work'), slot('09:30', 'work'), slot('10:00', 'exercise')],
      [{ category: 'work', target_minutes: 120 }],
      [block('work', '13:00', '17:00'), block('exercise', '19:00', '20:00')],
      DATE,
    );
    expect(pva.rows).toEqual([
      { category: 'work', target: 240, actual: 60 },
      { category: 'exercise', target: 60, actual: 30 },
    ]);
    expect(pva.line).toBe('오늘 업무 1h · 계획 4h');
  });
});

describe('(D5) 저녁 열람 이벤트', () => {
  it('자정을 넘기는 방해금지 시작부터, 하루 한 번만', async () => {
    const quiet = [{ startMin: 23 * 60, endMin: 7 * 60, days: ALL_DAYS }];
    expect(eveningStartMin(quiet, 3)).toBe(23 * 60);
    expect(eveningStartMin([], 3)).toBe(23 * 60 + 30);

    const db = openNodeDb();
    await migrate(db, MIGRATIONS);
    expect(await noteHomeViewed(db, new Date(z('22:00')), SEOUL, quiet)).toBe(false);
    expect(await noteHomeViewed(db, new Date(z('23:10')), SEOUL, quiet)).toBe(true);
    expect(await noteHomeViewed(db, new Date(z('23:40')), SEOUL, quiet)).toBe(false);
  });
});
