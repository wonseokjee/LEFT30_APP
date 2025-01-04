import Timetable from '@/components/timetable/timeTable';
import { View, Text, StyleSheet } from 'react-native';

type TimeSlot = {
  index: number;
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
        { index: 10, activity: 'Math Class' },
        { index: 20, activity: 'Break' },
        { index: 30, activity: 'Science Class' },
      ],
    },
    {
      day: 'Tuesday',
      slots: [
        { index: 50, activity: 'History Class' },
        { index: 70, activity: 'Art Class' },
        { index: 10, activity: 'Physical Education' },
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  text: { color: 'white' },
});
