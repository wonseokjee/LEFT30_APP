import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

type TimeSlot = {
  index: number;
  activity: string;
};

type DaySchedule = {
  day: string;
  slots: TimeSlot[];
};

type TimetableProps = {
  schedule: DaySchedule[];
};

type TimeIndex = {
  hour: string;
};

const generateFullDaySlots = (slots: TimeSlot[]): TimeSlot[] => {
  const totalSlots = 144; // 144칸
  const fullDaySlots: TimeSlot[] = [];
  for (let i = 1; i <= totalSlots; i++) {
    const slot = slots.find((s) => s.index === i);
    fullDaySlots.push({
      index: i,
      activity: slot ? slot.activity : '',
    });
  }
  return fullDaySlots;
};

const generateTimeIndex = () => {
  const HOUR = 12; // 144칸
  const totalHour: string[] = [];
  const AMPM = ['AM', 'PM'];
  for (let j = 0; j < 2; j++) {
    for (let i = 1; i <= HOUR; i++) {
      totalHour.push(i + AMPM[j]);
    }
  }
  //12PM삭제위해 마지막 pop
  totalHour.pop();
  return totalHour;
};

const Timetable: React.FC<TimetableProps> = ({ schedule }) => {
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);

  const handlePress = (index: number, activity: string) => {
    if (activity) {
      setHighlightedSlot(index);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.horizontalContainer}>
      <View style={styles.timeIndexContainer}>
        {generateTimeIndex().map((x, idx) => (
          <View key={idx} style={styles.timeContainer}>
            <Text>{x}</Text>
          </View>
        ))}
      </View>
      <View style={styles.tableContainer}>
        {schedule.map((daySchedule, index) => (
          <View key={index} style={styles.dayContainer}>
            <Text style={styles.dayText}>{daySchedule.day}</Text>

            {generateFullDaySlots(daySchedule.slots).map((slot, slotIndex) => (
              <View key={slotIndex}>
                <TouchableOpacity
                  onPress={() => handlePress(slot.index, slot.activity)}
                  style={[
                    styles.slotContainer,
                    highlightedSlot === slot.index && slot.activity
                      ? styles.highlightedSlot
                      : null,
                  ]}
                >
                  <Text style={styles.slotIndexText}>Slot {slot.index}</Text>
                  <Text style={styles.activityText}>{slot.activity}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    // padding: 1,
    flexGrow: 1,
    // backgroundColor: 'yellow',
  },
  timeIndexContainer: {
    backgroundColor: 'grey',
    flex: 1,
  },
  timeContainer: { flex: 1 },
  tableContainer: {
    flexDirection: 'row',
    // backgroundColor: 'blue',
    flex: 1,
  },
  dayContainer: {
    // marginRight: 24,
    // flex: 1,
    // backgroundColor: 'yellow',
  },
  dayText: {
    fontSize: 15,
    fontWeight: 'bold',
    // marginBottom: 8,
    textAlign: 'center',
    color: 'white',
  },

  slotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // paddingVertical: 4,
    // flex: 1,
    // height: '100%',
    color: 'white',
    borderColor: 'white',
    borderWidth: 1,
  },
  highlightedSlot: {
    backgroundColor: 'yellow',
    borderRadius: 8,
    // color: 'black',
  },
  slotIndexText: {
    fontSize: 10,
    color: 'white',
  },
  activityText: {
    fontSize: 10,
    color: 'white',
  },
});

export default Timetable;

// Example Usage
// const exampleSchedule: DaySchedule[] = [
//   {
//     day: 'Monday',
//     slots: [
//       { index: 10, activity: 'Math Class' },
//       { index: 20, activity: 'Break' },
//       { index: 30, activity: 'Science Class' },
//     ],
//   },
//   {
//     day: 'Tuesday',
//     slots: [
//       { index: 50, activity: 'History Class' },
//       { index: 70, activity: 'Art Class' },
//       { index: 90, activity: 'Physical Education' },
//     ],
//   },
// ];

// <Timetable schedule={exampleSchedule} />
