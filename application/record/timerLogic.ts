import { getSetting, setSetting } from '@/db/records';
import {
  TIMER_HOWS,
  type Db,
  type EntryRow,
  type PauseRow,
  type PomodoroRow,
  type TimerKind,
} from '@/db/types';
import { MINUTE_MS, SLOT_MS } from '@/lib/localTime';
import { uuidv7 } from '@/lib/uuid';
import { PAUSE_KEY } from '@/scheduler/plan';

/*
 * 타이머 3종(스톱워치·뽀모도로·타이머)의 시작·일시정지·재개·정지(T3, docs/designs/left30-timer-modes.md POMO·CONTROL·PAUSE).
 *
 *  [없음] --start--> [진행] --pause--> [일시정지] --resume--> [진행]
 *                     │  └─────────── stop ──────────────┘
 *                     ▼
 *                   [끝(end_at)] --정지 취소(5초)--> [진행 또는 일시정지]
 *
 * 세션 하나 = entry 한 줄(end_at NULL = 진행 중, 동시에 하나: entry_running 부분 유일 인덱스).
 * 멈춘 구간은 pause 표. 뽀모도로 구간 설정은 pomodoro 표(v4). 단계·집중 분은 저장하지 않고 계산한다.
 * planned_end_at: 타이머는 정한 끝, 뽀모도로는 마지막 바퀴 휴식 끝. 재개하면 멈춘 길이만큼 뒤로 민다.
 * 기록 쓰기(알림 답 등)는 record/entries.ts의 saveEntry가 맡고, 타이머 세션 줄은 여기서만 쓴다.
 */

export type PomodoroCfg = Pick<PomodoroRow, 'focus_min' | 'break_min' | 'rounds'>;
export type Running = { entry: EntryRow; pauses: PauseRow[]; pomodoro: PomodoroCfg | null };

// 정지 뒤 30분 알림(G15): 'on'이면 스케줄러가 바로 다시 건다(기본). 'off'면 알림 스위치를 "다시 켤 때까지" 끈다.
export const AFTER_TIMER_KEY = 'after_timer_pings';
export type AfterTimer = 'on' | 'off';

export async function readAfterTimer(db: Db): Promise<AfterTimer> {
  return (await getSetting<AfterTimer>(db, AFTER_TIMER_KEY)) === 'off' ? 'off' : 'on';
}

const TIMER_IN = TIMER_HOWS.map((h) => `'${h}'`).join(', ');

// 타이머 끝 시각에 답이 없으면 이만큼 뒤에 정한 끝 시각으로 끝낸다(옛 집중 블록 끝 시트와 같은 규칙).
export const TIMER_ANSWER_MS = SLOT_MS;

export async function readRunning(db: Db): Promise<Running | null> {
  const entry = await db.first<EntryRow>(
    `SELECT * FROM entry WHERE end_at IS NULL AND deleted = 0 AND how IN (${TIMER_IN})`,
  );
  if (!entry) return null;
  return {
    entry,
    pauses: await db.all<PauseRow>('SELECT * FROM pause WHERE entry_id = ? ORDER BY start_at', [entry.id]),
    pomodoro: await db.first<PomodoroCfg>(
      'SELECT focus_min, break_min, rounds FROM pomodoro WHERE entry_id = ?',
      [entry.id],
    ),
  };
}

export function openPause(r: Running): PauseRow | null {
  return r.pauses.find((p) => p.end_at === null) ?? null;
}

export type StartParams = {
  kind: TimerKind;
  itemId: string;
  now: number;
  tz: string;
  minutes?: number; // 타이머만
  pomodoro?: PomodoroCfg; // 뽀모도로만
};

// 이미 진행 중이면 새로 만들지 않고 그 세션을 돌려준다(두 번 탭).
export async function startTimer(
  db: Db,
  p: StartParams,
): Promise<{ status: 'started' | 'running'; running: Running }> {
  let started = false;
  await db.transaction(async (tx) => {
    if (await readRunning(tx)) return;
    const id = uuidv7(p.now);
    await tx.run(
      `INSERT INTO entry (id, item_id, how, start_at, end_at, planned_end_at, tz, note, deleted, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, 0, ?)`,
      [id, p.itemId, p.kind, p.now, plannedEnd(p), p.tz, p.now],
    );
    if (p.kind === 'pomodoro') {
      const c = p.pomodoro!;
      await tx.run('INSERT INTO pomodoro (entry_id, focus_min, break_min, rounds) VALUES (?, ?, ?, ?)', [
        id,
        c.focus_min,
        c.break_min,
        c.rounds,
      ]);
    }
    started = true;
  });
  return { status: started ? 'started' : 'running', running: (await readRunning(db))! };
}

function plannedEnd(p: StartParams): number | null {
  if (p.kind === 'timer') {
    if (!p.minutes || p.minutes <= 0) throw new Error('timer needs minutes');
    return p.now + p.minutes * MINUTE_MS;
  }
  if (p.kind === 'pomodoro') {
    if (!p.pomodoro) throw new Error('pomodoro needs cfg');
    return p.now + cycleMs(p.pomodoro) * p.pomodoro.rounds;
  }
  return null;
}

