import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { CATEGORY_LABEL, type Category, type SlotRow } from '@/db/types';
import { getSetting, saveSlot, tzAt } from '@/db/records';
import { deviceTz, SLOT_MS } from '@/lib/localTime';
import { QUIET_KEY } from '@/scheduler/scheduler';
import type { Quiet } from '@/scheduler/plan';
import {
  continueCandidate,
  emptySlotBefore,
  hhmm,
  lastEndedSlot,
  slotRangeLabel,
  sourceFor,
  withRo,
} from '@/record/recordLogic';
import { CATEGORY_COLOR, GRID_ORDER, textOn } from '@/record/categoryStyle';
import { getRuntime, rescheduleNow } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

const MAX_SCALE = 1.3;
export const SAVE_FAILED_TEXT = '저장하지 못했어요. 다시 눌러 주세요';

type Loaded = {
  slotStart: string;
  tz: string;
  existing: SlotRow | null;
  candidate: SlotRow | null;
  emptyBefore: string | null;
};

// 기록 모달(디자인 리뷰 D4): 어두운 바텀 시트, 카테고리를 누르면 바로 저장하고 닫힌다. 확인 버튼은 없다.
export default function RecordSheet() {
  const sheetSlot = useAppStore((s) => s.sheetSlot);
  const openSheet = useAppStore((s) => s.openSheet);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const setLastSaved = useAppStore((s) => s.setLastSaved);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saving, setSaving] = useState(false);
  // 저장 실패 시 한 줄 안내(eng review D5). 다른 칸을 열거나 저장에 성공하면 사라진다.
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setSaveFailed(false);
    if (!sheetSlot) {
      setLoaded(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { db } = getRuntime();
      const start = Date.parse(sheetSlot);
      const tz = await tzAt(db, new Date(start), deviceTz());
      const slots = await db.all<SlotRow>(
        'SELECT * FROM slot WHERE slot_start >= ? AND slot_start <= ?',
        [new Date(start - 2 * SLOT_MS).toISOString(), sheetSlot],
      );
      const quiet = await getSetting<Quiet>(db, QUIET_KEY);
      if (cancelled) return;
      setLoaded({
        slotStart: sheetSlot,
        tz,
        existing: slots.find((s) => s.slot_start === sheetSlot) ?? null,
        candidate: continueCandidate(sheetSlot, slots),
        emptyBefore: emptySlotBefore({
          slotStart: sheetSlot,
          now: new Date(),
          filled: new Set(slots.map((s) => s.slot_start)),
          quiet,
          tz,
        }),
      });
    })().catch((e) => console.warn('record sheet load failed', e));
    return () => {
      cancelled = true;
    };
  }, [sheetSlot]);

  if (!sheetSlot || !loaded || loaded.slotStart !== sheetSlot) return null;

  const choose = async (category: Category, continued: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const now = new Date();
      const { existing } = loaded;
      const row: SlotRow = {
        slot_start: loaded.slotStart,
        tz: loaded.tz,
        category,
        note: existing?.note ?? null,
        source: sourceFor(loaded.slotStart, now, existing, continued),
        answered_at: existing?.answered_at ?? now.toISOString(),
        client_updated_at: now.toISOString(),
      };
      await saveSlot(getRuntime().db, row);
      setSaveFailed(false);
      setLastSaved({ slot: row, previous: existing });
      closeSheet();
      // 다음 칸 맥락 문구가 바뀔 수 있다. 동기화는 토스트가 닫힌 뒤(되돌리기 기회를 준 뒤) 한다.
      void rescheduleNow();
    } catch (e) {
      console.warn('save slot failed', e);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const isNow = loaded.slotStart === lastEndedSlot(new Date(), loaded.tz);
  const { candidate, emptyBefore } = loaded;

  return (
    <Modal visible transparent animationType='slide' onRequestClose={closeSheet}>
      <Pressable style={styles.overlay} onPress={closeSheet}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
            {slotRangeLabel(loaded.slotStart, loaded.tz)}
            {isNow ? ' 지금 칸' : ''}
          </Text>
          {saveFailed && (
            <Text style={styles.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}

          {candidate && (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: CATEGORY_COLOR[candidate.category] }]}
              onPress={() => choose(candidate.category, true)}
              accessibilityLabel={`그대로 계속, ${withRo(CATEGORY_LABEL[candidate.category])} 기록`}
            >
              <Text
                style={[styles.continueText, { color: textOn(CATEGORY_COLOR[candidate.category]) }]}
                maxFontSizeMultiplier={MAX_SCALE}
              >
                그대로 계속 · {CATEGORY_LABEL[candidate.category]}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.grid}>
            {GRID_ORDER.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.cell}
                onPress={() => choose(category, false)}
                accessibilityLabel={`${withRo(CATEGORY_LABEL[category])} 기록`}
              >
                <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[category] }]} />
                <Text style={styles.cellText} maxFontSizeMultiplier={MAX_SCALE}>
                  {CATEGORY_LABEL[category]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {emptyBefore && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.emptyRow}
                onPress={() => openSheet(emptyBefore)}
                accessibilityLabel={`${hhmm(new Date(emptyBefore), loaded.tz)} 칸 채우기`}
              >
                <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_SCALE}>
                  {hhmm(new Date(emptyBefore), loaded.tz)} 칸이 비어 있어요
                </Text>
                <Text style={styles.emptyAction} maxFontSizeMultiplier={MAX_SCALE}>
                  채우기
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: GRAY_9,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GRAY_7,
    marginBottom: 12,
  },
  header: {
    color: GRAY_0,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: GRAY_5,
    fontSize: 13,
    marginTop: -4,
    marginBottom: 12,
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueText: {
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cellText: {
    color: GRAY_0,
    fontSize: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: GRAY_7,
    marginTop: 16,
  },
  emptyRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: {
    color: GRAY_5,
    fontSize: 13,
  },
  emptyAction: {
    color: GRAY_0,
    fontSize: 13,
  },
});
