import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { readPingData, saveContinue } from './continueAction';

const SLOT = '2026-11-12T03:00:00.000Z'; // 12:00 칸, 12:30 종료

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  const slots = () => db.all<{ category: string; source: string }>('SELECT category, source FROM slot');
  return { db, slots };
}

describe('알림 버튼 그대로 계속', () => {
  it('60분 안이면 continued로 저장하고 ping_answered를 남긴다', async () => {
    const { db, slots } = await setup();
    const r = await saveContinue(db, {
      slotStart: SLOT,
      category: 'work',
      now: new Date('2026-11-12T03:31:00.000Z'),
      fallbackTz: 'Asia/Seoul',
    });
    expect(r).toBe('saved');
    expect(await slots()).toEqual([{ category: 'work', source: 'continued' }]);
    expect((await db.all<{ type: string }>('SELECT type FROM event')).map((e) => e.type)).toEqual(['ping_answered']);
  });

  it('60분이 지나면 late, 이미 기록된 칸은 덮지 않는다', async () => {
    const { db, slots } = await setup();
    const late = new Date('2026-11-12T05:00:00.000Z');
    await saveContinue(db, { slotStart: SLOT, category: 'rest', now: late, fallbackTz: 'Asia/Seoul' });
    expect(await saveContinue(db, { slotStart: SLOT, category: 'work', now: late, fallbackTz: 'Asia/Seoul' })).toBe(
      'exists',
    );
    expect(await slots()).toEqual([{ category: 'rest', source: 'late' }]);
  });

  it('Android의 dataString도 읽는다', () => {
    expect(readPingData({ dataString: '{"kind":"ping","slotStart":"x"}' })).toEqual({ kind: 'ping', slotStart: 'x' });
    expect(readPingData({ data: { kind: 'ping' } })).toEqual({ kind: 'ping' });
    expect(readPingData({ dataString: '깨진 값' })).toEqual({});
  });
});
