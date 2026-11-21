import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Text } from '@/components/ui/Text';
import PlanVsActual from '@/components/home/PlanVsActual';
import { labelLine, lastDigitShift, roomLayout, COLON_EM, DIGIT_EM, type RoomLayout } from '@/components/home/roomLayout';
import { deviceTz } from '@/lib/localTime';
import { getSetting } from '@/db/records';
import { getItem } from '@/record/items';
import { HOME_BARS_KEY } from '@/record/planVsActual';
import {
  clockSpeech,
  clockText,
  forgotHours,
  homeDate,
  idleState,
  nextPingSeconds,
  STOP_LINE_MS,
  stopLine,
  timerView,
  type IdleState,
} from '@/record/timerHome';
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
import { readPause, readQuiet } from '@/scheduler/scheduler';
import { useAppStore } from '@/store/appStore';
import { syncOngoing } from '@/notifications/ongoingTask';
import { makeStyles, useTheme } from '@/theme/theme';
import ForgotSheet from './ForgotSheet';
import { MAX_SCALE } from './sheetStyle';
import TimerStartSheet from './TimerStartSheet';

const NUMBER_SCALE = 1.3; // D19 큰 숫자 1.3배 상한
// 주아 글꼴 위 800 / 아래 200(1000 기준). 줄 높이 = 글자 크기면 숫자 아래 끝(기준선)은 위에서 0.8.
const JUA_ASCENT = 0.8;
const ROOM = { light: require('@/assets/room/room-light.jpg'), dark: require('@/assets/room/room-dark.jpg') };
const DESK = require('@/assets/room/desk-light.png'); // 밤 책상은 아직 없다(밝은 가구 먼저, README)
const CAT = {
  sit_watch: require('@/assets/cat/calico_sit_watch.png'),
  loaf: require('@/assets/cat/calico_loaf.png'),
  sleep: require('@/assets/cat/calico_sleep.png'),
};
const CAT_RATIO = { sit_watch: 1392 / 1130, loaf: 1545 / 1018, sleep: 1392 / 1130 };

// "계속"을 누른 세션은 앱이 살아 있는 동안 다시 묻지 않는다(D11).
const forgotAsked = new Set<string>();

type StopNote = { stopped: Stopped; text: string; pingsBack: boolean };

/*
 * 홈 = 고양이 방(visual 4.1·4.3c, 시안 room/home-desk.html). 방 그림이 화면 전체 배경이고,
 * 큰 숫자와 고양이는 책상 위, [시작]과 "오늘 지금까지"는 바닥 아래쪽(탭 위 20 기준).
 *   평소: 라벨 "다음 30분 기록 알림까지"(알림 꺼짐·방해금지면 그 라벨), 숫자 = 다음 알림까지, 고양이 앉아 봄(방해금지면 잠)
 *   진행 중: 라벨 "제목 · 방식", 숫자 = 타이머, 고양이 식빵, 바닥은 [일시정지] [정지]만(D6)
 *   일시정지: 숫자 흐리게 멈춤, 버튼 위에 "일시정지 중", [재개](강조) [정지]
 * [정지]는 확인 없이 바로 정지하고 5초 "집중 1시간 23분 기록함 · 정지 취소"(D8). 그 5초 동안은 "오늘 지금까지" 자리에
 * 보인다(버튼 위에 두면 책상 다리와 겹친다).
 */
