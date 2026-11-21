import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';

import { makeStyles } from '@/theme/theme';

const MAX_SCALE = 1.3;

// 로컬 DB 마이그레이션 실패(R1). 데이터는 지우지 않았고, 다음 업데이트에서 다시 시도한다.
export default function BootError() {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.title} maxFontSizeMultiplier={MAX_SCALE}>
        업데이트 중 문제가 생겼어요
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={MAX_SCALE}>
        기록은 그대로 남아 있어요. 앱을 다시 열거나 업데이트를 기다려 주세요.
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: t.sheet,
  },
  title: {
    color: t.text,
    fontSize: 16,
    marginBottom: 8,
  },
  body: {
    color: t.sub,
    fontSize: 13,
  },
}));
