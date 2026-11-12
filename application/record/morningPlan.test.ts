import { openNodeDb } from '@/test/nodeDb';
import { migrate } from '@/db/migrate';
import { MIGRATIONS } from '@/db/schema';
import { savePlan, saveSlot } from '@/db/records';
import type { Category, SlotSource } from '@/db/types';
import { acceptSame, takeMorningOffer } from './morningPlan';

const SEOUL = 'Asia/Seoul';
const z = (hhmm: string, day = 21) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, day, h - 9, m)).toISOString();
};
const MORNING = new Date(z('08:10'));

async function setup() {
  const db = openNodeDb();
  await migrate(db, MIGRATIONS);
  const slot = (hhmm: string, category: Category, source: SlotSource = 'answered', day = 20) =>
    saveSlot(db, { slot_start: z(hhmm, day), tz: SEOUL, category, note: null, source, answered_at: z(hhmm, day), client_updated_at: z(hhmm, day) });
  return { db, slot };
}

describe('(E1) 아침 계획 제안', () => {
  it('첫날(어제 계획·기록 없음)은 바로 새로 짜기, 그날은 다시 묻지 않는다', async () => {
    const { db } = await setup();
    expect(await takeMorningOffer(db, MORNING, SEOUL)).toEqual({ kind: 'new', date: '2026-10-21' });
    expect(await takeMorningOffer(db, new Date(z('09:00')), SEOUL)).toBeNull();
  });

  it('15시 이후 첫 진입이나 오늘 계획이 이미 있으면 띄우지 않는다', async () => {
    const { db } = await setup();
    expect(await takeMorningOffer(db, new Date(z('15:10')), SEOUL)).toBeNull();
    const { db: db2 } = await setup();
    await savePlan(db2, '2026-10-21', { work: 60 }, z('07:00'));
    expect(await takeMorningOffer(db2, MORNING, SEOUL)).toBeNull();
  });

  it('어제 계획이 있으면 그 값을, 없으면 어제 기록 8칸 이상으로(inferred 제외) 제안한다', async () => {
    const { db } = await setup();
    await savePlan(db, '2026-10-20', { work: 360, rest: 0 }, z('07:00', 20));
    expect(await takeMorningOffer(db, MORNING, SEOUL)).toEqual({
      kind: 'suggest',
      date: '2026-10-21',
      targets: { work: 360 },
      source: 'yesterday_plan',
    });

    const { db: db2, slot } = await setup();
    for (const t of ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']) await slot(t, 'work');
    await slot('12:30', 'rest', 'inferred');
    expect(await takeMorningOffer(db2, MORNING, SEOUL)).toEqual({ kind: 'new', date: '2026-10-21' });

    const { db: db3, slot: slot3 } = await setup();
    for (const t of ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00']) await slot3(t, 'work');
    await slot3('19:00', 'exercise', 'late');
    const offer = await takeMorningOffer(db3, MORNING, SEOUL);
    expect(offer).toMatchObject({ kind: 'suggest', targets: { work: 210, exercise: 30 }, source: 'yesterday_actual' });

    if (offer?.kind !== 'suggest') throw new Error('no offer');
    await acceptSame(db3, offer, MORNING);
    const rows = await db3.all<{ category: string; target_minutes: number }>(
      'SELECT category, target_minutes FROM plan WHERE local_date = ? AND target_minutes > 0 ORDER BY category',
      ['2026-10-21'],
    );
    expect(rows).toEqual([
      { category: 'exercise', target_minutes: 30 },
      { category: 'work', target_minutes: 210 },
    ]);
  });
});
