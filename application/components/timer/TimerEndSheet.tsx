import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { SAVE_FAILED_TEXT } from '@/components/record/texts';
import { getItem } from '@/record/items';
import { hhmm } from '@/record/recordLogic';
import { extendTimer, readRunning, stopTimer, type Running } from '@/record/timerLogic';
import { textOn } from '@/record/categoryStyle';
import { afterTimerChange, getRuntime } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';
import { ACCENT, MAX_SCALE, sheet } from './sheetStyle';

/*
 * 타이머 끝 시트(옛 집중 블록 끝 시트 A안, timer-modes 타이머):
 *   집중 13:30–14:30 끝
 *   [30분 더]
 *   [여기서 끝]        ← 정한 끝 시각에 끝낸다
 * 바깥을 누르면 답 없이 닫힌다. 30분 안에 답이 없으면 앱을 열 때 정한 끝 시각에 끝낸다(settleTimer).
 */
export default function TimerEndSheet({ entryId }: { entryId: string }) {
  const close = useAppStore((s) => s.closeTimerSheet);
  const [r, setR] = useState<Running | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const db = getRuntime().db;
    setFailed(false);
    readRunning(db)
      .then(async (run) => {
        if (!run || run.entry.id !== entryId || run.entry.how !== 'timer') return close();
        setName((await getItem(db, run.entry.item_id))?.name ?? '집중');
        setR(run);
      })
      .catch((e) => console.warn('timer sheet load failed', e));
  }, [entryId, close]);

  if (!r || r.entry.id !== entryId || r.entry.planned_end_at === null) return null;
  const planned = r.entry.planned_end_at;

  const act = async (fn: () => Promise<unknown>) => {
    if (saving) return;
    setSaving(true);
    try {
      await fn();
      setFailed(false);
      close();
      await afterTimerChange();
    } catch (e) {
      console.warn('timer end failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  const db = getRuntime().db;

  return (
    <Modal visible transparent animationType='slide' onRequestClose={close}>
      <Pressable style={sheet.overlay} onPress={close}>
        <Pressable style={sheet.body} onPress={() => undefined}>
          <View style={sheet.handle} />
          <Text style={sheet.header} maxFontSizeMultiplier={MAX_SCALE}>
            {name} {hhmm(new Date(r.entry.start_at), r.entry.tz)}–{hhmm(new Date(planned), r.entry.tz)} 끝
          </Text>
          {failed && (
            <Text style={sheet.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          <TouchableOpacity
            style={sheet.primary}
            onPress={() => act(() => extendTimer(db, Date.now()))}
            accessibilityLabel={`${name} 30분 더`}
          >
            <Text style={[sheet.text, { color: textOn(ACCENT) }]} maxFontSizeMultiplier={MAX_SCALE}>
              30분 더
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={sheet.secondary}
            onPress={() => act(() => stopTimer(db, Date.now(), planned))}
            accessibilityLabel='여기서 끝'
          >
            <Text style={sheet.text} maxFontSizeMultiplier={MAX_SCALE}>
              여기서 끝
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
