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
  //plan에서는 일정을 짤 수 있게
  const exampleSchedule: DaySchedule[] = [
    {
      day: 'Monday',
      slots: [
        { startIndex: 10, endIndex: 20, activity: 'Math Class' },
        { startIndex: 30, endIndex: 40, activity: 'Math Class' },
        { startIndex: 80, endIndex: 100, activity: 'Science Class' },
      ],
    },
    {
      day: 'Tuesday',
      slots: [
        { startIndex: 21, endIndex: 27, activity: 'History Class' },
        { startIndex: 50, endIndex: 55, activity: 'Art Class' },
        { startIndex: 10, endIndex: 20, activity: 'Physical Education' },
      ],
    },
  ];
  return (
    <View style={styles.container}>
      <Timetable schedule={exampleSchedule} />
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
