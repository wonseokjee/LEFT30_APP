import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { CATEGORY_LABEL, type BlockRow, type Category, type SlotRow } from '@/db/types';
import { getBlock, saveSlot, tzAt } from '@/db/records';
import { logPingAnswered } from '@/scheduler/pingEvents';
import { deferRun, fillRun, type MissedRun } from '@/record/batchLogic';
import { acceptSame, type MorningOffer } from '@/record/morningPlan';
import { ROW_ORDER as PLAN_ORDER } from '@/record/planVsActual';
import { hours } from '@/record/todoLogic';
import PlanTargetSheet from '@/components/todo/PlanTargetSheet';
import { answerBlock, extendBlock } from '@/record/blockLogic';
import { deviceTz, SLOT_MS } from '@/lib/localTime';
import { readPause, readQuiet } from '@/scheduler/scheduler';
import {
  continueCandidate,
  dayPrefix,
  emptySlotBefore,
  hhmm,
  lastEndedSlot,
  slotRangeLabel,
  sourceFor,
  withRo,
} from '@/record/recordLogic';
import { CATEGORY_COLOR, GRID_ORDER, textOn } from '@/record/categoryStyle';
import { afterBlockChange, getRuntime, rescheduleNow, syncNow } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';

const MAX_SCALE = 1.3;
import { SAVE_FAILED_TEXT } from './texts';

type Loaded = {
  slotStart: string;
  tz: string;
  existing: SlotRow | null;
  candidate: SlotRow | null;
  emptyBefore: string | null;
};

// 기록 시트는 모드가 셋이다(eng D1): 칸 기록(sheetSlot), 블록 끝(sheetBlock, UX-2 A), 놓친 칸 묶음(sheetBatch, UX-3).
// 칸 기록 → 블록 끝 → 묶음 순서로 먼저 연다.
export default function RecordSheet() {
  const sheetSlot = useAppStore((s) => s.sheetSlot);
  const sheetBlock = useAppStore((s) => s.sheetBlock);
  const sheetBatch = useAppStore((s) => s.sheetBatch);
  const sheetMorning = useAppStore((s) => s.sheetMorning);
  if (!sheetSlot && sheetBlock) return <BlockEndSheet blockId={sheetBlock} />;
  if (!sheetSlot && sheetBatch) return <BatchSheet run={sheetBatch} />;
  if (!sheetSlot && sheetMorning) return <MorningSheet offer={sheetMorning} />;
  return <SlotSheet />;
}

/*
 * 아침 계획 제안(재출시 설계 E1):
 *   오늘 계획
 *   업무 6h · 운동 1h            ← 어제 값(어제 계획, 없으면 어제 기록)
 *   [어제와 동일]
 *   [새로 짜기]                  ← 총량 스테퍼 시트(D11)
 * 어제 값이 없으면 바로 새로 짜기 시트. 바깥을 누르면 닫히고 그날은 다시 묻지 않는다.
 */
