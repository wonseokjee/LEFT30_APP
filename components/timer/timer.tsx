import useInterval from '@/hooks/timer/useInterval';
import useTimer from '@/hooks/timer/useTimer';
import useNumStore from '@/store/timerStore';
import { Text, View, StyleSheet } from 'react-native';

export default function Timer() {
  const { time, leftMinute, leftSecond } = useTimer();
  const { setModalOpen } = useNumStore();
  useInterval(() => {
    if (leftSecond == '00' && leftMinute == '00') {
      console.log('30분 타이머 초기화');
      setModalOpen();
    }
  }, 1000);
  return (
    <View>
      <View style={styles.timerContainer}>
        <Text style={styles.clock}>{time}</Text>
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
    color: 'white',
    fontSize: 110,
  },
  clock: { color: 'white' },
});
