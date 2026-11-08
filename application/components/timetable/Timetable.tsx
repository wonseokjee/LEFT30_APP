import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GRAY_5, GRAY_7 } from '@/assets/palette';
import { CATEGORY_LABEL, type SlotRow } from '@/db/types';
import { deviceTz, localParts, MINUTE_MS } from '@/lib/localTime';
import { CATEGORY_COLOR, textOn } from '@/record/categoryStyle';
import { dayColumn, daySlots, isPastSlot, ROWS_PER_DAY, shiftDate, type Cell } from '@/record/timetable';
import { getRuntime } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

const MAX_SCALE = 1.3;
const ROW = 28;
const LABEL_WIDTH = 32;

type Loaded = { yesterday: Cell[]; today: Cell[] };

function rowLabel(row: number): string {
  const h = Math.floor(row / 2);
  return row % 2 === 0 ? `${h}시 칸` : `${h}시 30분 칸`;
}

// 시간표(디자인 리뷰 D7, D21): 어제·오늘 두 열. 표시는 채운 칸의 카테고리 색 블록과 '지금' 선 하나뿐이다.
// 끝난 칸을 누르면 기록 시트가 열린다. 60분이 지난 칸은 late로 저장된다(sourceFor).
export default function Timetable() {
  const sheetSlot = useAppStore((s) => s.sheetSlot);
  const lastSaved = useAppStore((s) => s.lastSaved);
  const openSheet = useAppStore((s) => s.openSheet);
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
    setLoaded({
      yesterday: dayColumn(yesterday, tz, slots),
      today: dayColumn(today, tz, slots),
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
  }, [load, sheetSlot, lastSaved]);

  const nowTop = (localParts(now, tz).minuteOfDay / 30) * ROW;

  // 처음 그릴 때 '지금' 선이 화면 위쪽 1/3쯤 오도록 내린다.
  useEffect(() => {
    if (!loaded || scrolled.current) return;
    scrolled.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, nowTop - 6 * ROW), animated: false });
  }, [loaded, nowTop]);

  if (!loaded) return <View style={styles.container} />;

  const column = (cells: Cell[], isToday: boolean) => (
    <View style={styles.column}>
      {cells.map((cell) => {
        const next = cells[cell.row + 1];
        const runEnd = cell.category !== null && next?.category !== cell.category;
        const tappable = cell.slotStart !== null && isPastSlot(cell.slotStart, now);
        const color = cell.category ? CATEGORY_COLOR[cell.category] : undefined;
        return (
          <Pressable
            key={cell.row}
            style={styles.cell}
            disabled={!tappable}
            onPress={() => cell.slotStart && openSheet(cell.slotStart)}
            accessibilityLabel={`${rowLabel(cell.row)}, ${cell.category ? CATEGORY_LABEL[cell.category] : '비어 있음'}`}
          >
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
      {isToday && <View pointerEvents='none' style={[styles.nowLine, { top: nowTop }]} />}
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
              {String(h).padStart(2, '0')}
            </Text>
          ))}
        </View>
        {column(loaded.yesterday, false)}
        {column(loaded.today, true)}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
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
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GRAY_7,
  },
});
