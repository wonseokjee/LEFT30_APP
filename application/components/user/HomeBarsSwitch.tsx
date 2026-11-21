import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { getSetting, setSetting } from '@/db/records';
import { HOME_BARS_KEY } from '@/record/planVsActual';
import { getRuntime } from '@/runtime/appRuntime';
import { useAppStore } from '@/store/appStore';
import { makeStyles, useTheme } from '@/theme/theme';

// 계정 관리 "홈에 오늘 지금까지 보이기"(G19). 끄면 막대와 "오늘 계획 없음" 줄을 모두 그리지 않는다.
export default function HomeBarsSwitch() {
  const styles = useStyles();
  const t = useTheme();
  const [on, setOn] = useState(true);

  useEffect(() => {
    getSetting<boolean>(getRuntime().db, HOME_BARS_KEY)
      .then((v) => setOn(v !== false))
      .catch(() => setOn(true));
  }, []);

  const toggle = (next: boolean) => {
    setOn(next);
    setSetting(getRuntime().db, HOME_BARS_KEY, next)
      .then(() => useAppStore.getState().bumpBlocks())
      .catch((e) => console.warn('home bars save failed', e));
  };

  return (
    <View style={styles.row}>
      <Text style={styles.text}>홈에 오늘 지금까지 보이기</Text>
      <Switch
        value={on}
        onValueChange={toggle}
        trackColor={{ false: t.line, true: t.sub }}
        thumbColor={t.text}
        accessibilityLabel='홈에 오늘 지금까지 보이기'
      />
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
    text: { color: t.text, fontSize: 17 },
  }),
);