export async function pauseTimer(db: Db, now: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const r = await readRunning(tx);
    if (!r || openPause(r)) return false;
    await tx.run('INSERT INTO pause (entry_id, start_at, end_at) VALUES (?, ?, NULL)', [r.entry.id, now]);
    await tx.run('UPDATE entry SET updated_at = ? WHERE id = ?', [now, r.entry.id]);
    return true;
  });
}

export async function resumeTimer(db: Db, now: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const r = await readRunning(tx);
    const open = r && openPause(r);
    if (!r || !open) return false;
    await tx.run('UPDATE pause SET end_at = ? WHERE entry_id = ? AND start_at = ?', [now, r.entry.id, open.start_at]);
    const shift = now - open.start_at;
    await tx.run(
      'UPDATE entry SET planned_end_at = planned_end_at + ?, updated_at = ? WHERE id = ?',
      [shift, now, r.entry.id],
    );
    return true;
  });
}

// [정지 취소]에 필요한 정지 전 상태.
export type Stopped = {
  entryId: string;
  endAt: number;
  droppedPause: number | null; // 일시정지 중 정지하면 그 멈춤을 지우고 멈춘 시각에 끝낸다
  prevPings: unknown; // 정지 전 알림 스위치 값(항상 끄기일 때 되돌림용)
};

/*
 * 정지. 일시정지 중이면 멈춘 시각에 끝낸다(멈춘 꼬리를 남기지 않음). 뽀모도로는 마지막 바퀴 끝을 넘지 않는다.
 * at을 주면 그 시각에 끝낸다(타이머 끝 시트 [여기서 끝]은 정한 끝 시각).
 */
export async function stopTimer(db: Db, now: number, at?: number): Promise<Stopped | null> {
  return db.transaction(async (tx) => {
    const r = await readRunning(tx);
    if (!r) return null;
    const open = openPause(r);
    let end = open ? open.start_at : (at ?? now);
    if (r.entry.how === 'pomodoro' && r.entry.planned_end_at !== null) end = Math.min(end, r.entry.planned_end_at);
    end = Math.max(end, r.entry.start_at);
    if (open) await tx.run('DELETE FROM pause WHERE entry_id = ? AND start_at = ?', [r.entry.id, open.start_at]);
    await tx.run('UPDATE entry SET end_at = ?, updated_at = ? WHERE id = ?', [end, now, r.entry.id]);
    const prevPings = await getSetting<unknown>(tx, PAUSE_KEY);
    await applyAfterTimer(tx);
    return { entryId: r.entry.id, endAt: end, droppedPause: open ? open.start_at : null, prevPings };
  });
}

// 정지 뒤 30분 알림 설정을 적용한다. 'on'은 할 일이 없다(진행 중 세션이 없어지면 스케줄러가 다시 건다).
async function applyAfterTimer(tx: Db): Promise<void> {
  if ((await readAfterTimer(tx)) === 'off') await setSetting(tx, PAUSE_KEY, { until: null });
}

// [정지 취소](CONTROL D8): 세션을 이어 간다. 그사이 다른 세션이 시작됐으면 false.
export async function cancelStop(db: Db, s: Stopped, now: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    if (await readRunning(tx)) return false;
    await tx.run('UPDATE entry SET end_at = NULL, updated_at = ? WHERE id = ? AND end_at = ?', [now, s.entryId, s.endAt]);
    if (s.droppedPause !== null) {
      await tx.run('INSERT INTO pause (entry_id, start_at, end_at) VALUES (?, ?, NULL)', [s.entryId, s.droppedPause]);
    }
    await setSetting(tx, PAUSE_KEY, s.prevPings);
    return true;
  });
}

// 타이머 끝 시트 [30분 더]. 이미 지난 끝이면 지금부터 센다.
export async function extendTimer(db: Db, now: number, minutes = 30): Promise<boolean> {
  return db.transaction(async (tx) => {
    const r = await readRunning(tx);
    if (!r || r.entry.how !== 'timer' || r.entry.planned_end_at === null) return false;
    const base = Math.max(r.entry.planned_end_at, now);
    await tx.run('UPDATE entry SET planned_end_at = ?, updated_at = ? WHERE id = ?', [
      base + minutes * MINUTE_MS,
      now,
      r.entry.id,
    ]);
    return true;
  });
}

/*
 * 앱을 열 때·포그라운드로 올 때. 시간이 지난 세션을 정리한다.
 * - 뽀모도로: 마지막 바퀴가 끝났으면 그 시각에 끝낸다.
 * - 타이머: 정한 끝 시각이 지났으면 끝 시트를 띄우고(endSheet), 30분이 더 지나도록 답이 없으면 정한 끝 시각에 끝낸다.
 * 일시정지 중인 세션은 건드리지 않는다.
 */
