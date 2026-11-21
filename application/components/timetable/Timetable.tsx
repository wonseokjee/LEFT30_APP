import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useFocusEffect } from 'expo-router';
import { deviceTz, localParts, MINUTE_MS } from '@/lib/localTime';
import { hhmm } from '@/record/recordLogic';
import { isPastSlot, shiftDate, slotAtMinute } from '@/record/timetable';
import {
  blockAt,
  buildColumn,
  dayBounds,
  DAY_MIN,
  loadTimelineEntries,
  planLabel,
  type TimelineBlock,
  type TimelineColumn,
} from '@/record/timeline';
import { planBlocksOn } from '@/record/todoLogic';
import { getRuntime } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';
import { makeStyles, type Theme } from '@/theme/theme';
import { STRIP_H } from '@/components/home/CatStrip';

const MAX_SCALE = 1.3;
// 1분 = 1.1dp(30분 = 33dp, 4.3a)
const MIN_DP = 1.1;
const HEIGHT = DAY_MIN * MIN_DP;
const LABEL_WIDTH = 44;
const PAD = 16;
const PAD_TOP = 8;
const GAP = 8;
const NOW_BOX = 20;
const BLOCK_GAP = 2;

// 4.3a 시간표 색. 블록 채움(낮 #E0CCB7·밤 #57504A)과 옅은 구간(#E9D9C7·#48423E)은 4.3a 값, 눈금은 폰에서 다시 본다.
function palette(t: Theme) {
  return {
    bg: t.wall,
    text: t.text,
    sub: t.sub,
    acc: t.acc,
    line: t.border,
    fill: t.dark ? '#57504A' : '#E0CCB7',
    soft: t.dark ? '#48423E' : '#E9D9C7',
    grid: t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(90,64,48,0.10)',
  };
}

const HOW_LABEL: Record<string, string> = { stopwatch: '스톱워치', pomodoro: '뽀모도로', timer: '타이머' };

type Day = { date: string; column: TimelineColumn };
type Loaded = { yesterday: Day; today: Day };

/*
 * 시간표 = 구간 타임라인(left30-visual.md 4.3a, 타이머 개편 T4). 어제·오늘 두 열.
 *   블록: 같은 채움 + 왼쪽 강조선, 이름은 위쪽(15분 미만은 이름 없음), 사이 2dp 틈.
 *   멈춤 1~5분·뽀모도로 휴식은 옅게, 5분 이상 멈춤은 빈 틈 + 점선. 진행 중은 지금까지 자란다.
 *   계획: 기록이 없는 곳에만 점선 상자 "계획 업무".
 * 누르기: 알림 답 블록·지난 빈 곳 → 그 30분 칸의 기록 시트(빈 부분만 채움). 타이머 블록 → 그 기록 시트(이름·방식·시각).
 * 빈 곳 시작·끝 고르기(D29)와 짧은 블록 고르는 시트(G12)는 아직 없다.
 */
