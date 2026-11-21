import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { GRAY_8 } from '@/assets/palette';
import { SAVE_FAILED_TEXT } from '@/components/record/texts';
import { MINUTE_MS } from '@/lib/localTime';
import { textOn } from '@/record/categoryStyle';
import { hhmm } from '@/record/recordLogic';
import { clamp } from '@/record/timerHome';
import type { Running } from '@/record/timerLogic';
import { ACCENT, MAX_SCALE, sheet } from './sheetStyle';

/*
 * FORGOT B(디자인 리뷰 D11): 스톱워치가 3시간 넘게 돌면 앱을 열 때 한 번 묻는다.
 *   6시간째 진행 중, 끝난 시각을 고칠까요?
 *   [계속]                     ← 이 세션에서는 다시 묻지 않음
 *   [끝 시각 고치기] → − 13:45 + → [이 시각에 정지]
 */
export default function ForgotSheet(p: {
  running: Running;
  hours: number;
  onKeep: () => void;
  onStopAt: (at: number) => Promise<void>;
}) {
  const start = p.running.entry.start_at;
  const tz = p.running.entry.tz;
  const [editing, setEditing] = useState(false);
  const [at, setAt] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => setAt(Date.now()), [editing]);

  const move = (min: number) => setAt((t) => clamp(t + min * MINUTE_MS, start + MINUTE_MS, Date.now()));
  const stop = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await p.onStopAt(at);
    } catch (e) {
      console.warn('forgot stop failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType='slide' onRequestClose={p.onKeep}>
      <Pressable style={sheet.overlay} onPress={p.onKeep}>
        <Pressable style={sheet.body} onPress={() => undefined}>
          <View style={sheet.handle} />
          <Text style={sheet.header} maxFontSizeMultiplier={MAX_SCALE}>
            {p.hours}시간째 진행 중, 끝난 시각을 고칠까요?
          </Text>
          {failed && (
            <Text style={sheet.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          {!editing ? (
            <>
              <TouchableOpacity style={sheet.secondary} onPress={p.onKeep}>
                <Text style={sheet.text} maxFontSizeMultiplier={MAX_SCALE}>
                  계속
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={sheet.secondary} onPress={() => setEditing(true)}>
                <Text style={sheet.text} maxFontSizeMultiplier={MAX_SCALE}>
                  끝 시각 고치기
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={sheet.sub} maxFontSizeMultiplier={MAX_SCALE}>
                {hhmm(new Date(start), tz)}에 시작
              </Text>
              <View style={styles.row}>
                {[-60, -15].map((m) => (
                  <Step key={m} min={m} onPress={() => move(m)} />
                ))}
                <Text style={styles.time} maxFontSizeMultiplier={MAX_SCALE} accessibilityLiveRegion='polite'>
                  {hhmm(new Date(at), tz)}
                </Text>
                {[15, 60].map((m) => (
                  <Step key={m} min={m} onPress={() => move(m)} />
                ))}
              </View>
              <TouchableOpacity style={sheet.primary} onPress={stop} accessibilityLabel={`${hhmm(new Date(at), tz)}에 정지`}>
                <Text style={[sheet.text, { color: textOn(ACCENT) }]} maxFontSizeMultiplier={MAX_SCALE}>
                  이 시각에 정지
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Step({ min, onPress }: { min: number; onPress: () => void }) {
  const text = Math.abs(min) === 60 ? '1시간' : `${Math.abs(min)}분`;
  return (
    <TouchableOpacity style={styles.step} onPress={onPress} accessibilityLabel={`${text} ${min < 0 ? '앞으로' : '뒤로'}`}>
      <Text style={sheet.sub} maxFontSizeMultiplier={MAX_SCALE}>
        {min < 0 ? '−' : '+'}
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { color: sheet.text.color, fontSize: 24 },
  step: { minWidth: 56, minHeight: 48, borderRadius: 8, backgroundColor: GRAY_8, alignItems: 'center', justifyContent: 'center' },
});
