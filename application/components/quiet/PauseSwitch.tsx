import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { GRAY_0, GRAY_5, GRAY_7, GRAY_8, GRAY_9 } from '@/assets/palette';
import { logEvent, setSetting } from '@/db/records';
import { uuidv4 } from '@/lib/uuid';
import { isPaused, type Pause } from '@/scheduler/plan';
import { PAUSE_KEY, readPause } from '@/scheduler/scheduler';
import { getRuntime, rescheduleNow } from '@/runtime/appRuntime';

const MAX_SCALE = 1.3;
const HOUR_MS = 60 * 60 * 1000;

type Choice = { label: string; until: (now: Date) => Date | null };

// 다음 날 00:00(기기 시간대)
function endOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

const CHOICES: Choice[] = [
  { label: '1시간', until: (now) => new Date(now.getTime() + HOUR_MS) },
  { label: '3시간', until: (now) => new Date(now.getTime() + 3 * HOUR_MS) },
  { label: '오늘 하루', until: endOfToday },
  { label: '다시 켤 때까지', until: () => null },
];

function two(n: number): string {
  return String(n).padStart(2, '0');
}

// "17:30에 다시 켜져요", 오늘이 아니면 "11/9 00:00에 다시 켜져요"
function statusText(pause: Pause, now: Date): string {
  if (pause.until === null) return '다시 켤 때까지 꺼져 있어요';
  const u = new Date(pause.until);
  const time = `${two(u.getHours())}:${two(u.getMinutes())}`;
  const sameDay = u.toDateString() === now.toDateString();
  return `${sameDay ? '' : `${u.getMonth() + 1}/${u.getDate()} `}${time}에 다시 켜져요`;
}

// 알림 일시 중지(구현 D25). 스위치를 끄면 기간을 고르고, 켜면 바로 다시 묻는다.
// 꺼져 있는 동안 다른 화면에 배너는 띄우지 않는다.
export default function PauseSwitch() {
  const [pause, setPause] = useState<Pause | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);
  const [customDate, setCustomDate] = useState<Date>(new Date());

  useFocusEffect(
    useCallback(() => {
      readPause(getRuntime().db)
        .then(setPause)
        .catch((e) => console.warn('read pause failed', e));
    }, []),
  );

  const now = new Date();
  const paused = isPaused(pause, now);

  const save = async (next: Pause | null) => {
    const { db } = getRuntime();
    const at = new Date().toISOString();
    await setSetting(db, PAUSE_KEY, next);
    // 다시 켜면 그 시각을 until로 남긴다. 지표(S1·S3)에서 꺼 둔 칸을 뺄 때 쓴다.
    await logEvent(db, { id: uuidv4(), type: 'pause_set', ts: at, props: { until: next ? next.until : at } });
    setPause(next);
    void rescheduleNow();
  };

  const choose = (until: Date | null) => {
    setChoosing(false);
    save({ until: until ? until.toISOString() : null }).catch((e) => console.warn('pause failed', e));
  };

  const onToggle = (on: boolean) => {
    if (on) save(null).catch((e) => console.warn('resume failed', e));
    else setChoosing(true);
  };

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label} maxFontSizeMultiplier={MAX_SCALE}>
            알림
          </Text>
          {paused && pause && (
            <Text style={styles.status} maxFontSizeMultiplier={MAX_SCALE}>
              {statusText(pause, now)}
            </Text>
          )}
        </View>
        <Switch
          value={!paused}
          onValueChange={onToggle}
          trackColor={{ false: GRAY_7, true: GRAY_5 }}
          thumbColor={GRAY_0}
          accessibilityLabel={paused ? '알림 꺼짐, 켜기' : '알림 켜짐, 잠시 끄기'}
        />
      </View>

      {choosing && (
        <Modal visible transparent animationType='slide' onRequestClose={() => setChoosing(false)}>
          <Pressable style={styles.overlay} onPress={() => setChoosing(false)}>
            <Pressable style={styles.sheet} onPress={() => undefined}>
              <View style={styles.handle} />
              <Text style={styles.header} maxFontSizeMultiplier={MAX_SCALE}>
                얼마 동안 알림을 끌까요?
              </Text>
              {CHOICES.map((c) => (
                <TouchableOpacity key={c.label} style={styles.choice} onPress={() => choose(c.until(new Date()))}>
                  <Text style={styles.choiceText} maxFontSizeMultiplier={MAX_SCALE}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.choice} onPress={() => setPicking('date')}>
                <Text style={styles.choiceText} maxFontSizeMultiplier={MAX_SCALE}>
                  날짜·시각 고르기
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Android 피커는 날짜와 시각을 한 번에 못 고른다. 날짜 → 시각 순서로 연다. */}
      {picking && (
        <DateTimePicker
          value={customDate}
          mode={picking}
          is24Hour
          minimumDate={picking === 'date' ? new Date() : undefined}
          onChange={(event, date) => {
            const step = picking;
            setPicking(null);
            if (event.type !== 'set' || !date) return;
            if (step === 'date') {
              const d = new Date(date);
              d.setHours(customDate.getHours(), customDate.getMinutes(), 0, 0);
              setCustomDate(d);
              setPicking('time');
              return;
            }
            const until = new Date(customDate);
            until.setHours(date.getHours(), date.getMinutes(), 0, 0);
            // 지난 시각을 고르면 끄지 않는다.
            if (until.getTime() > Date.now()) choose(until);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
  },
  label: {
    color: GRAY_0,
    fontSize: 16,
  },
  status: {
    color: GRAY_5,
    fontSize: 13,
    marginTop: 2,
  },
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
    marginBottom: 8,
  },
  choice: {
    minHeight: 56,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GRAY_8,
  },
  choiceText: {
    color: GRAY_0,
    fontSize: 16,
  },
});
