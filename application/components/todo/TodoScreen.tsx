import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useFocusEffect } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_6, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { CATEGORY_LABEL, type BlockRow, type SlotRow } from '@/db/types';
import { deviceTz, localParts, SLOT_MS } from '@/lib/localTime';
import { conflictingSlots } from '@/record/blockLogic';
import { CATEGORY_COLOR, textOn } from '@/record/categoryStyle';
import { hhmm, withRo } from '@/record/recordLogic';
import {
  barSpan,
  canCheck,
  checkBlock,
  defaultRange,
  deletePlanBlock,
  hours,
  importYesterday,
  isChecked,
  planBlocksOn,
  planRowsOn,
  restoreBlock,
  totalsLine,
  undoCheck,
  type CheckUndo,
  type TotalLine,
} from '@/record/todoLogic';
import { afterBlockChange, getRuntime } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';
import { SAVE_FAILED_TEXT } from '@/components/record/texts';
import BlockEditSheet from './BlockEditSheet';
import PlanTargetSheet from './PlanTargetSheet';

const MAX_SCALE = 1.3;
const TOAST_MS = 3000;
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

type Toast = { text: string; undo?: () => Promise<void> };

/*
 * Todo 탭(디자인 리뷰 DR-3·4·9·10).
 * 11월 12일 (수)
 * 목표 업무 6h (3h 정함) · 운동 1h ›         ← 누르면 총량 목표 시트
 * ▓▓▓        ▓▓▓|         ▓▓               ← 하루 막대 06–24, 흰 세로줄 = 지금
 * ◉ 09:00–11:00 ● 업무 · 메일·회의           ← 체크됨(흐리게)
 * ○ 14:00–16:00 ● 업무 · 보고서 쓰기         ← 끝났으면 원을 눌러 체크, 줄을 누르면 수정, 왼쪽으로 밀면 지우기
 * + 추가
 */
