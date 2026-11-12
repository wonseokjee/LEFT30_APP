import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_8 } from '@/assets/palette';
import { CATEGORY_LABEL, type SlotRow } from '@/db/types';
import { deviceTz, localParts, MINUTE_MS } from '@/lib/localTime';
import { CATEGORY_COLOR, textOn } from '@/record/categoryStyle';
import { hhmm } from '@/record/recordLogic';
import { dayColumn, daySlots, isPastSlot, ROWS_PER_DAY, shiftDate, type Cell, type PlanCells } from '@/record/timetable';
import { blockSlots } from '@/record/blockLogic';
import { planBlocksOn } from '@/record/todoLogic';
import { getRuntime } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

const MAX_SCALE = 1.3;
const ROW = 28;
const LABEL_WIDTH = 44;
const PAD = 16;
const PAD_TOP = 8;
const GAP = 8;
const NOW_BOX = 20;
// 계획 레이어 투명도(약 30%). 색 결정은 디자인 개편에서(DR-6, Pass 5).
const PLAN_ALPHA = '4d';

type Loaded = { yesterday: Cell[]; today: Cell[] };

function rowLabel(row: number): string {
  const h = Math.floor(row / 2);
  return row % 2 === 0 ? `${h}시 칸` : `${h}시 30분 칸`;
}

