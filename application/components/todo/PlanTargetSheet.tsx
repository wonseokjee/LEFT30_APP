import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { CATEGORY_LABEL, type Category } from '@/db/types';
import { logEvent, savePlan } from '@/db/records';
import { uuidv4 } from '@/lib/uuid';
import { CATEGORY_COLOR } from '@/record/categoryStyle';
import { DAY_MIN, hours, planRowsOn, shiftDate } from '@/record/todoLogic';
import { getRuntime, syncNow } from '@/runtime/appRuntime';
import { SAVE_FAILED_TEXT } from '@/components/record/texts';

const MAX_SCALE = 1.3;
// 디자인 리뷰 D11 순서: 업무·휴식·관계·운동·자기개발·수면
const ORDER: Category[] = ['work', 'rest', 'relationship', 'exercise', 'self_dev', 'sleep'];

/*
 * 하루 총량 목표(재출시 설계 D11 "새로 짜기"). Todo 총량 한 줄(DR-4)을 누르면 열린다.
 * 업무  − 6h +   (30분 단위, 0~24h)
 * 합계 9h        [저장]
 * 시작 값은 오늘 값, 없으면 어제 값, 없으면 0.
 */
export default function PlanTargetSheet({
  visible,
  date,
  onClose,
  onSaved,
  from = 'todo',
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
  onSaved: () => void;
  from?: 'todo' | 'home' | 'morning';
}) {
  const [targets, setTargets] = useState<Partial<Record<Category, number>>>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFailed(false);
    const db = getRuntime().db;
    (async () => {
      let rows = await planRowsOn(db, date);
      if (rows.length === 0) rows = await planRowsOn(db, shiftDate(date, -1));
      setTargets(Object.fromEntries(rows.map((r) => [r.category, r.target_minutes])));
    })().catch(() => setTargets({}));
  }, [visible, date]);

  if (!visible) return null;
  const total = ORDER.reduce((sum, c) => sum + (targets[c] ?? 0), 0);

  const change = (c: Category, delta: number) =>
    setTargets((t) => ({ ...t, [c]: Math.max(0, (t[c] ?? 0) + delta) }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const db = getRuntime().db;
      const now = new Date().toISOString();
      await savePlan(db, date, targets, now);
      await logEvent(db, {
        id: uuidv4(),
        type: 'plan_set',
        ts: now,
        props: { local_date: date, mode: 'custom', source: 'manual', from, total_minutes: total },
      });
      void syncNow();
      onSaved();
    } catch (e) {
      console.warn('plan save failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
            오늘 목표
          </Text>
          {ORDER.map((c) => {
            const v = targets[c] ?? 0;
            return (
              <View key={c} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[c] }]} />
                <Text style={styles.name} maxFontSizeMultiplier={MAX_SCALE}>
                  {CATEGORY_LABEL[c]}
                </Text>
                <TouchableOpacity
                  style={[styles.stepBtn, v === 0 && styles.off]}
                  disabled={v === 0}
                  onPress={() => change(c, -30)}
                  accessibilityLabel={`${CATEGORY_LABEL[c]} 30분 줄이기`}
                >
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.value} maxFontSizeMultiplier={MAX_SCALE}>
                  {hours(v)}
                </Text>
                <TouchableOpacity
                  style={[styles.stepBtn, total >= DAY_MIN && styles.off]}
                  disabled={total >= DAY_MIN}
                  onPress={() => change(c, 30)}
                  accessibilityLabel={`${CATEGORY_LABEL[c]} 30분 늘리기`}
                >
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <Text style={styles.total} maxFontSizeMultiplier={MAX_SCALE}>
            합계 {hours(total)}
          </Text>
          {failed && (
            <Text style={styles.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          <TouchableOpacity style={styles.save} disabled={saving} onPress={save}>
            <Text style={styles.saveText} maxFontSizeMultiplier={MAX_SCALE}>
              저장
            </Text>
          </TouchableOpacity>
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
  header: { color: GRAY_0, fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { color: GRAY_0, fontSize: 16, flex: 1 },
  stepBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: GRAY_8, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },
  stepText: { color: GRAY_0, fontSize: 22 },
  value: { color: GRAY_0, fontSize: 16, minWidth: 48, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  total: { color: GRAY_5, fontSize: 15, marginTop: 8 },
  error: { color: GRAY_5, fontSize: 13, marginTop: 8 },
  save: { minHeight: 52, borderRadius: 8, backgroundColor: GRAY_8, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  saveText: { color: GRAY_0, fontSize: 16 },
});
