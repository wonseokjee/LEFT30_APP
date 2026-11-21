import React, { useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

/*
 * 할 일·시간표 아래 고양이 띠(visual 4.3). 탭 바 바로 위 56dp 띠에만 나온다.
 * 홈이 있는 쪽에서 들어온다: 할 일(홈 왼쪽 탭)은 오른쪽 끝에서, 시간표(홈 오른쪽 탭)는 왼쪽 끝에서.
 * 들어와 앉은 뒤 그루밍·하품·앉아 봄 중 하나. 화면에 들어올 때 30%, 같은 화면은 10분에 한 번까지.
 * 걷는 그림이 아직 없어 꼬리 세운 포즈가 미끄러져 들어온다(모션은 9절에서). 움직임 줄이기면 바로 앉는다.
 * 화면 읽기에는 보이지 않는다(장식).
 */

export const STRIP_H = 56;
const CHANCE = 0.3;
const COOLDOWN_MS = 10 * 60_000;
const CAT_H = 48;
const RATIO = 1392 / 1130;
const WALK_MS = 1400;

const POSES = {
  tail_up: require('@/assets/cat/calico_tail_up.png'),
  groom: require('@/assets/cat/calico_groom.png'),
  yawn: require('@/assets/cat/calico_yawn.png'),
  sit_watch: require('@/assets/cat/calico_sit_watch.png'),
};
const SETTLE: (keyof typeof POSES)[] = ['groom', 'yawn', 'sit_watch'];
const lastShown: Record<string, number> = {};

export default function CatStrip({ from }: { from: 'left' | 'right' }) {
  const { width } = useWindowDimensions();
  const [pose, setPose] = useState<keyof typeof POSES | null>(null);
  const x = useRef(new Animated.Value(0)).current;
  const catW = CAT_H * RATIO;
  // 들어와 앉는 자리: 들어온 쪽에서 화면 폭 1/4 안쪽
  const rest = from === 'right' ? width * 0.72 - catW / 2 : width * 0.28 - catW / 2;
  const start = from === 'right' ? width + 8 : -catW - 8;

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - (lastShown[from] ?? 0) < COOLDOWN_MS || Math.random() >= CHANCE) {
        setPose(null);
        return;
      }
      lastShown[from] = now;
      let alive = true;
      AccessibilityInfo.isReduceMotionEnabled()
        .catch(() => false)
        .then((reduce) => {
          if (!alive) return;
          const settle = SETTLE[Math.floor(Math.random() * SETTLE.length)];
          if (reduce) {
            x.setValue(rest);
            setPose(settle);
            return;
          }
          x.setValue(start);
          setPose('tail_up');
          Animated.timing(x, { toValue: rest, duration: WALK_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(
            ({ finished }) => finished && alive && setPose(settle),
          );
        });
      return () => {
        alive = false;
        x.stopAnimation();
      };
    }, [from, rest, start, x]),
  );

  if (!pose) return null;
  // 그림은 오른쪽을 본다. 오른쪽에서 들어오면 좌우를 뒤집어 들어오는 쪽을 보게 한다.
  const flip = from === 'right' && pose === 'tail_up';
  return (
    <View pointerEvents='none' style={styles.strip} importantForAccessibility='no-hide-descendants'>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        <Image
          source={POSES[pose]}
          style={{ width: catW, height: CAT_H, transform: [{ scaleX: flip ? -1 : 1 }] }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: STRIP_H, justifyContent: 'flex-end' },
});