export async function settleTimer(db: Db, now: number): Promise<{ endSheet: string | null; ended: boolean }> {
  const r = await readRunning(db);
  if (!r || openPause(r) || r.entry.planned_end_at === null) return { endSheet: null, ended: false };
  const planned = r.entry.planned_end_at;
  if (now < planned) return { endSheet: null, ended: false };
  if (r.entry.how === 'pomodoro' || now >= planned + TIMER_ANSWER_MS) {
    await stopTimer(db, now, planned);
    return { endSheet: null, ended: true };
  }
  return { endSheet: r.entry.id, ended: false };
}

// ── 계산(저장하지 않음) ─────────────────────────────────────────

export function cycleMs(c: PomodoroCfg): number {
  return (c.focus_min + c.break_min) * MINUTE_MS;
}

// 세션이 실제로 흐른 시간(멈춘 구간을 길이와 상관없이 모두 뺌, PAUSE "큰 숫자·합계는 멈춘 시간을 모두 뺀다").
export function activeMs(entry: Pick<EntryRow, 'start_at' | 'end_at'>, pauses: PauseRow[], now: number): number {
  const end = entry.end_at ?? now;
  let paused = 0;
  for (const p of pauses) {
    const s = Math.max(p.start_at, entry.start_at);
    const e = Math.min(p.end_at ?? end, end);
    if (e > s) paused += e - s;
  }
  return Math.max(0, end - entry.start_at - paused);
}

export type PomodoroPhase = {
  round: number; // 1부터. 끝났으면 rounds
  phase: 'focus' | 'break' | 'done';
  remainingMs: number; // 지금 단계의 남은 시간
  focusMs: number; // 지금까지 집중한 시간(BREAK A: 과목 합계·타이머 화면은 집중 분만)
};

export function pomodoroPhase(c: PomodoroCfg, active: number): PomodoroPhase {
  const cycle = cycleMs(c);
  const focus = c.focus_min * MINUTE_MS;
  const k = Math.floor(active / cycle);
  if (k >= c.rounds) return { round: c.rounds, phase: 'done', remainingMs: 0, focusMs: c.rounds * focus };
  const within = active - k * cycle;
  const inFocus = within < focus;
  return {
    round: k + 1,
    phase: inFocus ? 'focus' : 'break',
    remainingMs: inFocus ? focus - within : cycle - within,
    focusMs: k * focus + Math.min(within, focus),
  };
}

export type TimerSignal = {
  key: string; // `${entryId}:${n}`. 같은 세션 안에서 n은 신호 순서
  fireAt: number;
  kind: 'break' | 'focus' | 'pomodoro_end' | 'timer_end';
  round: number;
};

/*
 * 앞으로 울릴 타이머 신호(POMO 단계 신호, 타이머 끝). 일시정지 중이면 없다(재개 때 다시 계산).
 * 뽀모도로: 바퀴마다 집중 끝 = 휴식 시작, 휴식 끝 = 다음 바퀴 집중 시작, 마지막 휴식 끝 = 뽀모도로 끝.
 */
export function timerSignals(r: Running, now: number): TimerSignal[] {
  if (openPause(r)) return [];
  const { entry } = r;
  if (entry.how === 'timer' && entry.planned_end_at !== null && entry.planned_end_at > now) {
    return [{ key: `${entry.id}:0`, fireAt: entry.planned_end_at, kind: 'timer_end', round: 0 }];
  }
  if (entry.how !== 'pomodoro' || !r.pomodoro) return [];
  const c = r.pomodoro;
  const active = activeMs(entry, r.pauses, now);
  const out: TimerSignal[] = [];
  for (let i = 0; i < c.rounds; i++) {
    const focusEnd = i * cycleMs(c) + c.focus_min * MINUTE_MS;
    const roundEnd = (i + 1) * cycleMs(c);
    const last = i === c.rounds - 1;
    const marks: [number, TimerSignal['kind'], number][] = [
      [focusEnd, 'break', i + 1],
      [roundEnd, last ? 'pomodoro_end' : 'focus', last ? i + 1 : i + 2],
    ];
    for (const [offset, kind, round] of marks) {
      if (offset <= active) continue;
      out.push({ key: `${entry.id}:${2 * i + (kind === 'break' ? 0 : 1)}`, fireAt: now + (offset - active), kind, round });
    }
  }
  return out;
}

/*
 * 30분 알림을 쉬는 구간 [entry.start_at, coverUntil](D2). 스톱워치와 일시정지 중은 끝을 모른다(Infinity).
 * 타이머는 정한 끝까지(끝 시트를 기다리는 동안은 다시 묻는다, 옛 집중 블록과 같음), 뽀모도로는 마지막 바퀴 끝까지.
 */
export function coverUntil(r: Running): number {
  if (openPause(r) || r.entry.planned_end_at === null) return Infinity;
  return r.entry.planned_end_at;
}

export function signalBody(s: TimerSignal, itemName: string, c: PomodoroCfg | null): string {
  switch (s.kind) {
    case 'break':
      return `휴식 시작 · ${c?.break_min ?? 0}분`;
    case 'focus':
      return `${s.round}바퀴째 집중 시작`;
    case 'pomodoro_end':
      return `${itemName} 뽀모도로 ${s.round}바퀴 끝`;
    case 'timer_end':
      return `${itemName} 타이머 끝`;
  }
}
