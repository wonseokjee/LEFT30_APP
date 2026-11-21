import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useFocusEffect } from 'expo-router';

import { deviceTz, localParts, MINUTE_MS } from '@/lib/localTime';
import { homeBars, loadPva, noteHomeViewed, type Pva } from '@/record/planVsActual';
import { durationText } from '@/record/timerHome';
import { getRuntime } from '@/runtime/appRuntime';
import { readQuiet } from '@/scheduler/scheduler';
import { useAppStore } from '@/store/appStore';
import PlanTargetSheet from '@/components/todo/PlanTargetSheet';
import { makeStyles } from '@/theme/theme';

const MAX_SCALE = 1.3;

/*
 * 홈 바닥 "오늘 지금까지"(visual 4.3c D37·G19, 시안 A):
 *   오늘 지금까지
 *   영어  ▓▓▓▓▓░░░  40분 · 계획 1시간      ← 목표 줄만, 셋 이상이면 진행률 높은 두 개
 *   집중  ▓▓▓░░░░░  30분 · 계획 1시간
 * 목표가 없으면 "오늘 계획 없음 ›" 한 줄(누르면 목표 정하기). 사실만 말하고 재촉하지 않는다.
 */
export default function PlanVsActual() {
  const styles = useStyles();
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
  const bars = homeBars(pva.rows);

  return (
    <View>
      {bars ? (
        <>
          <Text style={styles.title} maxFontSizeMultiplier={MAX_SCALE}>
            오늘 지금까지
          </Text>
          {bars.map((r) => (
            <View
              key={r.item}
              style={styles.row}
              accessible
              accessibilityLabel={`${r.name}, ${minutesText(r.actual)}, 계획 ${minutesText(r.target)}`}
            >
              <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>
                {r.name}
              </Text>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${Math.min(100, (r.actual / r.target) * 100)}%` }]} />
              </View>
              <Text style={styles.num} maxFontSizeMultiplier={MAX_SCALE}>
                {minutesText(r.actual)} · 계획 {minutesText(r.target)}
              </Text>
            </View>
          ))}
        </>
      ) : (
        <TouchableOpacity style={styles.linkHit} onPress={() => setPlanning(true)} accessibilityRole='link'>
          <Text style={styles.link} maxFontSizeMultiplier={MAX_SCALE}>
            오늘 계획 없음 ›
          </Text>
        </TouchableOpacity>
      )}
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

// "40분", "1시간", "1시간 30분"(0분도 "0분").
function minutesText(min: number): string {
  return min < 1 ? '0분' : durationText(min * MINUTE_MS);
}

// 바닥 위 글자는 본문색(보조색은 바닥 위 대비가 모자람, 6절). 막대는 트랙 위 강조색.
const useStyles = makeStyles((t) =>
  StyleSheet.create({
    title: { color: t.text, fontSize: 14, lineHeight: 20 },
    row: { flexDirection: 'row', alignItems: 'center', height: 26, gap: 10 },
    name: { color: t.text, fontSize: 14, width: 40 },
    track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: t.track, overflow: 'hidden' },
    bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: t.acc },
    num: { color: t.text, fontSize: 14 },
    linkHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
    link: { color: t.text, fontSize: 14, textDecorationLine: 'underline' },
  }),
);
