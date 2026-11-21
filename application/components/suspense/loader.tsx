import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';

import { makeStyles, useTheme } from '@/theme/theme';

export default function Loader() {
  const styles = useStyles();
  const t = useTheme();
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Entypo name='cycle' size={48} color={t.text} />
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.wall, // 로딩 배경색
  },
}));
