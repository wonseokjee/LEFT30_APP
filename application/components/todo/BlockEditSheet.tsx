import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { GRAY_0, GRAY_5, GRAY_6, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { CATEGORY_LABEL, type BlockRow, type Category } from '@/db/types';
import { CATEGORY_COLOR, GRID_ORDER, textOn } from '@/record/categoryStyle';
import { hhmm } from '@/record/recordLogic';
import { BLOCK_TITLE_MAX, DAY_MIN, hm, minuteOf, savePlanBlock, setEnd, setStart } from '@/record/todoLogic';
import { getRuntime } from '@/runtime/appRuntime';
import { SAVE_FAILED_TEXT } from '@/components/record/texts';

const MAX_SCALE = 1.3;

/*
 * Todo 계획 블록 추가·수정 시트(디자인 리뷰 DR-7·9).
 *   시작               끝
 * − 14:00 +    –    − 15:00 +     ← 30분 단위, 시각 글자를 누르면 시계 피커
 * [6칸 카테고리]
 * 이름 (선택) ______
 * [ 저장 ]                        ← 카테고리를 골라야 켜짐
 * 지우기                           ← 수정일 때만
 */
export default function BlockEditSheet({
  visible,
  date,
  tz,
  initial,
  editing,
  onClose,
  onSaved,
  onDelete,
}: {
  visible: boolean;
  date: string;
  tz: string;
  initial: { start: number; end: number };
  editing: BlockRow | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (b: BlockRow) => void;
}) {
  const [range, setRange] = useState(initial);
  const [cat, setCat] = useState<Category | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (editing) {
      setRange({ start: minuteOf(editing.start_at, date, tz), end: minuteOf(editing.end_at, date, tz) });
      setCat(editing.category);
      setTitle(editing.title ?? '');
    } else {
      setRange(initial);
      setCat(null);
      setTitle('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editing]);

  if (!visible) return null;

  const pick = (minute: number, apply: (m: number) => void) => {
    const d = new Date();
    d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    DateTimePickerAndroid.open({
      value: d,
      mode: 'time',
      is24Hour: true,
      minuteInterval: 30,
      onChange: (e, picked) => {
        if (e.type !== 'set' || !picked) return;
        apply(picked.getHours() * 60 + picked.getMinutes());
      },
    });
  };

  const save = async () => {
    if (!cat || saving) return;
    setSaving(true);
    try {
      const r = await savePlanBlock(getRuntime().db, {
        id: editing?.id,
        date,
        start: range.start,
        end: range.end,
        category: cat,
        title,
        tz,
        now: new Date(),
      });
      if (!r.ok) {
        const o = r.overlap;
        setError(`${hhmm(new Date(o.start_at), tz)}–${hhmm(new Date(o.end_at), tz)} ${CATEGORY_LABEL[o.category]}와 겹쳐요`);
        return;
      }
      onSaved();
    } catch (e) {
      console.warn('plan block save failed', e);
      setError(SAVE_FAILED_TEXT);
    } finally {
      setSaving(false);
    }
  };

  const stepper = (label: string, value: number, apply: (m: number) => void) => (
    <View style={styles.stepCol}>
      <Text style={styles.label} maxFontSizeMultiplier={MAX_SCALE}>
        {label}
      </Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => apply(value - 30)} accessibilityLabel={`${label} 30분 앞으로`}>
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pick(value, apply)} accessibilityLabel={`${label} ${hm(value)}, 눌러서 시각 고르기`}>
          <Text style={styles.stepValue} maxFontSizeMultiplier={MAX_SCALE}>
            {value === DAY_MIN ? '24:00' : hm(value)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stepBtn} onPress={() => apply(value + 30)} accessibilityLabel={`${label} 30분 뒤로`}>
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
            {editing ? '계획 블록 수정' : '계획 블록 추가'}
          </Text>
          <View style={styles.range}>
            {stepper('시작', range.start, (m) => setRange((r) => setStart(r, m)))}
            <Text style={styles.dash}>–</Text>
            {stepper('끝', range.end, (m) => setRange((r) => setEnd(r, m)))}
          </View>
          <View style={styles.grid}>
            {GRID_ORDER.map((c) => {
              const on = cat === c;
              const color = CATEGORY_COLOR[c];
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.cell, on && { backgroundColor: color }]}
                  onPress={() => setCat(c)}
                  accessibilityLabel={CATEGORY_LABEL[c]}
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.dot, { backgroundColor: on ? textOn(color) : color }]} />
                  <Text style={[styles.cellText, on && { color: textOn(color) }]} maxFontSizeMultiplier={MAX_SCALE}>
                    {CATEGORY_LABEL[c]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={styles.input}
            placeholderTextColor={GRAY_6}
            placeholder='이름 (선택) 예: 보고서 쓰기'
            value={title}
            onChangeText={setTitle}
            maxLength={BLOCK_TITLE_MAX}
            maxFontSizeMultiplier={MAX_SCALE}
          />
          {error && (
            <Text style={styles.error} maxFontSizeMultiplier={MAX_SCALE}>
              {error}
            </Text>
          )}
          <TouchableOpacity style={[styles.save, !cat && styles.off]} disabled={!cat || saving} onPress={save}>
            <Text style={styles.saveText} maxFontSizeMultiplier={MAX_SCALE}>
              저장
            </Text>
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity style={styles.delete} onPress={() => onDelete(editing)}>
              <Text style={styles.deleteText} maxFontSizeMultiplier={MAX_SCALE}>
                지우기
              </Text>
            </TouchableOpacity>
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
  label: { color: GRAY_5, fontSize: 13, marginBottom: 6 },
  range: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stepCol: { alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stepBtn: { width: 40, height: 44, borderRadius: 8, backgroundColor: GRAY_8, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: GRAY_0, fontSize: 22 },
  dash: { color: GRAY_5, fontSize: 18, marginTop: 20 },
  stepValue: {
    color: GRAY_0,
    fontSize: 18,
    minWidth: 58,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginBottom: 8 },
  cell: {
    width: '32%',
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: GRAY_8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cellText: { color: GRAY_0, fontSize: 15 },
  input: {
    color: GRAY_0,
    fontSize: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: GRAY_7,
    paddingVertical: 10,
    marginVertical: 8,
  },
  error: { color: GRAY_5, fontSize: 13, marginTop: 4 },
  save: { minHeight: 52, borderRadius: 8, backgroundColor: GRAY_8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  off: { opacity: 0.4 },
  saveText: { color: GRAY_0, fontSize: 16 },
  delete: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  deleteText: { color: GRAY_5, fontSize: 15, textDecorationLine: 'underline' },
});
