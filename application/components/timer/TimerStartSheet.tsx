import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8 } from '@/assets/palette';
import { SAVE_FAILED_TEXT } from '@/components/record/texts';
import { TIMER_HOWS, type TimerKind } from '@/db/types';
import { deviceTz, MINUTE_MS } from '@/lib/localTime';
import { textOn } from '@/record/categoryStyle';
import { findOrCreateItem, getItem, ITEM_NAME_MAX, recentItems, type ItemChip } from '@/record/items';
import { hhmm } from '@/record/recordLogic';
import {
  clamp,
  durationText,
  KIND_HINT,
  KIND_LABEL,
  POMODORO_PRESETS,
  pomodoroHint,
  readTimerPrefs,
  ROUNDS_MAX,
  ROUNDS_MIN,
  saveTimerPrefs,
  TIMER_MAX_MIN,
  TIMER_MIN_MIN,
  TIMER_STEP_MIN,
  type TimerPrefs,
} from '@/record/timerHome';
import { startTimer } from '@/record/timerLogic';
import { afterTimerChange, getRuntime } from '@/runtime/appRuntime';
import { ACCENT, MAX_SCALE, sheet } from './sheetStyle';

const FOCUS = 'focus'; // 시작 시트의 카테고리는 늘 집중(CEO 리뷰 2)

/*
 * 시작 시트(D38, visual 4.3c):
 *   [스톱워치 | 뽀모도로 | 타이머]      ← 지난번 방식
 *   멈출 때까지 셉니다
 *   무엇에 집중할까요
 *   (TOEIC RC) (수학) [+ 새 항목]       ← 지난번 항목, 비워도 됨
 *   뽀모도로: (25/5) (40/10) (50/10)  − 4바퀴 +
 *   타이머:   − 1시간 · 16:30까지 +
 *   [시작]
 */
