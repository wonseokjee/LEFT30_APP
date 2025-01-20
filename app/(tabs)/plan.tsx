import Timetable from '@/components/timetable/timeTable';
import { View, Text, StyleSheet } from 'react-native';

type TimeSlot = {
  startIndex: number;
  endIndex: number;
  activity: string;
};
type DaySchedule = {
  day: string;
  slots: TimeSlot[];
};

export default function Plan() {
  return (
    <View style={styles.container}>
      <Timetable />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',
    backgroundColor: 'black',
  },
  text: { color: 'white' },
});
