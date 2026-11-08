import { GRAY_1 } from '@/assets/palette';
import useTimer from '@/hooks/timer/useTimer';
import { Text, View, StyleSheet } from 'react-native';

export default function Timer() {
  const { leftMinute, leftSecond } = useTimer();
  return (
    <View>
      <View style={styles.timerContainer}>
        <Text style={styles.timer}>
          {leftMinute}:{leftSecond}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  timerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    color: GRAY_1,
    fontSize: 110,
    // marginBottom: 10,
  },
});
