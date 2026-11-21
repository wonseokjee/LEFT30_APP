import { getSetting, setSetting } from '@/db/records';
import type { Db, TimerKind } from '@/db/types';
import { MINUTE_MS } from '@/lib/localTime';
import { activeMs, openPause, pomodoroPhase, type PomodoroCfg, type Running } from './timerLogic';

/*
 * 홈 타이머 화면 계산(T5, left30-visual.md 4.1·4.3c, timer-modes HOME·CONTROL·FORGOT).
 *
 *  평소:     다음 30분 기록 알림까지            진행 중:   TOEIC RC · 스톱워치
 *            12:41                                      1:23
 *            [시작]                                      [일시정지] [정지]
 *
 * 숫자 형식: 1시간 미만은 분:초(59:59, 0:05), 1시간부터는 시:분(1:00, 12:05). 화면 읽기는 늘 단위를 붙인다.
 */

export const KIND_LABEL: Record<TimerKind, string> = { stopwatch: '스톱워치', pomodoro: '뽀모도로', timer: '타이머' };
export const KIND_HINT: Record<TimerKind, string> = {
  stopwatch: '멈출 때까지 셉니다',
  pomodoro: '', // 고른 구간 값으로 만든다(pomodoroHint)
  timer: '끝 시각을 정합니다',
};
export const POMODORO_PRESETS: Pick<PomodoroCfg, 'focus_min' | 'break_min'>[] = [
  { focus_min: 25, break_min: 5 },
  { focus_min: 40, break_min: 10 },
  { focus_min: 50, break_min: 10 },
];
export const ROUNDS_MIN = 1;
export const ROUNDS_MAX = 12;
export const TIMER_STEP_MIN = 15;
export const TIMER_MIN_MIN = 15;
export const TIMER_MAX_MIN = 12 * 60;
export const FORGOT_MS = 3 * 60 * MINUTE_MS; // 디자인 리뷰 D11
export const STOP_LINE_MS = 5_000; // CONTROL D8

export function pomodoroHint(c: Pick<PomodoroCfg, 'focus_min' | 'break_min'>): string {
  return `${c.focus_min}분 집중 + ${c.break_min}분 휴식`;
}

// 초 → 큰 숫자 글자.
export function clockText(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  if (s < 3600) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}

// 초 → 화면 읽기("1시간 23분", "12분 41초", "5초").
export function clockSpeech(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m ? `${h}시간 ${m}분` : `${h}시간`;
  if (m > 0) return s % 60 ? `${m}분 ${s % 60}초` : `${m}분`;
  return `${s}초`;
}

// 기록한 길이 글자("1시간 23분", "45분", "1분 미만").
export function durationText(ms: number): string {
  const total = Math.floor(ms / MINUTE_MS);
  if (total < 1) return '1분 미만';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export type TimerView = {
  seconds: number;
  label: string; // 숫자 위 "제목 · 방식"
  speech: string; // 화면 읽기
  paused: boolean;
  ended: boolean; // 타이머가 정한 끝에 닿음(끝 시트를 띄울 때)
};

export function timerView(r: Running, itemName: string, now: number): TimerView {
  const open = openPause(r);
  const paused = open !== null;
  const at = open ? open.start_at : now;
  const { entry } = r;
  if (entry.how === 'timer' && entry.planned_end_at !== null) {
    const seconds = Math.max(0, Math.ceil((entry.planned_end_at - at) / 1000));
    return {
      seconds,
      label: `${itemName} · ${KIND_LABEL.timer}`,
      speech: `${clockSpeech(seconds)} 남음`,
      paused,
      ended: seconds === 0,
    };
  }
  if (entry.how === 'pomodoro' && r.pomodoro) {
    const ph = pomodoroPhase(r.pomodoro, activeMs(entry, r.pauses, now));
    const seconds = Math.ceil(ph.remainingMs / 1000);
    const rounds = `${ph.round}/${r.pomodoro.rounds}바퀴`;
    const label = ph.phase === 'break' ? `휴식 · ${rounds}` : `${itemName} · ${KIND_LABEL.pomodoro} ${rounds}`;
    return {
      seconds,
      label,
      speech: `${ph.phase === 'break' ? '휴식' : '집중'} ${clockSpeech(seconds)} 남음`,
      paused,
      ended: ph.phase === 'done',
    };
  }
  const seconds = Math.floor(activeMs(entry, r.pauses, now) / 1000);
  return {
    seconds,
    label: `${itemName} · ${KIND_LABEL.stopwatch}`,
    speech: `${clockSpeech(seconds)} 지남`,
    paused,
    ended: false,
  };
}

// 정지 뒤 5초 줄: "집중 1시간 23분 기록함".
export function stopLine(itemName: string, recordedMs: number): string {
  return `${itemName} ${durationText(recordedMs)} 기록함`;
}

// FORGOT B: 스톱워치가 3시간 넘게 돌고 있으면 앱을 열 때 묻는다(일시정지 중은 묻지 않음).
export function forgotHours(r: Running, now: number): number | null {
  if (r.entry.how !== 'stopwatch' || openPause(r)) return null;
  const active = activeMs(r.entry, r.pauses, now);
  return active >= FORGOT_MS ? Math.floor(active / (60 * MINUTE_MS)) : null;
}

// 지난번 시작 시트 값(D38 "지난번 방식이 미리 골라져 있다", D6 지난번 항목).
export const TIMER_PREFS_KEY = 'timer_last';
export type TimerPrefs = {
  kind: TimerKind;
  itemId: string | null; // null = 항목 없이 집중
  pomodoro: PomodoroCfg;
  minutes: number;
};
export const DEFAULT_PREFS: TimerPrefs = {
  kind: 'stopwatch',
  itemId: null,
  pomodoro: { focus_min: 25, break_min: 5, rounds: 4 },
  minutes: 60,
};

export async function readTimerPrefs(db: Db): Promise<TimerPrefs> {
  const saved = await getSetting<Partial<TimerPrefs>>(db, TIMER_PREFS_KEY);
  return { ...DEFAULT_PREFS, ...saved, pomodoro: { ...DEFAULT_PREFS.pomodoro, ...saved?.pomodoro } };
}

export async function saveTimerPrefs(db: Db, prefs: TimerPrefs): Promise<void> {
  await setSetting(db, TIMER_PREFS_KEY, prefs);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
