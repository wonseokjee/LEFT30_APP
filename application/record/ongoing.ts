import { activeMs, openPause, pomodoroPhase, type Running } from './timerLogic';
import { clockText, KIND_LABEL } from './timerHome';

/*
 * 진행 중 고정 알림 내용(T8, timer-modes NOTIF·D12). 숫자는 시스템 크로노미터가 그린다(1초 갱신 없음).
 *   스톱워치: "TOEIC · 스톱워치"  + 지난 시간(위로 셈)
 *   타이머:   "TOEIC · 타이머"    + 남은 시간(아래로 셈)
 *   뽀모도로: "TOEIC · 뽀모도로", "집중 1/4바퀴" 또는 "휴식 2/4바퀴" + 그 단계 남은 시간
 *   일시정지: 크로노미터 없이 "일시정지 중 · 12:34", 버튼 [재개]
 * 버튼은 [일시정지]/[재개] 하나(D12). 정지는 앱에서 한다(알림창에는 정지 취소가 없어서).
 */

export type OngoingContent = {
  title: string;
  text: string;
  chronoBase: number | null; // 크로노미터 기준 시각(UTC ms). 위로 셀 때는 시작, 아래로 셀 때는 끝
  countDown: boolean;
  paused: boolean;
};

export function ongoingContent(r: Running, name: string, now: number): OngoingContent {
  const open = openPause(r);
  const at = open ? open.start_at : now;
  const { entry } = r;
  const title = `${name} · ${KIND_LABEL[entry.how as keyof typeof KIND_LABEL] ?? ''}`;
  const active = activeMs(entry, r.pauses, now);

  let text = '';
  let base: number;
  let countDown = false;
  let shownSec: number;
  if (entry.how === 'pomodoro' && r.pomodoro) {
    const ph = pomodoroPhase(r.pomodoro, active);
    text = `${ph.phase === 'break' ? '휴식' : '집중'} ${ph.round}/${r.pomodoro.rounds}바퀴`;
    base = now + ph.remainingMs;
    countDown = true;
    shownSec = Math.ceil(ph.remainingMs / 1000);
  } else if (entry.how === 'timer' && entry.planned_end_at !== null) {
    base = entry.planned_end_at;
    countDown = true;
    shownSec = Math.max(0, Math.ceil((entry.planned_end_at - at) / 1000));
  } else {
    base = now - active;
    shownSec = Math.floor(active / 1000);
  }

  if (open) {
    return { title, text: [text, `일시정지 중 · ${clockText(shownSec)}`].filter(Boolean).join(' · '), chronoBase: null, countDown, paused: true };
  }
  return { title, text, chronoBase: base, countDown, paused: false };
}
