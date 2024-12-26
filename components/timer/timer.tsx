import useInterval from '@/hooks/timer/useInterval';
import useTimer from '@/hooks/timer/useTimer';
import { Text, View, StyleSheet } from 'react-native';

export default function Timer() {
  const { time, leftMinute, leftSecond } = useTimer();
  useInterval(() => {
    if (leftSecond == '00' && leftMinute == '00') {
      console.log('dddddd');
    }
  }, 1000);
  return (
    <View>
      <Text>{time}</Text>
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
    fontSize: 110,
  },
});
