import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GRAY_1, GRAY_5 } from '@/assets/palette';
import Timer from '@/components/timer/timer';
import { CATEGORY_LABEL, type BlockRow } from '@/db/types';
import { activeBlock, endFocusNow, extendBlock, remainingLabel } from '@/record/blockLogic';
import { hhmm } from '@/record/recordLogic';
import { afterBlockChange, getRuntime } from '@/runtime/appRuntime';
import { readQuiet } from '@/scheduler/scheduler';
import { useAppStore } from '@/store/appStore';
import FocusStartSheet from './FocusStartSheet';

const MAX_SCALE = 1.3;

/*
 * Home 가운데(디자인 리뷰 DR-1, 실기기 뒤 수정): 30분 타이머는 항상 큰 글자 그대로, 블록 정보는 그 아래 작게.
 *   평소                 블록 중
 *     12:41                 12:41
 *      집중          업무 · 15:30까지 · 1시간 49분 남음
 *                         끝내기   30분 더
 */
export default function FocusStatus() {
  const blockVersion = useAppStore((s) => s.blockVersion);
  const [block, setBlock] = useState<BlockRow | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    activeBlock(getRuntime().db, new Date())
      .then(setBlock)
      .catch((e) => console.warn('active block load failed', e));
  }, []);

  useEffect(load, [load, blockVersion]);
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(() => {
        setNow(new Date());
        load();
      }, 30_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const act = async (fn: (b: BlockRow) => Promise<unknown>) => {
    if (!block || busy) return;
    setBusy(true);
    try {
      await fn(block);
      await afterBlockChange();
    } catch (e) {
      console.warn('focus action failed', e);
    } finally {
      setBusy(false);
      load();
    }
  };

  const label = block ? CATEGORY_LABEL[block.category] : '';
  return (
    <View style={styles.center}>
      <Timer />
      {block ? (
        <>
          <Text style={styles.small} maxFontSizeMultiplier={MAX_SCALE}>
            {label} · {hhmm(new Date(block.end_at), block.tz)}까지 ·{' '}
            {remainingLabel(Date.parse(block.end_at) - now.getTime())} 남음
          </Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => act((b) => endFocusNow(getRuntime().db, b, new Date()))}>
              <Text style={styles.btnText} maxFontSizeMultiplier={MAX_SCALE}>
                끝내기
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => act(async (b) => extendBlock(getRuntime().db, b, new Date(), await readQuiet(getRuntime().db)))}
            >
              <Text style={styles.btnText} maxFontSizeMultiplier={MAX_SCALE}>
                30분 더
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.btn} onPress={() => setStarting(true)} accessibilityLabel='집중 시작'>
            <Text style={styles.btnText} maxFontSizeMultiplier={MAX_SCALE}>
              집중
            </Text>
          </TouchableOpacity>
          <FocusStartSheet visible={starting} onClose={() => setStarting(false)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 16 },
  small: { color: GRAY_5, fontSize: 15, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', gap: 32 },
  btn: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: 12 },
  btnText: { color: GRAY_1, fontSize: 16, textDecorationLine: 'underline' },
});