export default function TimerStartSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<TimerPrefs | null>(null);
  const [chips, setChips] = useState<ItemChip[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFailed(false);
    setAdding(false);
    setDraft('');
    const db = getRuntime().db;
    (async () => {
      const p = await readTimerPrefs(db);
      const recent = await recentItems(db, FOCUS, Date.now());
      // 지난번 항목이 최근 칩에 없으면(30일 지남) 앞에 붙이고, 지워졌으면 비운다.
      if (p.itemId && !recent.some((c) => c.id === p.itemId)) {
        const it = await getItem(db, p.itemId);
        if (it) recent.unshift(it);
        else p.itemId = null;
      }
      setChips(recent);
      setPrefs(p);
    })().catch((e) => {
      console.warn('start sheet load failed', e);
      setPrefs(null);
      setFailed(true);
    });
  }, [visible]);

  if (!visible) return null;
  const set = (patch: Partial<TimerPrefs>) => setPrefs((p) => (p ? { ...p, ...patch } : p));

  const addItem = async () => {
    if (!draft.trim()) return setAdding(false);
    try {
      const it = await findOrCreateItem(getRuntime().db, FOCUS, draft, Date.now());
      setChips((cs) => [it, ...cs.filter((c) => c.id !== it.id)]);
      set({ itemId: it.id });
      setAdding(false);
      setDraft('');
    } catch (e) {
      console.warn('add item failed', e);
      setFailed(true);
    }
  };

  const start = async () => {
    if (!prefs || saving) return;
    setSaving(true);
    try {
      const db = getRuntime().db;
      await startTimer(db, {
        kind: prefs.kind,
        itemId: prefs.itemId ?? FOCUS,
        now: Date.now(),
        tz: deviceTz(),
        minutes: prefs.kind === 'timer' ? prefs.minutes : undefined,
        pomodoro: prefs.kind === 'pomodoro' ? prefs.pomodoro : undefined,
      });
      await saveTimerPrefs(db, prefs);
      setFailed(false);
      onClose();
      await afterTimerChange();
    } catch (e) {
      console.warn('start timer failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const hint = prefs ? (prefs.kind === 'pomodoro' ? pomodoroHint(prefs.pomodoro) : KIND_HINT[prefs.kind]) : '';
  const tz = deviceTz();

  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={sheet.overlay} onPress={onClose}>
        <Pressable style={sheet.body} onPress={() => undefined}>
          <View style={sheet.handle} />
          {failed && (
            <Text style={sheet.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          {prefs && (
            <>
              <View style={styles.segment} accessibilityRole='tablist'>
                {TIMER_HOWS.map((k: TimerKind) => {
                  const on = prefs.kind === k;
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.segCell, on && styles.segOn]}
                      onPress={() => set({ kind: k })}
                      accessibilityRole='tab'
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[sheet.text, on && { color: textOn(GRAY_0) }]} maxFontSizeMultiplier={MAX_SCALE}>
                        {KIND_LABEL[k]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={sheet.sub} maxFontSizeMultiplier={MAX_SCALE}>
                {hint}
              </Text>

              <Text style={sheet.header} maxFontSizeMultiplier={MAX_SCALE}>
                무엇에 집중할까요
              </Text>
              <View style={styles.chips}>
                {chips.map((c) => {
                  const on = prefs.itemId === c.id;
                  return (
                    <Chip key={c.id} on={on} onPress={() => set({ itemId: on ? null : c.id })} label={c.name} />
                  );
                })}
                {adding ? (
                  <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    maxLength={ITEM_NAME_MAX}
                    autoFocus
                    placeholder='새 항목'
                    placeholderTextColor={GRAY_5}
                    returnKeyType='done'
                    onBlur={addItem}
                    maxFontSizeMultiplier={MAX_SCALE}
                    accessibilityLabel='새 항목 이름'
                  />
                ) : (
                  <Chip on={false} onPress={() => setAdding(true)} label='+ 새 항목' />
                )}
              </View>

              {prefs.kind === 'pomodoro' && (
                <>
                  <View style={styles.chips}>
                    {POMODORO_PRESETS.map((p) => {
                      const on = p.focus_min === prefs.pomodoro.focus_min && p.break_min === prefs.pomodoro.break_min;
                      return (
                        <Chip
                          key={p.focus_min}
                          on={on}
                          onPress={() => set({ pomodoro: { ...prefs.pomodoro, ...p } })}
                          label={`${p.focus_min}/${p.break_min}`}
                          a11y={pomodoroHint(p)}
                        />
                      );
                    })}
                  </View>
                  <Stepper
                    label={`${prefs.pomodoro.rounds}바퀴`}
                    onMinus={() =>
                      set({ pomodoro: { ...prefs.pomodoro, rounds: clamp(prefs.pomodoro.rounds - 1, ROUNDS_MIN, ROUNDS_MAX) } })
                    }
                    onPlus={() =>
                      set({ pomodoro: { ...prefs.pomodoro, rounds: clamp(prefs.pomodoro.rounds + 1, ROUNDS_MIN, ROUNDS_MAX) } })
                    }
                    unit='바퀴'
                  />
                </>
              )}
              {prefs.kind === 'timer' && (
                <Stepper
                  label={`${durationText(prefs.minutes * MINUTE_MS)} · ${hhmm(new Date(Date.now() + prefs.minutes * MINUTE_MS), tz)}까지`}
                  onMinus={() => set({ minutes: clamp(prefs.minutes - TIMER_STEP_MIN, TIMER_MIN_MIN, TIMER_MAX_MIN) })}
                  onPlus={() => set({ minutes: clamp(prefs.minutes + TIMER_STEP_MIN, TIMER_MIN_MIN, TIMER_MAX_MIN) })}
                  unit={`${TIMER_STEP_MIN}분`}
                />
              )}

              <TouchableOpacity style={sheet.primary} onPress={start} accessibilityLabel={`${KIND_LABEL[prefs.kind]} 시작`}>
                <Text style={[sheet.text, { color: textOn(ACCENT) }]} maxFontSizeMultiplier={MAX_SCALE}>
                  시작
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({ on, onPress, label, a11y }: { on: boolean; onPress: () => void; label: string; a11y?: string }) {
  return (
    <TouchableOpacity
      style={[styles.chip, on && styles.chipOn]}
      onPress={onPress}
      accessibilityState={{ selected: on }}
      accessibilityLabel={a11y ?? label}
    >
      <Text style={[sheet.text, on && { color: textOn(GRAY_0) }]} maxFontSizeMultiplier={MAX_SCALE}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Stepper(p: { label: string; onMinus: () => void; onPlus: () => void; unit: string }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={p.onMinus} accessibilityLabel={`${p.unit} 줄이기`}>
        <Text style={sheet.text}>−</Text>
      </TouchableOpacity>
      <Text style={sheet.text} maxFontSizeMultiplier={MAX_SCALE} accessibilityLiveRegion='polite'>
        {p.label}
      </Text>
      <TouchableOpacity style={styles.stepBtn} onPress={p.onPlus} accessibilityLabel={`${p.unit} 늘리기`}>
        <Text style={sheet.text}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: GRAY_8, borderRadius: 8, padding: 2 },
  segCell: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segOn: { backgroundColor: GRAY_0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GRAY_7,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: GRAY_0, borderColor: GRAY_0 },
  input: {
    minHeight: 48,
    minWidth: 120,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: GRAY_5,
    color: GRAY_0,
    fontSize: 16,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GRAY_8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
