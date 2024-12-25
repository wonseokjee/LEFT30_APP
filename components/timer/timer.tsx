import useInterval from '@/hooks/timer/useInterval';
import useTimer from '@/hooks/timer/useTimer';
import { Text, View } from 'react-native';

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
      <Text>
        {leftMinute}:{leftSecond}
      </Text>
    </View>
  );
}
