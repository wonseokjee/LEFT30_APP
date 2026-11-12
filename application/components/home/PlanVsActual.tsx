import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_6, GRAY_8 } from '@/assets/palette';
import { CATEGORY_LABEL } from '@/db/types';
import { deviceTz, localParts } from '@/lib/localTime';
import { CATEGORY_COLOR } from '@/record/categoryStyle';
import { loadPva, noteHomeViewed, type Pva } from '@/record/planVsActual';
import { hours } from '@/record/todoLogic';
import { getRuntime } from '@/runtime/appRuntime';
import { readQuiet } from '@/scheduler/scheduler';
import { useAppStore } from '@/store/appStore';
import PlanTargetSheet from '@/components/todo/PlanTargetSheet';

const MAX_SCALE = 1.3;
// 목표 막대 투명도(약 30%). 색 결정은 디자인 개편에서.
const TARGET_ALPHA = '4d';

/*
 * 오늘(홈) 계획 대비 실제(디자인 리뷰 D6·D12). 카드·테두리 없이 타이머 아래 여백으로 나눈다.
 *   업무   ▓▓▓▓░░░░   1h / 4h      ← 목표(연하게) 위에 실제(진하게)
 *   운동   ▓▓░░       0.5h / 1h
 *   오늘 업무 1h · 계획 4h          ← 차이가 가장 큰 카테고리 하나
 * 목표나 기록이 있는 카테고리만 줄로 보인다.
 */
export default function PlanVsActual() {
  const blockVersion = useAppStore((s) => s.blockVersion);
  const lastSaved = useAppStore((s) => s.lastSaved);
  const sheetSlot = useAppStore((s) => s.sheetSlot);
  const sheetBatch = useAppStore((s) => s.sheetBatch);
  const [pva, setPva] = useState<Pva | null>(null);
  const [planning, setPlanning] = useState(false);

  const load = useCallback(() => {
    const db = getRuntime().db;
    loadPva(db, new Date(), deviceTz())
      .then(setPva)
      .catch((e) => console.warn('plan vs actual failed', e));
  }, []);

  useEffect(() => {
    if (!sheetSlot && !sheetBatch) load();
  }, [load, blockVersion, lastSaved, sheetSlot, sheetBatch]);

  useFocusEffect(
    useCallback(() => {
      load();
      const db = getRuntime().db;
      readQuiet(db)
        .then((quiet) => noteHomeViewed(db, new Date(), deviceTz(), quiet))
        .catch((e) => console.warn('home viewed failed', e));
      const timer = setInterval(load, 60_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  if (!pva) return null;
  const scale = Math.max(1, ...pva.rows.map((r) => Math.max(r.target, r.actual)));
  const link = (text: string) => (
    <TouchableOpacity style={styles.linkHit} onPress={() => setPlanning(true)}>
      <Text style={styles.link} maxFontSizeMultiplier={MAX_SCALE}>
        {text}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.box}>
      {pva.rows.map((r) => {
        const color = CATEGORY_COLOR[r.category];
        return (
          <View
            key={r.category}
            style={styles.row}
            accessible
            accessibilityLabel={`${CATEGORY_LABEL[r.category]} 실제 ${hours(r.actual)}${r.target > 0 ? `, 계획 ${hours(r.target)}` : ''}`}
          >
            <Text style={styles.name} maxFontSizeMultiplier={MAX_SCALE}>
              {CATEGORY_LABEL[r.category]}
            </Text>
            <View style={styles.track}>
              {r.target > 0 && (
                <View style={[styles.bar, { width: `${(r.target / scale) * 100}%`, backgroundColor: color + TARGET_ALPHA }]} />
              )}
              {r.actual > 0 && <View style={[styles.bar, { width: `${(r.actual / scale) * 100}%`, backgroundColor: color }]} />}
            </View>
            <Text style={styles.num} maxFontSizeMultiplier={MAX_SCALE}>
              {hours(r.actual)}
              {r.target > 0 ? ` / ${hours(r.target)}` : ''}
            </Text>
          </View>
        );
      })}
      {pva.state === 'empty' && (
        <>
          <Text style={styles.line} maxFontSizeMultiplier={MAX_SCALE}>
            오늘 첫 칸을 기다리는 중
          </Text>
          {link('오늘 계획 세우기')}
        </>
      )}
      {pva.state === 'planOnly' && (
        <Text style={styles.line} maxFontSizeMultiplier={MAX_SCALE}>
          첫 기록은 다음 알림에서
        </Text>
      )}
      {pva.line && (
        <Text style={styles.line} maxFontSizeMultiplier={MAX_SCALE}>
          {pva.line}
        </Text>
      )}
      {pva.state === 'actualOnly' && link('오늘 계획 없음 · 지금 세우기')}
      <PlanTargetSheet
        visible={planning}
        date={localParts(new Date(), deviceTz()).date}
        from='home'
        onClose={() => setPlanning(false)}
        onSaved={() => {
          setPlanning(false);
          load();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', paddingHorizontal: 24, marginTop: 32 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 28, gap: 10 },
  name: { color: GRAY_5, fontSize: 13, width: 56 },
  track: { flex: 1, height: 10, backgroundColor: GRAY_8, borderRadius: 2, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  num: { color: GRAY_6, fontSize: 13, minWidth: 72, textAlign: 'right' },
  line: { color: GRAY_5, fontSize: 14, marginTop: 12, textAlign: 'center' },
  linkHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'center' },
  link: { color: GRAY_0, fontSize: 14, textDecorationLine: 'underline' },
});
