import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { CATEGORY_LABEL, type Category } from '@/db/types';
import { deviceTz, MINUTE_MS } from '@/lib/localTime';
import { CATEGORY_COLOR, GRID_ORDER, textOn } from '@/record/categoryStyle';
import { FOCUS_HOURS, focusEnd, startFocus } from '@/record/blockLogic';
import { hhmm, withRo } from '@/record/recordLogic';
import { afterBlockChange, getRuntime } from '@/runtime/appRuntime';
import { readQuiet } from '@/scheduler/scheduler';
import type { Quiet } from '@/scheduler/plan';

const MAX_SCALE = 1.3;
import { SAVE_FAILED_TEXT } from '@/components/record/texts';

/*
 * Home [집중] 시작(디자인 리뷰 DR-8): 두 번 탭.
 *   무엇에 집중할까요?            업무, 얼마나?
 *   [그대로 계속 · 업무]    →     1시간   15:00까지
 *   [6칸 카테고리]                2시간   16:00까지   ← 누르는 순간 시작
 * "그대로 계속"은 직전 60분 안 기록의 카테고리. 길이는 다음 30분 경계부터 세고 방해금지에서 자른다.
 */
export default function FocusStartSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [cat, setCat] = useState<Category | null>(null);
  const [recent, setRecent] = useState<Category | null>(null);
  const [quiet, setQuiet] = useState<Quiet>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCat(null);
    setFailed(false);
    const db = getRuntime().db;
    readQuiet(db).then(setQuiet).catch(() => setQuiet([]));
    db.first<{ category: Category }>(
      `SELECT category FROM slot WHERE source IN ('answered', 'continued', 'declared') AND slot_start >= ?
        ORDER BY slot_start DESC LIMIT 1`,
      [new Date(Date.now() - 90 * MINUTE_MS).toISOString()],
    )
      .then((r) => setRecent(r?.category ?? null))
      .catch(() => setRecent(null));
  }, [visible]);

  if (!visible) return null;
  const tz = deviceTz();
  const now = new Date();

  const start = async (category: Category, hours: number) => {
    if (saving) return;
    setSaving(true);
    try {
      const block = await startFocus(getRuntime().db, { category, hours, now: new Date(), tz, quiet });
      setFailed(false);
      onClose();
      if (block) void afterBlockChange();
    } catch (e) {
      console.warn('start focus failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const grid = (
    <View style={styles.grid}>
      {GRID_ORDER.map((c) => (
        <TouchableOpacity key={c} style={styles.cell} onPress={() => setCat(c)} accessibilityLabel={`${CATEGORY_LABEL[c]}에 집중`}>
          <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[c] }]} />
          <Text style={styles.cellText} maxFontSizeMultiplier={MAX_SCALE}>
            {CATEGORY_LABEL[c]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          {failed && (
            <Text style={styles.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          {!cat ? (
            <>
              <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
                무엇에 집중할까요?
              </Text>
              {recent && (
                <TouchableOpacity
                  style={[styles.cont, { backgroundColor: CATEGORY_COLOR[recent] }]}
                  onPress={() => setCat(recent)}
                  accessibilityLabel={`그대로 계속, ${withRo(CATEGORY_LABEL[recent])} 집중`}
                >
                  <Text style={{ color: textOn(CATEGORY_COLOR[recent]), fontSize: 16 }} maxFontSizeMultiplier={MAX_SCALE}>
                    그대로 계속 · {CATEGORY_LABEL[recent]}
                  </Text>
                </TouchableOpacity>
              )}
              {grid}
            </>
          ) : (
            <>
              <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
                {CATEGORY_LABEL[cat]}, 얼마나?
              </Text>
              {FOCUS_HOURS.map((h) => {
                const end = focusEnd(now, h, tz, quiet);
                if (!end) return null;
                return (
                  <TouchableOpacity
                    key={h}
                    style={styles.lenRow}
                    onPress={() => start(cat, h)}
                    accessibilityLabel={`${h}시간, ${hhmm(end, tz)}까지`}
                  >
                    <Text style={styles.cellText} maxFontSizeMultiplier={MAX_SCALE}>
                      {h}시간
                    </Text>
                    <Text style={styles.lenSub} maxFontSizeMultiplier={MAX_SCALE}>
                      {hhmm(end, tz)}까지
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {!focusEnd(now, 1, tz, quiet) && (
                <Text style={styles.lenSub} maxFontSizeMultiplier={MAX_SCALE}>
                  방해금지 시간이라 지금은 시작할 수 없어요
                </Text>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: GRAY_9,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: GRAY_7, marginBottom: 12 },
  header: { color: GRAY_0, fontSize: 16, marginBottom: 12 },
  error: { color: GRAY_5, fontSize: 13, marginBottom: 12 },
  cont: { minHeight: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  cell: {
    width: '32%',
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: GRAY_8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cellText: { color: GRAY_0, fontSize: 16 },
  lenRow: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: GRAY_7,
  },
  lenSub: { color: GRAY_5, fontSize: 14 },
});
