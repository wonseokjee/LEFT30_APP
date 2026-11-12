import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8 } from '@/assets/palette';
import { CATEGORY_LABEL } from '@/db/types';
import { saveSlot, undoSlot } from '@/db/records';
import { withRo } from '@/record/recordLogic';
import { getRuntime, rescheduleNow, syncNow } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';
import { SAVE_FAILED_TEXT } from './texts';

const MAX_SCALE = 1.3;
const VISIBLE_MS = 3000;
const MEMO_MAX = 500;

// 저장 후 3초 토스트: "업무로 기록 · 메모 추가 · 되돌리기". 메모는 여기서만 입력한다.
// 닫힐 때 동기화한다. 그래서 되돌리기 전에 서버로 먼저 나가지 않는다.
export default function RecordToast() {
  const lastSaved = useAppStore((s) => s.lastSaved);
  const setLastSaved = useAppStore((s) => s.setLastSaved);
  const [editing, setEditing] = useState(false);
  const [memo, setMemo] = useState('');
  // 되돌리기·메모 저장이 실패하면 닫지 않고 한 줄로 알린다(eng review D12). 다시 누르면 재시도한다.
  const [failed, setFailed] = useState(false);

  const dismiss = () => {
    setEditing(false);
    setMemo('');
    setFailed(false);
    setLastSaved(null);
    void syncNow();
  };

  useEffect(() => {
    if (!lastSaved || editing || failed) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSaved, editing, failed]);

  if (!lastSaved) return null;
  const { slot, previous } = lastSaved;

  const undo = async () => {
    try {
      await undoSlot(getRuntime().db, slot, previous);
    } catch (e) {
      console.warn('undo failed', e);
      setFailed(true);
      return;
    }
    void rescheduleNow();
    dismiss();
  };

  const saveMemo = async () => {
    try {
      const note = memo.trim();
      await saveSlot(getRuntime().db, {
        ...slot,
        note: note.length > 0 ? note : null,
        client_updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('memo save failed', e);
      setFailed(true);
      return;
    }
    dismiss();
  };

  if (editing) {
    return (
      <View style={[styles.toast, styles.wrap]}>
        {failed && (
          <Text style={styles.failedLine} maxFontSizeMultiplier={MAX_SCALE}>
            {SAVE_FAILED_TEXT}
          </Text>
        )}
        <TextInput
          style={styles.input}
          value={memo}
          onChangeText={setMemo}
          maxLength={MEMO_MAX}
          placeholder='메모'
          placeholderTextColor={GRAY_5}
          autoFocus
          multiline
          maxFontSizeMultiplier={MAX_SCALE}
        />
        <TouchableOpacity style={styles.action} onPress={saveMemo}>
          <Text style={styles.actionText} maxFontSizeMultiplier={MAX_SCALE}>
            저장
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.toast}>
      <Text style={[styles.text, failed && styles.failedText]} maxFontSizeMultiplier={MAX_SCALE}>
        {failed ? SAVE_FAILED_TEXT : `${withRo(CATEGORY_LABEL[slot.category])} 기록`}
      </Text>
      <TouchableOpacity
        style={styles.action}
        onPress={() => {
          setMemo(slot.note ?? '');
          setEditing(true);
        }}
      >
        <Text style={styles.actionText} maxFontSizeMultiplier={MAX_SCALE}>
          메모 추가
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={undo}>
        <Text style={styles.actionText} maxFontSizeMultiplier={MAX_SCALE}>
          되돌리기
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GRAY_8,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  text: {
    flex: 1,
    color: GRAY_0,
    fontSize: 13,
  },
  failedText: {
    color: GRAY_5,
  },
  wrap: {
    flexWrap: 'wrap',
  },
  failedLine: {
    width: '100%',
    color: GRAY_5,
    fontSize: 13,
    paddingTop: 8,
  },
  action: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionText: {
    color: GRAY_0,
    fontSize: 13,
    textDecorationLine: 'underline',
    textDecorationColor: GRAY_7,
  },
  input: {
    flex: 1,
    color: GRAY_0,
    fontSize: 16,
    paddingVertical: 12,
  },
});
