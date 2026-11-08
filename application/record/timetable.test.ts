import type { SlotRow } from '@/db/types';
import { dayColumn, daySlots, isPastSlot, shiftDate } from './timetable';

const SEOUL = 'Asia/Seoul';
const NY = 'America/New_York';

function row(slotStart: string, category: SlotRow['category']): SlotRow {
  return {
    slot_start: slotStart,
    tz: SEOUL,
    category,
    note: null,
    source: 'answered',
    answered_at: slotStart,
    client_updated_at: slotStart,
  };
}

describe('시간표 칸', () => {
  it('어제 날짜는 달·해가 바뀌어도 맞다', () => {
    expect(shiftDate('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('서울 하루는 00:00부터 23:30까지 48칸이다', () => {
    const slots = daySlots('2026-11-08', SEOUL);
    expect(slots).toHaveLength(48);
    expect(slots[0]).toBe('2026-11-07T15:00:00.000Z');
    expect(slots[47]).toBe('2026-11-08T14:30:00.000Z');
  });

  it('서머타임 시작일은 46칸, 끝나는 날은 50칸이다', () => {
    expect(daySlots('2026-03-08', NY)).toHaveLength(46);
    expect(daySlots('2026-11-01', NY)).toHaveLength(50);
  });

  it('카트만두(+05:45)도 현지 :00/:30에 칸이 놓인다', () => {
    const slots = daySlots('2026-11-08', 'Asia/Kathmandu');
    expect(slots).toHaveLength(48);
    expect(slots[0]).toBe('2026-11-07T18:15:00.000Z');
  });

  it('기록은 현지 시각 행에 놓이고, 같은 카테고리가 이어지면 첫 칸에만 이름을 쓴다', () => {
    const cells = dayColumn('2026-11-08', SEOUL, [
      row('2026-11-08T00:00:00.000Z', 'work'), // 09:00
      row('2026-11-08T00:30:00.000Z', 'work'), // 09:30
      row('2026-11-08T01:00:00.000Z', 'rest'), // 10:00
      row('2026-11-09T00:00:00.000Z', 'work'), // 다음 날이라 빠진다
    ]);
    expect(cells).toHaveLength(48);
    expect(cells[18]).toMatchObject({ category: 'work', runStart: true });
    expect(cells[19]).toMatchObject({ category: 'work', runStart: false });
    expect(cells[20]).toMatchObject({ category: 'rest', runStart: true });
    expect(cells[21]).toMatchObject({ category: null, runStart: false, slotStart: '2026-11-08T01:30:00.000Z' });
    expect(cells.filter((c) => c.category)).toHaveLength(3);
  });

  it('서머타임으로 사라진 시각은 칸이 없고, 두 번 오는 시각은 기록된 쪽을 보여준다', () => {
    // 2026-03-08 뉴욕 02:00~03:00이 없다
    const spring = dayColumn('2026-03-08', NY, []);
    expect(spring[4].slotStart).toBeNull();
    expect(spring[5].slotStart).toBeNull();
    // 2026-11-01 뉴욕 01:00~02:00이 두 번. 두 번째 01:00(06:00Z)만 기록됨
    const fall = dayColumn('2026-11-01', NY, [{ ...row('2026-11-01T06:00:00.000Z', 'sleep'), tz: NY }]);
    expect(fall[2]).toMatchObject({ slotStart: '2026-11-01T06:00:00.000Z', category: 'sleep' });
  });

  it('끝난 칸만 탭할 수 있다', () => {
    const now = new Date('2026-11-08T05:40:00Z'); // 14:40 KST
    expect(isPastSlot('2026-11-08T05:00:00.000Z', now)).toBe(true); // 14:00 칸
    expect(isPastSlot('2026-11-08T05:30:00.000Z', now)).toBe(false); // 지금 칸
    expect(isPastSlot('2026-11-08T06:00:00.000Z', now)).toBe(false); // 미래
  });
});