export default function Timetable() {
  const styles = useStyles();
  const sheetSlot = useAppStore((s) => s.sheetSlot);
  const lastSaved = useAppStore((s) => s.lastSaved);
  const openSheet = useAppStore((s) => s.openSheet);
  const blockVersion = useAppStore((s) => s.blockVersion);
  const [now, setNow] = useState(() => new Date());
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [info, setInfo] = useState<TimelineBlock | null>(null);
  const [failed, setFailed] = useState(false);
  const scrolled = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const tz = deviceTz();
  const today = localParts(now, tz).date;
  const yesterday = shiftDate(today, -1);

  const load = useCallback(async () => {
    const db = getRuntime().db;
    const at = Date.now();
    const yDay = dayBounds(yesterday, tz);
    const tDay = dayBounds(today, tz);
    const entries = await loadTimelineEntries(db, yDay[0], tDay[1]);
    const plans = (await planBlocksOn(db, today, tz)).map((b) => ({
      start: Date.parse(b.start_at),
      end: Date.parse(b.end_at),
      label: planLabel(b),
    }));
    setLoaded({
      yesterday: { date: yesterday, column: buildColumn({ day: yDay, tz, now: at, entries }) },
      // 계획 상자는 오늘 열에만(D27)
      today: { date: today, column: buildColumn({ day: tDay, tz, now: at, entries, plans }) },
    });
  }, [today, yesterday, tz]);

  // 탭에 들어올 때마다, 1분마다(진행 중 블록이 자란다), 기록 시트가 닫히거나 저장·되돌리기가 있을 때 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const timer = setInterval(() => setNow(new Date()), MINUTE_MS);
      return () => clearInterval(timer);
    }, []),
  );
  useEffect(() => {
    if (sheetSlot) return;
    load()
      .then(() => setFailed(false))
      .catch((e) => {
        console.warn('timetable load failed', e);
        setFailed(true);
      });
  }, [load, sheetSlot, lastSaved, blockVersion, now]);

  const nowTop = localParts(now, tz).minuteOfDay * MIN_DP;

  // 처음 그릴 때 '지금' 선이 화면 위쪽 1/3쯤 오도록 내린다.
  useEffect(() => {
    if (!loaded || scrolled.current) return;
    scrolled.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, nowTop - 200), animated: false });
  }, [loaded, nowTop]);

  // 읽기 실패(D30): 그 자리에 한 줄 + [다시 시도]. 불러오는 중에는 아무것도 그리지 않는다(D32).
  if (failed && !loaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.sheetTitle} maxFontSizeMultiplier={MAX_SCALE}>
          시간표를 불러오지 못했어요
        </Text>
        <Text style={styles.sheetLine} maxFontSizeMultiplier={MAX_SCALE}>
          기록은 지워지지 않았어요
        </Text>
        <Pressable style={styles.retry} onPress={() => setNow(new Date())} accessibilityRole='button'>
          <Text style={styles.retryText} maxFontSizeMultiplier={MAX_SCALE}>
            다시 시도
          </Text>
        </Pressable>
      </View>
    );
  }
  if (!loaded) return <View style={styles.container} />;

  // 누른 자리의 30분 칸 기록 시트. 지금 칸과 미래는 반응하지 않는다.
  const openAt = (date: string, minute: number) => {
    const slot = slotAtMinute(date, tz, minute);
    if (slot && isPastSlot(slot, new Date())) openSheet(slot);
  };

  const onEmpty = (day: Day) => (e: GestureResponderEvent) => {
    const minute = e.nativeEvent.locationY / MIN_DP;
    if (!blockAt(day.column, minute)) openAt(day.date, minute);
  };

  const onBlock = (day: Day, b: TimelineBlock) => (e: GestureResponderEvent) => {
    if (b.timer) setInfo(b);
    else openAt(day.date, b.from + e.nativeEvent.locationY / MIN_DP);
  };

  const column = (day: Day) => {
    const byKey = new Map(day.column.blocks.map((b) => [b.key, b]));
    return (
      <Pressable style={styles.column} onPress={onEmpty(day)} accessible={false}>
        {day.column.plans.map((p, i) => (
          <View
            key={`plan${i}`}
            pointerEvents='none'
            style={[styles.plan, { top: p.from * MIN_DP, height: (p.to - p.from) * MIN_DP - BLOCK_GAP }]}
          >
            <Text style={styles.planText} maxFontSizeMultiplier={MAX_SCALE} numberOfLines={1}>
              {p.label}
            </Text>
          </View>
        ))}
        {day.column.blocks.map((b) => {
          const [id, idx] = b.key.split(':');
          const prev = b.linked ? byKey.get(`${id}:${Number(idx) - 1}`) : undefined;
          return (
            <React.Fragment key={b.key}>
              {prev && <Dots from={prev.to} to={b.from} />}
              <Pressable
                onPress={onBlock(day, b)}
                style={[
                  styles.block,
                  { top: b.from * MIN_DP, height: Math.max(2, (b.to - b.from) * MIN_DP - (b.running ? 0 : BLOCK_GAP)) },
                  b.running && styles.blockLive,
                ]}
                accessibilityRole='button'
                accessibilityLabel={`${b.name}${b.running ? ' 진행 중' : ''}, ${hhmm(new Date(b.startAt), tz)}부터 ${hhmm(new Date(b.endAt), tz)}까지`}
              >
                {b.soft.map(([s, t], i) => (
                  <View
                    key={i}
                    pointerEvents='none'
                    style={[styles.soft, { top: (s - b.from) * MIN_DP, height: (t - s) * MIN_DP }]}
                  />
                ))}
                {b.showName && (
                  <Text style={styles.blockText} maxFontSizeMultiplier={MAX_SCALE} numberOfLines={1}>
                    {b.name}
                    {b.running ? ' 진행 중' : ''}
                  </Text>
                )}
              </Pressable>
            </React.Fragment>
          );
        })}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: LABEL_WIDTH }} />
        <Text style={styles.headerText} maxFontSizeMultiplier={MAX_SCALE}>
          어제
        </Text>
        <Text style={[styles.headerText, styles.headerOn]} maxFontSizeMultiplier={MAX_SCALE}>
          오늘
        </Text>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        <View style={styles.hours}>
          {Array.from({ length: 24 }, (_, h) => (
            <Text key={h} style={styles.hour} maxFontSizeMultiplier={MAX_SCALE}>
              {`${String(h).padStart(2, '0')}:00`}
            </Text>
          ))}
        </View>
        {Array.from({ length: 24 }, (_, h) => (
          <View key={h} pointerEvents='none' style={[styles.hourLine, { top: PAD_TOP + h * 60 * MIN_DP }]} />
        ))}
        <View style={styles.columns}>
          {column(loaded.yesterday)}
          <View pointerEvents='none' style={styles.divider} />
          {column(loaded.today)}
        </View>
        <View pointerEvents='none' style={[styles.now, { top: PAD_TOP + nowTop - NOW_BOX / 2 }]}>
          <Text style={styles.nowText} maxFontSizeMultiplier={1} numberOfLines={1}>
            {hhmm(now, tz)}
          </Text>
          <View style={styles.nowLine} />
        </View>
      </ScrollView>
      <BlockSheet block={info} tz={tz} onClose={() => setInfo(null)} />
    </View>
  );
}

