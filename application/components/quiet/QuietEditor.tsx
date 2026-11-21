import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import DateTimePicker from '@react-native-community/datetimepicker';

import { MAX_QUIET_WINDOWS, WEEKDAYS, type Quiet, type QuietWindow } from '@/scheduler/plan';
import { makeStyles } from '@/theme/theme';

const MAX_SCALE = 1.3;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
// 새로 추가하는 방해금지의 기본값: 평일 업무 시간
const NEW_WINDOW: QuietWindow = { startMin: 9 * 60, endMin: 18 * 60, days: WEEKDAYS };

function label(minuteOfDay: number): string {
  const h = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const m = String(minuteOfDay % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function toDate(minuteOfDay: number): Date {
  const d = new Date();
  d.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  return d;
}

// 칸은 :00/:30 단위라 고른 시각을 가까운 30분으로 맞춘다.
function toSlotMinute(date: Date): number {
  return (Math.round((date.getHours() * 60 + date.getMinutes()) / 30) * 30) % 1440;
}

type Props = { value: Quiet; onChange: (quiet: Quiet) => void };

// 방해금지 시간 목록 편집기(D19). 온보딩과 계정 관리가 함께 쓴다. 어두운 배경 위에 그린다.
export default function QuietEditor({ value, onChange }: Props) {
  const styles = useStyles();
  const [picking, setPicking] = useState<{ index: number; key: 'startMin' | 'endMin' } | null>(null);

  const update = (index: number, patch: Partial<QuietWindow>) =>
    onChange(value.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const toggleDay = (index: number, day: number) => {
    const days = value[index].days;
    update(index, {
      days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
    });
  };

  return (
    <View>
      {value.map((w, index) => (
        <View key={index} style={styles.window}>
          <View style={styles.timeRow}>
            {(['startMin', 'endMin'] as const).map((key, i) => (
              <React.Fragment key={key}>
                {i === 1 && <Text style={styles.tilde}>~</Text>}
                <TouchableOpacity
                  style={styles.time}
                  onPress={() => setPicking({ index, key })}
                  accessibilityLabel={`${key === 'startMin' ? '시작' : '끝'} 시각 ${label(w[key])}, 바꾸기`}
                >
                  <Text style={styles.timeText} maxFontSizeMultiplier={MAX_SCALE}>
                    {label(w[key])}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
            <TouchableOpacity
              style={styles.remove}
              onPress={() => onChange(value.filter((_, i) => i !== index))}
              accessibilityLabel='이 방해금지 시간 삭제'
            >
              <Text style={styles.removeText} maxFontSizeMultiplier={MAX_SCALE}>
                삭제
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.days}>
            {DAY_LABELS.map((dayLabel, day) => {
              const on = w.days.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.day, on && styles.dayOn]}
                  onPress={() => toggleDay(index, day)}
                  accessibilityRole='checkbox'
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${dayLabel}요일`}
                >
                  <Text style={[styles.dayText, on && styles.dayTextOn]} maxFontSizeMultiplier={MAX_SCALE}>
                    {dayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {value.length < MAX_QUIET_WINDOWS && (
        <TouchableOpacity style={styles.add} onPress={() => onChange([...value, NEW_WINDOW])}>
          <Text style={styles.addText} maxFontSizeMultiplier={MAX_SCALE}>
            + 방해금지 시간 추가
          </Text>
        </TouchableOpacity>
      )}

      {picking && (
        <DateTimePicker
          value={toDate(value[picking.index][picking.key])}
          mode='time'
          is24Hour
          onChange={(_, date) => {
            const target = picking;
            setPicking(null);
            if (date) update(target.index, { [target.key]: toSlotMinute(date) });
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => StyleSheet.create({
  window: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.line,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    minHeight: 48,
    justifyContent: 'center',
  },
  timeText: {
    color: t.text,
    fontSize: 20,
  },
  tilde: {
    color: t.sub,
    fontSize: 16,
    marginHorizontal: 12,
  },
  remove: {
    marginLeft: 'auto',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  removeText: {
    color: t.sub,
    fontSize: 13,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOn: {
    backgroundColor: t.acc,
    borderColor: t.acc,
  },
  dayText: {
    color: t.sub,
    fontSize: 13,
  },
  dayTextOn: {
    color: t.onAcc,
  },
  add: {
    minHeight: 48,
    justifyContent: 'center',
  },
  addText: {
    color: t.text,
    fontSize: 16,
  },
}));
