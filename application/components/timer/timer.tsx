
import useTimer from '@/hooks/timer/useTimer';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { makeStyles } from '@/theme/theme';

export default function Timer() {
  const styles = useStyles();
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
const useStyles = makeStyles((t) => StyleSheet.create({
  timerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    color: t.text,
    fontSize: 110,
    // marginBottom: 10,
  },
}));
