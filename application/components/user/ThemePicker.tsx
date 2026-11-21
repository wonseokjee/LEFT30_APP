import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { setSetting } from '@/db/records';
import { getRuntime } from '@/runtime/appRuntime';
import { makeStyles, THEME_KEY, useThemeMode, type ThemeMode } from '@/theme/theme';

const CHOICES: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '폰 설정' },
  { mode: 'light', label: '밝게' },
  { mode: 'dark', label: '어둡게' },
];

// 화면 밝기(D15: 폰 설정 + 앱 안 선택). 고른 칸은 강조색 채움(G6).
export default function ThemePicker() {
  const styles = useStyles();
  const mode = useThemeMode((s) => s.mode);
  const setMode = useThemeMode((s) => s.setMode);
  const pick = (m: ThemeMode) => {
    setMode(m);
    setSetting(getRuntime().db, THEME_KEY, m).catch((e) => console.warn('theme save failed', e));
  };
  return (
    <View style={styles.row} accessibilityRole='radiogroup'>
      {CHOICES.map((c) => {
        const on = c.mode === mode;
        return (
          <TouchableOpacity
            key={c.mode}
            style={[styles.cell, on && styles.cellOn]}
            onPress={() => pick(c.mode)}
            accessibilityRole='radio'
            accessibilityState={{ checked: on }}
          >
            <Text style={[styles.text, on && styles.textOn]}>{c.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    cell: {
      flex: 1,
      minHeight: 48,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellOn: { backgroundColor: t.acc, borderColor: t.acc },
    text: { color: t.text, fontSize: 17 },
    textOn: { color: t.onAcc },
  }),
);