export default function TimerHome({ showBars }: { showBars: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const blockVersion = useAppStore((s) => s.blockVersion);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [name, setName] = useState('집중');
  const [idle, setIdle] = useState<IdleState>({ label: '다음 30분 기록 알림까지', sleeping: false });
  const [now, setNow] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<StopNote | null>(null);
  const [forgot, setForgot] = useState<number | null>(null);
  const [barsOn, setBarsOn] = useState(true);
  const endAsked = useRef<string | null>(null);

  const load = useCallback(() => {
    const db = getRuntime().db;
    getSetting<boolean>(db, HOME_BARS_KEY)
      .then((v) => setBarsOn(v !== false))
      .catch(() => setBarsOn(true));
    readRunning(db)
      .then(async (r) => {
        setRunning(r);
        if (!r) {
          setForgot(null);
          const [quiet, pause] = await Promise.all([readQuiet(db), readPause(db)]);
          setIdle(idleState({ now: Date.now(), tz: deviceTz(), quiet, pause }));
          return;
        }
        setName((await getItem(db, r.entry.item_id))?.name ?? '집중');
        const h = forgotHours(r, Date.now());
        setForgot(h !== null && !forgotAsked.has(r.entry.id) ? h : null);
      })
      .catch((e) => console.warn('timer load failed', e));
  }, []);

  useEffect(load, [load, blockVersion]);
  useFocusEffect(useCallback(load, [load]));

  // 숫자는 1초마다. 평소 라벨(방해금지 시작·끝)은 30분 경계마다 다시 읽는다.
  useEffect(() => {
    const tick = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (Math.floor(n / 1000) % 1800 === 0) load();
    }, 1000);
    return () => clearInterval(tick);
  }, [load]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), STOP_LINE_MS);
    return () => clearTimeout(timer);
  }, [note]);

  const view = running ? timerView(running, name, now) : null;

  // 앱이 열려 있는 동안 끝에 닿으면 정리에 맡긴다(타이머는 끝 시트, 30분 넘게 지났거나 뽀모도로면 끝냄).
  // 시트를 여기서 직접 열면 앱 열 때 정리와 순서가 엇갈려 이미 끝난 세션의 시트가 남는다.
  useEffect(() => {
    if (!running || !view?.ended || view.paused || endAsked.current === running.entry.id) return;
    endAsked.current = running.entry.id;
    void settleTimerNow().then(load);
  }, [running, view?.ended, view?.paused, load]);

  // 뽀모도로 단계가 바뀌면(라벨이 바뀜) 고정 알림도 새 단계로 다시 그린다(T8).
  const phaseKey = view && running?.entry.how === 'pomodoro' ? view.label : null;
  useEffect(() => {
    if (phaseKey) void syncOngoing(getRuntime().db);
  }, [phaseKey]);

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

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.w !== width || size.h !== height) setSize({ w: width, h: height });
  };

  const L = size ? roomLayout(size.w, size.h) : null;
  const seconds = view ? view.seconds : nextPingSeconds(now, deviceTz());
  const label = view ? view.label : idle.label;
  const speech = view
    ? view.paused
      ? `${view.speech}, 일시정지 중`
      : view.speech
    : `${idle.label}, ${clockSpeech(seconds)}`;
  const pose: keyof typeof CAT = view ? 'loaf' : idle.sleeping ? 'sleep' : 'sit_watch';

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {L && (
        <>
          <Image source={t.dark ? ROOM.dark : ROOM.light} style={[styles.abs, L.room]} resizeMode='cover' />
          <Text style={[styles.date, { left: 22 * L.k }]} maxFontSizeMultiplier={MAX_SCALE}>
            {homeDate(now, deviceTz())}
          </Text>
          <Image source={DESK} style={[styles.abs, L.desk]} />
          <BigNumber L={L} text={clockText(seconds)} label={label} dim={!!view?.paused} speech={speech} />
          <Image
            source={CAT[pose]}
            style={[
              styles.abs,
              {
                right: L.cat.right,
                height: pose === 'sleep' ? L.cat.sleepHeight : L.cat.height,
                width: (pose === 'sleep' ? L.cat.sleepHeight : L.cat.height) * CAT_RATIO[pose],
                top: L.surfaceY - (pose === 'sleep' ? L.cat.sleepHeight : L.cat.height) + 4 * L.k,
              },
            ]}
            accessibilityIgnoresInvertColors
          />

          {view && running ? (
            <>
              {view.paused && (
                <Text style={[styles.floorNote, { top: L.buttonTop - 30 }]} maxFontSizeMultiplier={MAX_SCALE}>
                  일시정지 중
                </Text>
              )}
              <View style={[styles.buttons, { top: L.buttonTop }]}>
                {view.paused ? (
                  <Btn fill label='재개' onPress={() => act(() => resumeTimer(getRuntime().db, Date.now()))} />
                ) : (
                  <Btn fill label='일시정지' onPress={() => act(() => pauseTimer(getRuntime().db, Date.now()))} />
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
              {note && (
                <View style={[styles.note, { top: L.barsTop }]}>
                  <Text style={styles.noteText} maxFontSizeMultiplier={MAX_SCALE} accessibilityLiveRegion='polite'>
                    {note.text} ·{' '}
                  </Text>
                  <TouchableOpacity onPress={() => undoStop(note.stopped)} accessibilityLabel='정지 취소' hitSlop={12}>
                    <Text style={[styles.noteText, styles.link]} maxFontSizeMultiplier={MAX_SCALE}>
                      정지 취소
                    </Text>
                  </TouchableOpacity>
                  {note.pingsBack && (
                    <Text style={styles.noteSmall} maxFontSizeMultiplier={MAX_SCALE}>
                      30분 알림 다시 켬
                    </Text>
                  )}
                </View>
              )}
              <View style={[styles.buttons, { top: L.buttonTop }]}>
                <Btn fill wide label='시작' a11y='타이머 시작' onPress={() => setStarting(true)} />
              </View>
              {showBars && barsOn && !note && (
                <View style={[styles.bars, { top: L.barsTop }]}>
                  <PlanVsActual />
                </View>
              )}
              <TimerStartSheet visible={starting} onClose={() => setStarting(false)} />
            </>
          )}
        </>
      )}
    </View>
  );
}