function MorningSheet({ offer }: { offer: MorningOffer }) {
  const close = useAppStore((s) => s.closeMorningSheet);
  const [custom, setCustom] = useState(offer.kind === 'new');
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const done = () => {
    close();
    useAppStore.getState().bumpBlocks();
    void syncNow();
  };

  if (custom || offer.kind === 'new') {
    return <PlanTargetSheet visible date={offer.date} from='morning' onClose={close} onSaved={done} />;
  }
  const summary = PLAN_ORDER.filter((c) => (offer.targets[c] ?? 0) > 0)
    .map((c) => `${CATEGORY_LABEL[c]} ${hours(offer.targets[c] ?? 0)}`)
    .join(' · ');
  const same = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await acceptSame(getRuntime().db, offer, new Date());
      done();
    } catch (e) {
      console.warn('morning plan failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType='slide' onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
            오늘 계획
          </Text>
          <Text style={styles.summary} maxFontSizeMultiplier={MAX_SCALE}>
            {summary}
          </Text>
          {failed && (
            <Text style={styles.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          <TouchableOpacity style={[styles.endButton, { marginBottom: 8 }]} onPress={same} accessibilityLabel='어제와 동일'>
            <Text style={styles.cellText} maxFontSizeMultiplier={MAX_SCALE}>
              어제와 동일
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endButton} onPress={() => setCustom(true)} accessibilityLabel='새로 짜기'>
            <Text style={styles.cellText} maxFontSizeMultiplier={MAX_SCALE}>
              새로 짜기
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/*
 * 놓친 칸 묶음(UX-3, CP-1):
 *   13:00–18:00 비어 있어요 (10칸)
 *   [계획대로 · 업무]  또는  [그대로 계속 · 업무]   ← 묶음 전체를 같은 값으로
 *   [6칸 카테고리]
 *   ─────────────
 *   중간에 바뀌었어요  따로 채울게요                ← 닫고 같은 칸은 다시 묻지 않음(시간표에서 채움)
 * 바깥을 누르면 그냥 닫힌다(다음에 앱을 열 때 다시 묻는다).
 */
function BatchSheet({ run }: { run: MissedRun }) {
  const close = useAppStore((s) => s.closeBatchSheet);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const act = async (fn: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    try {
      await fn();
      setFailed(false);
      close();
      useAppStore.getState().bumpBlocks();
      void rescheduleNow();
      void syncNow();
    } catch (e) {
      console.warn('batch fill failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  const fill = (category: Category) => act(() => fillRun(getRuntime().db, run, category, new Date()));
  const first = new Date(run.slots[0]);
  const end = new Date(Date.parse(run.slots[run.slots.length - 1]) + SLOT_MS);
  const top = run.plan ?? run.previous;
  const topLabel = run.plan ? '계획대로' : '그대로 계속';
  const count = run.slots.length;

  return (
    <Modal visible transparent animationType='slide' onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
            {dayPrefix(run.slots[0], new Date(), run.tz)}
            {hhmm(first, run.tz)}–{hhmm(end, run.tz)} 비어 있어요 ({count}칸)
          </Text>
          {failed && (
            <Text style={styles.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          {top && (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: CATEGORY_COLOR[top] }]}
              onPress={() => fill(top)}
              accessibilityLabel={`${topLabel}, ${count}칸 모두 ${withRo(CATEGORY_LABEL[top])} 기록`}
            >
              <Text style={[styles.continueText, { color: textOn(CATEGORY_COLOR[top]) }]} maxFontSizeMultiplier={MAX_SCALE}>
                {topLabel} · {CATEGORY_LABEL[top]}
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.grid}>
            {GRID_ORDER.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.cell}
                onPress={() => fill(category)}
                accessibilityLabel={`${count}칸 모두 ${withRo(CATEGORY_LABEL[category])} 기록`}
              >
                <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[category] }]} />
                <Text style={styles.cellText} maxFontSizeMultiplier={MAX_SCALE}>
                  {CATEGORY_LABEL[category]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.emptyRow}
            onPress={() => act(() => deferRun(getRuntime().db, run, new Date()))}
            accessibilityLabel='중간에 바뀌었어요, 따로 채울게요'
          >
            <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_SCALE}>
              중간에 바뀌었어요
            </Text>
            <Text style={styles.emptyAction} maxFontSizeMultiplier={MAX_SCALE}>
              따로 채울게요
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/*
 * 블록 끝 시트 A(UX-2):
 *   업무 13:30–15:30 끝
 *   [업무 30분 더]        ← 블록 카테고리 색
 *   [여기서 끝]
 *   ─────────────
 *   중간에 다른 걸 했어요  고치기   → 블록 칸을 채운 뒤 Timetable로
 * 바깥을 누르면 답 없이 닫힌다(다음 30분 알림 시각에 no_answer).
 */
function BlockEndSheet({ blockId }: { blockId: string }) {
  const close = useAppStore((s) => s.closeBlockSheet);
  const router = useRouter();
  const [block, setBlock] = useState<BlockRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    getBlock(getRuntime().db, blockId)
      .then((b) => {
        // 이미 끝났거나 지운 블록이면 띄우지 않는다.
        if (!b || b.deleted || b.state === 'ended' || b.state === 'cancelled') close();
        else setBlock(b);
      })
      .catch((e) => console.warn('block sheet load failed', e));
  }, [blockId, close]);

  if (!block || block.id !== blockId) return null;
  const color = CATEGORY_COLOR[block.category];
  const label = CATEGORY_LABEL[block.category];

  const act = async (fn: () => Promise<unknown>, after?: () => void) => {
    if (saving) return;
    setSaving(true);
    try {
      await fn();
      setFailed(false);
      close();
      after?.();
      void afterBlockChange();
    } catch (e) {
      console.warn('block end failed', e);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };
  const quiet = () => readQuiet(getRuntime().db);

  return (
    <Modal visible transparent animationType='slide' onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
            {label} {hhmm(new Date(block.start_at), block.tz)}–{hhmm(new Date(block.end_at), block.tz)} 끝
          </Text>
          {failed && (
            <Text style={styles.error} maxFontSizeMultiplier={MAX_SCALE}>
              {SAVE_FAILED_TEXT}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: color }]}
            onPress={() => act(async () => extendBlock(getRuntime().db, block, new Date(), await quiet()))}
            accessibilityLabel={`${label} 30분 더`}
          >
            <Text style={[styles.continueText, { color: textOn(color) }]} maxFontSizeMultiplier={MAX_SCALE}>
              {label} 30분 더
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.endButton}
            onPress={() => act(() => answerBlock(getRuntime().db, block, new Date()))}
            accessibilityLabel='여기서 끝'
          >
            <Text style={styles.cellText} maxFontSizeMultiplier={MAX_SCALE}>
              여기서 끝
            </Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.emptyRow}
            onPress={() =>
              act(
                () => answerBlock(getRuntime().db, block, new Date()),
                () => router.navigate('/(tabs)/plan'),
              )
            }
            accessibilityLabel='중간에 다른 걸 했어요, 시간표에서 고치기'
          >
            <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_SCALE}>
              중간에 다른 걸 했어요
            </Text>
            <Text style={styles.emptyAction} maxFontSizeMultiplier={MAX_SCALE}>
              고치기
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// 기록 모달(디자인 리뷰 D4): 어두운 바텀 시트, 카테고리를 누르면 바로 저장하고 닫힌다. 확인 버튼은 없다.
function SlotSheet() {
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
      const quiet = await readQuiet(db);
      const pause = await readPause(db);
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
          pause,
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
      // S1-COUNT: 답한 시간대를 센다. 처음 기록할 때만(고치기는 세지 않음).
      if (!existing) {
        await logPingAnswered(getRuntime().db, row.slot_start, row.source, now);
      }
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
            {dayPrefix(loaded.slotStart, new Date(), loaded.tz)}
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
  summary: {
    color: GRAY_5,
    fontSize: 15,
    marginBottom: 16,
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
  endButton: {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: GRAY_8,
    justifyContent: 'center',
    alignItems: 'center',
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