export default function TodoScreen() {
  const blockVersion = useAppStore((s) => s.blockVersion);
  const [now, setNow] = useState(() => new Date());
  const tz = deviceTz();
  const date = localParts(now, tz).date;
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [totals, setTotals] = useState<TotalLine[]>([]);
  const [hasYesterday, setHasYesterday] = useState(false);
  const [edit, setEdit] = useState<{ block: BlockRow | null } | null>(null);
  const [targets, setTargets] = useState(false);
  const [conflict, setConflict] = useState<{ block: BlockRow; slots: SlotRow[] } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const busy = useRef(false);

  const load = useCallback(() => {
    const db = getRuntime().db;
    const at = new Date();
    const day = localParts(at, tz).date;
    setNow(at);
    (async () => {
      const list = await planBlocksOn(db, day, tz);
      setBlocks(list);
      setTotals(totalsLine(await planRowsOn(db, day), list));
      if (list.length === 0) {
        const [y, m, d] = day.split('-').map(Number);
        const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
        setHasYesterday((await planBlocksOn(db, yesterday, tz)).length > 0);
      }
    })().catch((e) => console.warn('todo load failed', e));
  }, [tz]);

  useEffect(load, [load, blockVersion]);
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 30_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // 블록을 바꾸는 일은 한 번에 하나만. 끝나면 알림·화면·동기화를 맞춘다.
  const run = async (fn: () => Promise<Toast | null>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await fn();
      if (next) setToast(next);
    } catch (e) {
      console.warn('todo action failed', e);
      setToast({ text: SAVE_FAILED_TEXT });
    } finally {
      busy.current = false;
      await afterBlockChange();
      load();
    }
  };

  const remove = (b: BlockRow) => {
    setEdit(null);
    void run(async () => {
      const db = getRuntime().db;
      await deletePlanBlock(db, b, new Date());
      return { text: '지웠어요', undo: () => restoreBlock(db, b, new Date()) };
    });
  };

  const check = (b: BlockRow, overwrite: boolean) => {
    setConflict(null);
    void run(async () => {
      const db = getRuntime().db;
      const undo: CheckUndo = await checkBlock(db, b, new Date(), overwrite);
      return { text: `${withRo(CATEGORY_LABEL[b.category])} 기록`, undo: () => undoCheck(db, undo, new Date()) };
    });
  };

  const onCircle = async (b: BlockRow) => {
    if (!canCheck(b, new Date())) return;
    try {
      const slots = await conflictingSlots(getRuntime().db, b);
      if (slots.length > 0) setConflict({ block: b, slots });
      else check(b, false);
    } catch (e) {
      console.warn('conflict check failed', e);
      setToast({ text: SAVE_FAILED_TEXT });
    }
  };

  const importFromYesterday = () =>
    run(async () => {
      const { added, skipped } = await importYesterday(getRuntime().db, date, tz, new Date());
      if (skipped > 0) return { text: `${skipped}개는 겹쳐서 뺐어요` };
      return added > 0 ? null : { text: '가져올 블록이 없어요' };
    });

  const range = (b: BlockRow) => `${hhmm(new Date(b.start_at), tz)}–${hhmm(new Date(b.end_at), tz)}`;
  const nowMin = localParts(now, tz).minuteOfDay;
  const [, month, day] = date.split('-').map(Number);
  const weekday = WEEKDAY[localParts(now, tz).weekday];

  const totalsText =
    totals.length === 0
      ? '목표 정하기 ›'
      : '목표 ' +
        totals
          .map((l) => `${CATEGORY_LABEL[l.category]} ${hours(l.target)}${l.planned > 0 ? ` (${hours(l.planned)} 정함)` : ''}`)
          .join(' · ') +
        ' ›';

  const row = (b: BlockRow) => {
    const color = CATEGORY_COLOR[b.category];
    const done = isChecked(b);
    const ended = Date.parse(b.end_at) <= now.getTime();
    const live = !ended && Date.parse(b.start_at) <= now.getTime();
    const status = done ? '체크됨' : ended ? '끝남, 두 번 눌러 체크' : live ? '진행 중' : '예정';
    return (
      <Swipeable
        key={b.id}
        friction={2}
        rightThreshold={40}
        renderRightActions={() => (
          <TouchableOpacity style={styles.swipeDel} onPress={() => remove(b)} accessibilityLabel={`${range(b)} 지우기`}>
            <Text style={styles.swipeText} maxFontSizeMultiplier={MAX_SCALE}>
              지우기
            </Text>
          </TouchableOpacity>
        )}
      >
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkHit}
            onPress={() => onCircle(b)}
            accessibilityRole='checkbox'
            accessibilityState={{ checked: done, disabled: !done && !ended }}
            accessibilityLabel={`${range(b)} ${CATEGORY_LABEL[b.category]}, ${status}`}
          >
            <View style={[styles.check, done && { backgroundColor: color, borderColor: color }]}>
              {done && <Text style={{ color: textOn(color), fontSize: 14 }}>✓</Text>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.body} onPress={() => setEdit({ block: b })} accessibilityLabel={`${range(b)} 수정`}>
            <Text style={[styles.time, done && styles.dim]} maxFontSizeMultiplier={MAX_SCALE}>
              {range(b)}
            </Text>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.title, done && styles.dim]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>
              {CATEGORY_LABEL[b.category]}
              {b.title ? ` · ${b.title}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.date} maxFontSizeMultiplier={MAX_SCALE}>
        {month}월 {day}일 ({weekday})
      </Text>
      <TouchableOpacity style={styles.totals} onPress={() => setTargets(true)}>
        <Text style={styles.totalsText} maxFontSizeMultiplier={MAX_SCALE}>
          {totalsText}
        </Text>
      </TouchableOpacity>

      {blocks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_SCALE}>
            오늘 계획 블록이 없어요
          </Text>
          <View style={styles.emptyLinks}>
            {hasYesterday && (
              <TouchableOpacity style={styles.linkHit} onPress={importFromYesterday}>
                <Text style={styles.link} maxFontSizeMultiplier={MAX_SCALE}>
                  어제 가져오기
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.linkHit} onPress={() => setEdit({ block: null })}>
              <Text style={styles.link} maxFontSizeMultiplier={MAX_SCALE}>
                + 추가
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View
            style={styles.bar}
            accessible
            accessibilityLabel={`오늘 계획 ${blocks.length}개, 지금 ${Math.floor(nowMin / 60)}시 ${nowMin % 60}분`}
          >
            {blocks.map((b) => {
              const span = barSpan(b, date, tz);
              if (!span) return null;
              return (
                <View
                  key={b.id}
                  style={[
                    styles.barBlock,
                    { left: `${span.left * 100}%`, width: `${span.width * 100}%`, backgroundColor: CATEGORY_COLOR[b.category] },
                  ]}
                />
              );
            })}
            {nowMin >= 6 * 60 && <View style={[styles.nowLine, { left: `${((nowMin - 360) / 1080) * 100}%` }]} />}
          </View>
          <View style={styles.barLabels} importantForAccessibility='no-hide-descendants'>
            {['06', '12', '18', '24'].map((t) => (
              <Text key={t} style={styles.barLabel} maxFontSizeMultiplier={MAX_SCALE}>
                {t}
              </Text>
            ))}
          </View>
          {blocks.map(row)}
          <TouchableOpacity style={styles.linkHit} onPress={() => setEdit({ block: null })}>
            <Text style={styles.link} maxFontSizeMultiplier={MAX_SCALE}>
              + 추가
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BlockEditSheet
        visible={edit !== null}
        date={date}
        tz={tz}
        initial={defaultRange(blocks, date, now, tz)}
        editing={edit?.block ?? null}
        onClose={() => setEdit(null)}
        onSaved={() => {
          setEdit(null);
          void afterBlockChange().then(load);
        }}
        onDelete={remove}
      />
      <PlanTargetSheet
        visible={targets}
        date={date}
        onClose={() => setTargets(false)}
        onSaved={() => {
          setTargets(false);
          load();
        }}
      />
      {conflict && <ConflictSheet {...conflict} tz={tz} onPick={(o) => check(conflict.block, o)} onClose={() => setConflict(null)} />}

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText} maxFontSizeMultiplier={MAX_SCALE}>
            {toast.text}
          </Text>
          {toast.undo && (
            <TouchableOpacity
              style={styles.toastAction}
              onPress={() => {
                const undo = toast.undo!;
                setToast(null);
                void run(async () => {
                  await undo();
                  return null;
                });
              }}
            >
              <Text style={styles.toastActionText} maxFontSizeMultiplier={MAX_SCALE}>
                되돌리기
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

/*
 * DR-3 겹침 시트: 체크하려는 블록 시간에 이미 다른 카테고리 기록이 있으면 고르게 한다.
 * 14:00–16:00 업무 · 15:00–15:30이 이미 '휴식'으로 기록돼 있어요
 * [모두 업무로 (계획대로)] [기록 그대로, 빈 칸만 업무]
 */
function ConflictSheet({
  block,
  slots,
  tz,
  onPick,
  onClose,
}: {
  block: BlockRow;
  slots: SlotRow[];
  tz: string;
  onPick: (overwrite: boolean) => void;
  onClose: () => void;
}) {
  const label = CATEGORY_LABEL[block.category];
  const first = slots[0];
  const firstRange = `${hhmm(new Date(first.slot_start), tz)}–${hhmm(new Date(Date.parse(first.slot_start) + SLOT_MS), tz)}`;
  const more = slots.length > 1 ? ` 외 ${slots.length - 1}칸이` : '이';
  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.sheetHeader} maxFontSizeMultiplier={MAX_SCALE}>
            {hhmm(new Date(block.start_at), tz)}–{hhmm(new Date(block.end_at), tz)} {label}
          </Text>
          <Text style={styles.sheetBody} maxFontSizeMultiplier={MAX_SCALE}>
            {firstRange}
            {more} 이미 {withRo(CATEGORY_LABEL[first.category])} 기록돼 있어요
          </Text>
          <TouchableOpacity style={styles.sheetBtn} onPress={() => onPick(true)}>
            <Text style={styles.sheetBtnText} maxFontSizeMultiplier={MAX_SCALE}>
              모두 {withRo(label)} (계획대로)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetBtn} onPress={() => onPick(false)}>
            <Text style={styles.sheetBtnText} maxFontSizeMultiplier={MAX_SCALE}>
              기록 그대로, 빈 칸만 {label}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', paddingHorizontal: 16, paddingTop: 16 },
  date: { color: GRAY_0, fontSize: 18 },
  totals: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  totalsText: { color: GRAY_6, fontSize: 14 },
  bar: { height: 12, backgroundColor: GRAY_8, borderRadius: 2, marginTop: 8, marginBottom: 6 },
  barBlock: { position: 'absolute', top: 0, bottom: 0 },
  nowLine: { position: 'absolute', top: -4, bottom: -4, width: 2, backgroundColor: GRAY_0 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  barLabel: { color: GRAY_6, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, backgroundColor: 'black' },
  checkHit: { width: 48, height: 52, justifyContent: 'center' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GRAY_5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  time: { color: GRAY_5, fontSize: 15 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { color: GRAY_0, fontSize: 16, flex: 1 },
  dim: { color: GRAY_6 },
  swipeDel: { width: 88, backgroundColor: GRAY_8, alignItems: 'center', justifyContent: 'center' },
  swipeText: { color: GRAY_0, fontSize: 15 },
  linkHit: { minHeight: 48, justifyContent: 'center', marginTop: 8 },
  link: { color: GRAY_0, fontSize: 16, textDecorationLine: 'underline' },
  empty: { marginTop: 80, alignItems: 'center', gap: 8 },
  emptyText: { color: GRAY_5, fontSize: 16 },
  emptyLinks: { flexDirection: 'row', gap: 24 },
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
  sheetHeader: { color: GRAY_0, fontSize: 16, marginBottom: 8 },
  sheetBody: { color: GRAY_5, fontSize: 15, marginBottom: 16 },
  sheetBtn: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: GRAY_8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sheetBtnText: { color: GRAY_0, fontSize: 16 },
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
    minHeight: 48,
  },
  toastText: { flex: 1, color: GRAY_0, fontSize: 13 },
  toastAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  toastActionText: { color: GRAY_0, fontSize: 13, textDecorationLine: 'underline', textDecorationColor: GRAY_7 },
});
