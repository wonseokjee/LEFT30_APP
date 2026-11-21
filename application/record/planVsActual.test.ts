import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { ALL_DAYS } from '@/scheduler/plan';
import { eveningStartMin, homeBars, noteHomeViewed } from './planVsActual';

const SEOUL = 'Asia/Seoul';
const z = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, 21, h - 9, m)).toISOString();
};

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

describe('(G19·D37) 홈 오늘 지금까지', () => {
  const row = (item: string, target: number, actual: number) => ({ item, name: item, target, actual });
  it('목표 줄만, 진행률 높은 두 개, 같으면 실제가 긴 쪽', () => {
    expect(homeBars([row('a', 60, 30), row('b', 0, 90), row('c', 120, 60), row('d', 60, 45)])!.map((r) => r.item)).toEqual(['d', 'c']);
  });
  it('목표가 없으면 null, 실제 0분 목표 줄은 그대로', () => {
    expect(homeBars([row('a', 0, 30)])).toBeNull();
    expect(homeBars([row('a', 120, 0)])).toEqual([row('a', 120, 0)]);
  });
});
