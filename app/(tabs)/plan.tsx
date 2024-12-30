import Timetable from '@/components/timetable/timeTable';
import { View, Text, StyleSheet } from 'react-native';

type TimeSlot = {
  time: string;
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
        { time: '09:00', activity: 'Math Class' },
        { time: '09:30', activity: 'Break' },
        { time: '10:00', activity: 'Science Class' },
      ],
    },
    {
      day: 'Tuesday',
      slots: [
        { time: '11:00', activity: 'History Class' },
        { time: '11:30', activity: 'Art Class' },
        { time: '13:00', activity: 'Physical Education' },
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
