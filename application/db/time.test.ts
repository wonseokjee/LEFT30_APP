import { isoToMs, msToIso } from './time';

describe('옛 ISO 글자 ↔ v3 밀리초', () => {
  it('밀리초까지 그대로 오간다', () => {
    const iso = '2026-11-18T09:00:00.123Z';
    expect(isoToMs(iso)).toBe(Date.UTC(2026, 10, 18, 9, 0, 0, 123));
    expect(msToIso(isoToMs(iso))).toBe(iso);
  });

  it('읽을 수 없는 글자는 조용히 NaN이 되지 않고 오류를 낸다', () => {
    expect(() => isoToMs('not a time')).toThrow(/invalid ISO time/);
  });
});
