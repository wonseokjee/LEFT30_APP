import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GRAY_0, GRAY_1, GRAY_5 } from '@/assets/palette';
import PlanVsActual from '@/components/home/PlanVsActual';
import Timer from '@/components/timer/timer';
import { textOn } from '@/record/categoryStyle';
import { getItem } from '@/record/items';
import { clockText, forgotHours, STOP_LINE_MS, stopLine, timerView } from '@/record/timerHome';
import {
  activeMs,
  cancelStop,
  pauseTimer,
  readAfterTimer,
  readRunning,
  resumeTimer,
  stopTimer,
  type Running,
  type Stopped,
} from '@/record/timerLogic';
import { afterTimerChange, getRuntime, settleTimerNow } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';
import ForgotSheet from './ForgotSheet';
import { ACCENT, MAX_SCALE } from './sheetStyle';
import TimerStartSheet from './TimerStartSheet';

const NUMBER_SCALE = 1.3; // D19 큰 숫자 1.3배 상한

// "계속"을 누른 세션은 앱이 살아 있는 동안 다시 묻지 않는다(D11).
const forgotAsked = new Set<string>();

type StopNote = { stopped: Stopped; text: string; pingsBack: boolean };

/*
 * 홈 가운데(T5, visual 4.1·4.3c). 진행 중에는 [시작]과 "오늘 지금까지"를 숨기고 [일시정지] [정지]만(D6).
 *   평소                          진행 중                       일시정지
 *   다음 30분 기록 알림까지        TOEIC RC · 스톱워치             TOEIC RC · 스톱워치
 *   12:41                         1:23                           1:23 (흐리게)
 *   [시작]                        [일시정지] [정지]               일시정지 중  [재개] [정지]
 *   오늘 지금까지
 * [정지]는 확인 없이 바로 정지하고 "집중 1시간 23분 기록함 · 정지 취소"를 5초 띄운다(D8).
 * 글꼴·숫자 칸·선반 배치는 T10·T11에서 바꾼다.
 */
