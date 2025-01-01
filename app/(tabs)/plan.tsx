import Timetable from '@/components/timetable/timeTable';
import TimeTable2 from '@/components/timetable/timeTable2';
import { View, Text, StyleSheet } from 'react-native';

type TimeSlot = {
  time: string;
  activity: string;
};

type DaySchedule = {
  day: string;
  slots: TimeSlot[];
};

interface Event {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
}

export default function Plan() {
  //plan에서는 일정을 짤 수 있게
  // const exampleSchedule: DaySchedule[] = [
  //   {
  //     day: 'Monday',
  //     slots: [
  //       { time: '09:00', activity: 'Math Class' },
  //       { time: '09:30', activity: 'Break' },
  //       { time: '10:00', activity: 'Science Class' },
  //     ],
  //   },
  //   {
  //     day: 'Tuesday',
  //     slots: [
  //       { time: '11:00', activity: 'History Class' },
  //       { time: '11:30', activity: 'Art Class' },
  //       { time: '13:00', activity: 'Physical Education' },
  //       { time: '09:30', activity: 'Break' },
  //     ],
  //   },
  // ];
  const events: Event[] = [
    {
      id: '1',
      title: '아침 회의',
      day: 1,
      startTime: '09:00',
      endTime: '10:30',
      location: '회의실 A',
      color: '#3498db',
    },
    {
      id: '2',
      title: '팀 미팅',
      day: 2,
      startTime: '09:00',
      endTime: '10:30',
      location: '회의실 B',
      color: '#3498db', // 같은 색상의 이벤트
    },
  ];

  const handleEditEvent = (event: Event) => {
    console.log('Edit event:', event.title);
    // 편집 로직 구현
  };

  const handleDeleteEvent = (event: Event) => {
    console.log('Delete event:', event.title);
    // 삭제 로직 구현
  };

  return (
    <View style={styles.container}>
      {/* <Timetable schedule={exampleSchedule} /> */}
      <TimeTable2
        events={events}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
      />
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