/*
 * 큰 숫자(G4·G5·G7): 자리마다 같은 폭 칸에 가운데 맞춤, 콜론도 고정 칸. 칸 아래 끝 = 책상 윗면.
 * 끝 숫자만 칸 오른쪽으로 절반쯤 옮기고, 라벨은 고정선에 오른쪽 끝을 맞춰 매초 움직이지 않는다.
 */
function BigNumber(p: { L: RoomLayout; text: string; label: string; dim: boolean; speech: string }) {
  const styles = useStyles();
  const { num } = p.L;
  const chars = [...p.text];
  const line = labelLine(p.text, num);
  return (
    <View
      style={[styles.abs, { left: p.L.numLeft, top: p.L.surfaceY - JUA_ASCENT * num - 26 }]}
      accessible
      accessibilityLabel={p.speech}
    >
      <Text
        style={[styles.label, { position: 'absolute', top: 0, right: undefined, width: 300, left: line - 300, textAlign: 'right' }]}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_SCALE}
      >
        {p.label}
      </Text>
      <View style={[styles.numRow, { marginTop: 26, height: num }, p.dim && styles.dim]}>
        {chars.map((ch, i) => (
          <Text
            key={i}
            style={[
              styles.num,
              {
                fontSize: num,
                lineHeight: num,
                width: (ch === ':' ? COLON_EM : DIGIT_EM) * num,
                // 늘 배열을 준다: undefined로 바뀌면 안드로이드 렌더러가 null transform에서 멈춘다.
                transform: [{ translateX: i === chars.length - 1 ? lastDigitShift(ch, num) : 0 }],
              },
            ]}
            maxFontSizeMultiplier={NUMBER_SCALE}
          >
            {ch}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Btn(p: { label: string; onPress: () => void; fill?: boolean; wide?: boolean; a11y?: string }) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={[styles.btn, p.wide ? styles.btnWide : styles.btnHalf, p.fill ? styles.btnFill : styles.btnLine]}
      onPress={p.onPress}
      accessibilityRole='button'
      accessibilityLabel={p.a11y ?? p.label}
    >
      <Text style={[styles.btnText, p.fill && styles.btnTextFill]} maxFontSizeMultiplier={MAX_SCALE}>
        {p.label}
      </Text>
    </TouchableOpacity>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    fill: { flex: 1, overflow: 'hidden', backgroundColor: t.floor },
    abs: { position: 'absolute' },
    date: { position: 'absolute', top: 16, color: t.sub, fontSize: 14, lineHeight: 20 },
    label: { color: t.sub, fontSize: 14, lineHeight: 20 },
    numRow: { flexDirection: 'row', alignItems: 'flex-end' },
    num: { color: t.text, textAlign: 'center', includeFontPadding: false },
    dim: { opacity: 0.45 },
    floorNote: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: t.text, fontSize: 14 },
    note: {
      position: 'absolute',
      left: 26,
      right: 26,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    noteText: { color: t.text, fontSize: 14, lineHeight: 20 },
    noteSmall: { width: '100%', color: t.text, fontSize: 13, lineHeight: 18 },
    link: { textDecorationLine: 'underline' },
    buttons: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 21 },
    btn: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    btnWide: { width: 150 },
    btnHalf: { width: 140 },
    btnFill: { backgroundColor: t.acc },
    btnLine: { borderWidth: 1.5, borderColor: t.floorBorder },
    btnText: { color: t.text, fontSize: 17 },
    btnTextFill: { color: t.onAcc },
    bars: { position: 'absolute', left: 26, right: 26 },
  }),
);