// 시간표(디자인 리뷰 D7, D21, D24): 어제·오늘 두 열과 그 사이 세로줄. 채운 칸의 카테고리 색 블록, 1시간마다 얇은 가로줄,
// 두 열을 가로지르는 흰 '지금' 선과 그 옆 지금 시각.
// 끝난 칸을 누르면 기록 시트가 열린다. 60분이 지난 칸은 late로 저장된다(sourceFor).
export default function Timetable() {
  const sheetSlot = useAppStore((s) => s.sheetSlot);
  const lastSaved = useAppStore((s) => s.lastSaved);
  const openSheet = useAppStore((s) => s.openSheet);
  const blockVersion = useAppStore((s) => s.blockVersion);
  const [now, setNow] = useState(() => new Date());
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const scrolled = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const tz = deviceTz();
  const today = localParts(now, tz).date;
  const yesterday = shiftDate(today, -1);

  const load = useCallback(async () => {
    const from = daySlots(yesterday, tz)[0];
    const todaySlots = daySlots(today, tz);
    const to = todaySlots[todaySlots.length - 1];
    if (!from || !to) return;
    const slots = await getRuntime().db.all<SlotRow>(
      'SELECT * FROM slot WHERE slot_start >= ? AND slot_start <= ?',
      [from, to],
    );
    // DR-6: 오늘 열에만 계획 블록을 옅게 깐다. 실제 기록이 있으면 기록이 이긴다.
    const plans: PlanCells = new Map();
    for (const b of await planBlocksOn(getRuntime().db, today, tz)) {
      blockSlots(b, b.tz).forEach((s, i) =>
        plans.set(s, { category: b.category, label: i === 0 ? CATEGORY_LABEL[b.category] + (b.title ? ` · ${b.title}` : '') : null }),
      );
    }
    setLoaded({
      yesterday: dayColumn(yesterday, tz, slots),
      today: dayColumn(today, tz, slots, plans),
    });
  }, [today, yesterday, tz]);

  // 탭에 들어올 때마다, 그리고 기록 시트가 닫히거나 저장·되돌리기가 있을 때 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const timer = setInterval(() => setNow(new Date()), MINUTE_MS);
      return () => clearInterval(timer);
    }, []),
  );
  useEffect(() => {
    if (sheetSlot) return;
    load().catch((e) => console.warn('timetable load failed', e));
  }, [load, sheetSlot, lastSaved, blockVersion]);

  const nowTop = (localParts(now, tz).minuteOfDay / 30) * ROW;

  // 처음 그릴 때 '지금' 선이 화면 위쪽 1/3쯤 오도록 내린다.
  useEffect(() => {
    if (!loaded || scrolled.current) return;
    scrolled.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, nowTop - 6 * ROW), animated: false });
  }, [loaded, nowTop]);

  if (!loaded) return <View style={styles.container} />;

  const column = (cells: Cell[]) => (
    <View style={styles.column}>
      {cells.map((cell) => {
        const next = cells[cell.row + 1];
        const runEnd = cell.category !== null && next?.category !== cell.category;
        const tappable = cell.slotStart !== null && isPastSlot(cell.slotStart, now);
        const color = cell.category ? CATEGORY_COLOR[cell.category] : undefined;
        const planOnly = !color && cell.plan;
        const planNext = next && !next.category && next.plan?.category === cell.plan?.category && !next.plan?.label;
        return (
          <Pressable
            key={cell.row}
            style={styles.cell}
            disabled={!tappable}
            onPress={() => cell.slotStart && openSheet(cell.slotStart)}
            accessibilityLabel={`${rowLabel(cell.row)}, ${cell.category ? CATEGORY_LABEL[cell.category] : '비어 있음'}${cell.plan ? `, 계획 ${CATEGORY_LABEL[cell.plan.category]}` : ''}`}
          >
            {planOnly && cell.plan && (
              <View
                style={[
                  styles.block,
                  { backgroundColor: CATEGORY_COLOR[cell.plan.category] + PLAN_ALPHA },
                  cell.plan.label !== null && styles.blockTop,
                  !planNext && styles.blockBottom,
                ]}
              >
                {cell.plan.label && (
                  <Text style={styles.planText} maxFontSizeMultiplier={MAX_SCALE} numberOfLines={1}>
                    {cell.plan.label}
                  </Text>
                )}
              </View>
            )}
            {color && (
              <View
                style={[
                  styles.block,
                  { backgroundColor: color },
                  cell.runStart && styles.blockTop,
                  runEnd && styles.blockBottom,
                ]}
              >
                {cell.runStart && cell.category && (
                  <Text style={[styles.blockText, { color: textOn(color) }]} maxFontSizeMultiplier={MAX_SCALE} numberOfLines={1}>
                    {CATEGORY_LABEL[cell.category]}
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: LABEL_WIDTH }} />
        <Text style={styles.headerText} maxFontSizeMultiplier={MAX_SCALE}>
          어제
        </Text>
        <Text style={styles.headerText} maxFontSizeMultiplier={MAX_SCALE}>
          오늘
        </Text>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        <View style={styles.hours}>
          {Array.from({ length: ROWS_PER_DAY / 2 }, (_, h) => (
            <Text key={h} style={styles.hour} maxFontSizeMultiplier={MAX_SCALE}>
              {`${String(h).padStart(2, '0')}:00`}
            </Text>
          ))}
        </View>
        {Array.from({ length: ROWS_PER_DAY / 2 }, (_, h) => (
          <View key={h} pointerEvents='none' style={[styles.hourLine, { top: PAD_TOP + h * 2 * ROW }]} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerText: {
    flex: 1,
    color: GRAY_5,
    fontSize: 13,
  },
  body: {
    flexDirection: 'row',
    paddingHorizontal: PAD,
    paddingTop: PAD_TOP,
    paddingBottom: 24,
    gap: GAP,
  },
  hourLine: {
    position: 'absolute',
    left: PAD + LABEL_WIDTH + GAP,
    right: PAD,
    height: StyleSheet.hairlineWidth,
    backgroundColor: GRAY_8,
  },
  hours: {
    width: LABEL_WIDTH,
    marginTop: -8, // 숫자 가운데를 그 시각 경계에 맞춘다
  },
  hour: {
    height: ROW * 2,
    color: GRAY_5,
    fontSize: 13,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  // 어제·오늘 사이 세로줄. 1시간 가로줄과 같은 색과 두께.
  divider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: GAP / 2,
    backgroundColor: GRAY_8,
  },
  column: {
    flex: 1,
  },
  cell: {
    height: ROW,
  },
  block: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  blockTop: {
    marginTop: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  blockBottom: {
    marginBottom: 1,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  blockText: {
    fontSize: 13,
  },
  planText: {
    color: GRAY_0,
    fontSize: 13,
  },
  now: {
    position: 'absolute',
    left: PAD,
    right: PAD,
    height: NOW_BOX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 검은 바탕으로 그 자리의 시각 숫자를 가린다.
  nowText: {
    width: LABEL_WIDTH + GAP,
    height: NOW_BOX,
    lineHeight: NOW_BOX,
    backgroundColor: 'black',
    color: GRAY_0,
    fontSize: 13,
  },
  nowLine: {
    flex: 1,
    height: 2,
    backgroundColor: GRAY_0,
  },
});
