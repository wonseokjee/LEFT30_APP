import { readFileSync } from 'fs';
import { join } from 'path';
import { SERVER_KNOWN, serverKnows } from './serverKnown';

// 서버 엔티티 파일의 `export const NAME = [ ... ] as const` 목록을 읽는다.
function serverList(file: string, name: string): string[] {
  const src = readFileSync(join(__dirname, '../../server/src/Entity', file), 'utf8');
  const start = src.indexOf(`export const ${name} = [`);
  const m = start < 0 ? null : src.slice(start).match(/\[([^\]]*)\] as const/);
  if (!m) throw new Error(`${file}에 ${name}이 없다`);
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}

describe('(T6) 서버가 아는 값', () => {
  it('목록은 서버 엔티티와 같다(서버를 바꾸면 여기도 바꾼다)', () => {
    expect(SERVER_KNOWN.categories).toEqual(serverList('slot.entity.ts', 'CATEGORIES'));
    expect(SERVER_KNOWN.slotSources).toEqual(serverList('slot.entity.ts', 'SLOT_SOURCES'));
    expect(SERVER_KNOWN.blockKinds).toEqual(serverList('block.entity.ts', 'BLOCK_KINDS'));
    expect(SERVER_KNOWN.blockStates).toEqual(serverList('block.entity.ts', 'BLOCK_STATES'));
    expect(SERVER_KNOWN.blockEndHows).toEqual(serverList('block.entity.ts', 'BLOCK_END_HOWS'));
    expect(SERVER_KNOWN.eventTypes).toEqual(serverList('event.entity.ts', 'EVENT_TYPES'));
  });

  it('값 칸 하나라도 모르면 false', () => {
    expect(serverKnows('slot', { category: 'work', source: 'answered' })).toBe(true);
    expect(serverKnows('slot', { category: 'focus', source: 'answered' })).toBe(false);
    expect(serverKnows('slot', { category: 'work', source: 'stopwatch' })).toBe(false);
    expect(serverKnows('plan', { category: 'other' })).toBe(false);
    expect(serverKnows('block', { kind: 'focus', category: 'work', state: 'ended', ended_how: null })).toBe(true);
    expect(serverKnows('block', { kind: 'focus', category: 'work', state: 'ended', ended_how: 'stopped' })).toBe(false);
    expect(serverKnows('event', { type: 'timer_started' })).toBe(false);
  });
});
