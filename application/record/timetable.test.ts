import { daySlots, isPastSlot, shiftDate, slotAtMinute } from './timetable';

const SEOUL = 'Asia/Seoul';
const NY = 'America/New_York';

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

  it('누른 자리의 30분 칸, 서머타임으로 사라진 시각은 없음', () => {
    expect(slotAtMinute('2026-11-08', SEOUL, 9 * 60 + 47)).toBe('2026-11-08T00:30:00.000Z'); // 09:30 칸
    expect(slotAtMinute('2026-03-08', NY, 2 * 60 + 10)).toBeNull();
  });

  it('끝난 칸만 탭할 수 있다', () => {
    const now = new Date('2026-11-08T05:40:00Z'); // 14:40 KST
    expect(isPastSlot('2026-11-08T05:00:00.000Z', now)).toBe(true); // 14:00 칸
    expect(isPastSlot('2026-11-08T05:30:00.000Z', now)).toBe(false); // 지금 칸
    expect(isPastSlot('2026-11-08T06:00:00.000Z', now)).toBe(false); // 미래
  });
});