export default function TimerHome({ showBars }: { showBars: boolean }) {
  const blockVersion = useAppStore((s) => s.blockVersion);
  const [running, setRunning] = useState<Running | null>(null);
  const [name, setName] = useState('집중');
  const [now, setNow] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<StopNote | null>(null);
  const [forgot, setForgot] = useState<number | null>(null);
  const endAsked = useRef<string | null>(null);

  const load = useCallback(() => {
    const db = getRuntime().db;
    readRunning(db)
      .then(async (r) => {
        setRunning(r);
        if (!r) return setForgot(null);
        setName((await getItem(db, r.entry.item_id))?.name ?? '집중');
        const h = forgotHours(r, Date.now());
        setForgot(h !== null && !forgotAsked.has(r.entry.id) ? h : null);
      })
      .catch((e) => console.warn('timer load failed', e));
  }, []);

  useEffect(load, [load, blockVersion]);
  useFocusEffect(useCallback(load, [load]));

  // 진행 중에는 1초마다 숫자를 다시 그린다.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), STOP_LINE_MS);
    return () => clearTimeout(t);
  }, [note]);

  const view = running ? timerView(running, name, now) : null;

  // 앱이 열려 있는 동안 끝에 닿으면 정리에 맡긴다(타이머는 끝 시트, 30분 넘게 지났거나 뽀모도로면 끝냄).
  // 시트를 여기서 직접 열면 앱 열 때 정리와 순서가 엇갈려 이미 끝난 세션의 시트가 남는다.
  useEffect(() => {
    if (!running || !view?.ended || view.paused || endAsked.current === running.entry.id) return;
    endAsked.current = running.entry.id;
    void settleTimerNow().then(load);
  }, [running, view?.ended, view?.paused, load]);

  // 버튼 잠금은 DB 쓰기 동안만. 알림 재계산(몇 초)은 기다리지 않는다: 기다리면 그사이 [정지 취소]가 막힌다.
  // 재계산은 겹치면 끝난 뒤 한 번 더 돌아(singleFlight) 마지막 상태로 맞춰진다.
  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      void afterTimerChange();
    } catch (e) {
      console.warn('timer action failed', e);
    } finally {
      setBusy(false);
      load();
    }
  };

  const stopAt = async (at?: number) => {
    const r = running;
    if (!r) return;
    const db = getRuntime().db;
    const stopped = await stopTimer(db, Date.now(), at);
    if (!stopped) return;
    const closed = r.pauses.filter((p) => p.end_at !== null && p.start_at !== stopped.droppedPause);
    const recorded = activeMs({ start_at: r.entry.start_at, end_at: stopped.endAt }, closed, stopped.endAt);
    setNote({ stopped, text: stopLine(name, recorded), pingsBack: (await readAfterTimer(db)) === 'on' });
  };

  const undoStop = (s: Stopped) =>
    act(async () => {
      setNote(null);
      await cancelStop(getRuntime().db, s, Date.now());
    });

  return (
    <View style={styles.center}>
      {view && running ? (
        <>
          <Text style={styles.label} maxFontSizeMultiplier={MAX_SCALE}>
            {view.label}
          </Text>
          <Text
            style={[styles.number, view.paused && styles.dim]}
            maxFontSizeMultiplier={NUMBER_SCALE}
            accessibilityLabel={view.paused ? `${view.speech}, 일시정지 중` : view.speech}
          >
            {clockText(view.seconds)}
          </Text>
          {view.paused && (
            <Text style={styles.small} maxFontSizeMultiplier={MAX_SCALE}>
              일시정지 중
            </Text>
          )}
          <View style={styles.row}>
            {view.paused ? (
              <Btn primary label='재개' onPress={() => act(() => resumeTimer(getRuntime().db, Date.now()))} />
            ) : (
              <Btn label='일시정지' onPress={() => act(() => pauseTimer(getRuntime().db, Date.now()))} />
            )}
            <Btn label='정지' onPress={() => act(() => stopAt())} />
          </View>
          {forgot !== null && (
            <ForgotSheet
              running={running}
              hours={forgot}
              onKeep={() => {
                forgotAsked.add(running.entry.id);
                setForgot(null);
              }}
              onStopAt={async (at) => {
                forgotAsked.add(running.entry.id);
                setForgot(null);
                await act(() => stopAt(at));
              }}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.label} maxFontSizeMultiplier={MAX_SCALE}>
            다음 30분 기록 알림까지
          </Text>
          <Timer />
          {note && (
            <View style={styles.note}>
              <Text style={styles.small} maxFontSizeMultiplier={MAX_SCALE} accessibilityLiveRegion='polite'>
                {note.text} ·{' '}
              </Text>
              <TouchableOpacity onPress={() => undoStop(note.stopped)} accessibilityLabel='정지 취소'>
                <Text style={styles.link} maxFontSizeMultiplier={MAX_SCALE}>
                  정지 취소
                </Text>
              </TouchableOpacity>
              {note.pingsBack && (
                <Text style={styles.tiny} maxFontSizeMultiplier={MAX_SCALE}>
                  {'  '}30분 알림 다시 켬
                </Text>
              )}
            </View>
          )}
          <Btn primary label='시작' a11y='타이머 시작' onPress={() => setStarting(true)} />
          {showBars && <PlanVsActual />}
          <TimerStartSheet visible={starting} onClose={() => setStarting(false)} />
        </>
      )}
    </View>
  );
}

function Btn(p: { label: string; onPress: () => void; primary?: boolean; a11y?: string }) {
  return (
    <TouchableOpacity
      style={[styles.btn, p.primary ? styles.btnPrimary : styles.btnLine]}
      onPress={p.onPress}
      accessibilityRole='button'
      accessibilityLabel={p.a11y ?? p.label}
    >
      <Text style={[styles.btnText, p.primary && { color: textOn(ACCENT) }]} maxFontSizeMultiplier={MAX_SCALE}>
        {p.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 16, gap: 8 },
  label: { color: GRAY_5, fontSize: 15 },
  number: { color: GRAY_1, fontSize: 110, includeFontPadding: false },
  dim: { opacity: 0.45 },
  small: { color: GRAY_5, fontSize: 15 },
  tiny: { color: GRAY_5, fontSize: 13 },
  link: { color: GRAY_0, fontSize: 15, textDecorationLine: 'underline', paddingVertical: 12 },
  note: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
  btn: { minHeight: 48, minWidth: 120, borderRadius: 24, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: ACCENT },
  btnLine: { borderWidth: 1, borderColor: GRAY_5 },
  btnText: { color: GRAY_0, fontSize: 16 },
});