// 5분 이상 멈춘 틈: 앞뒤 조각을 잇는 점선(PAUSE).
function Dots({ from, to }: { from: number; to: number }) {
  const styles = useStyles();
  const top = from * MIN_DP;
  const height = (to - from) * MIN_DP;
  const count = Math.max(1, Math.floor(height / 5));
  return (
    <View pointerEvents='none' style={[styles.dots, { top, height }]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.dot} />
      ))}
    </View>
  );
}

// 타이머 블록 시트: 이름·방식·시각(4.3a 블록 누름). 고치기는 끝 시각 고치기와 함께 나중에.
function BlockSheet({ block, tz, onClose }: { block: TimelineBlock | null; tz: string; onClose: () => void }) {
  const styles = useStyles();
  if (!block) return null;
  const range = `${hhmm(new Date(block.startAt), tz)}–${block.running ? '지금' : hhmm(new Date(block.endAt), tz)}`;
  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle} maxFontSizeMultiplier={MAX_SCALE}>
            {block.name}
          </Text>
          <Text style={styles.sheetLine} maxFontSizeMultiplier={MAX_SCALE}>
            {HOW_LABEL[block.how] ?? block.how} · {range}
            {block.running ? ' · 진행 중' : ''}
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((t) => {
  const C = palette(t);
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  retry: { marginTop: 12, minHeight: 48, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1.5, borderColor: C.line, justifyContent: 'center' },
  retryText: { color: C.text, fontSize: 17 },
  header: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  headerText: { flex: 1, color: C.sub, fontSize: 13, textAlign: 'center' },
  headerOn: { color: C.text },
  body: { flexDirection: 'row', paddingHorizontal: PAD, paddingTop: PAD_TOP, paddingBottom: 24 + STRIP_H, gap: GAP },
  hourLine: {
    position: 'absolute',
    left: PAD + LABEL_WIDTH + GAP,
    right: PAD,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.grid,
  },
  hours: { width: LABEL_WIDTH, marginTop: -8 },
  hour: { height: 60 * MIN_DP, color: C.sub, fontSize: 13 },
  columns: { flex: 1, flexDirection: 'row', height: HEIGHT },
  divider: { width: StyleSheet.hairlineWidth, marginHorizontal: GAP / 2, backgroundColor: C.grid },
  column: { flex: 1, height: HEIGHT },
  block: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: C.fill,
    borderLeftWidth: 3,
    borderLeftColor: C.acc,
    borderRadius: 3,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  blockLive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, opacity: 0.85 },
  soft: { position: 'absolute', left: 0, right: 0, backgroundColor: C.soft },
  blockText: { color: C.text, fontSize: 12, marginTop: 2 },
  plan: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: C.line,
    borderRadius: 4,
    paddingHorizontal: 6,
  },
  planText: { color: C.sub, fontSize: 12, marginTop: 2 },
  dots: { position: 'absolute', left: 1, width: 2, justifyContent: 'space-between', overflow: 'hidden' },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: C.acc },
  now: { position: 'absolute', left: PAD, right: PAD, height: NOW_BOX, flexDirection: 'row', alignItems: 'center' },
  // 바탕색으로 그 자리의 시각 숫자를 가린다.
  nowText: {
    width: LABEL_WIDTH + GAP,
    height: NOW_BOX,
    lineHeight: NOW_BOX,
    backgroundColor: C.bg,
    color: C.text,
    fontSize: 13,
  },
  nowLine: { flex: 1, height: 2, backgroundColor: C.acc },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#1c1a18', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 16 },
  sheetTitle: { color: C.text, fontSize: 18, marginBottom: 8 },
  sheetLine: { color: C.sub, fontSize: 14 },
});
});

