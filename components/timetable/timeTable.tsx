import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

type TimeSlot = {
  time: string;
  activity: string;
};

type DaySchedule = {
  day: string;
  slots: TimeSlot[];
};

type TimetableProps = {
  schedule: DaySchedule[];
};

const generateFullDaySlots = (slots: TimeSlot[]): TimeSlot[] => {
  const fullDaySlots: TimeSlot[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeLabel = `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      const slot = slots.find((s) => s.time === timeLabel);
      fullDaySlots.push({
        time: timeLabel,
        activity: slot ? slot.activity : '',  
      });
    }
  }
  return fullDaySlots;
};

const Timetable: React.FC<TimetableProps> = ({ schedule }) => {
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null);

  const handlePress = (time: string, activity: string) => {
    if (activity) {
      setHighlightedSlot(time);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.horizontalContainer}>
      {schedule.map((daySchedule, index) => (
        <View key={index} style={styles.dayContainer}>
          <Text style={styles.dayText}>{daySchedule.day}</Text>
          {generateFullDaySlots(daySchedule.slots).map((slot, slotIndex) => (
            <View key={slotIndex}>
              {slot.time.endsWith(':00') && <View style={styles.hourLine} />}
              <TouchableOpacity
                onPress={() => handlePress(slot.time, slot.activity)}
                style={[
                  styles.slotContainer,
                  highlightedSlot === slot.time && slot.activity
                    ? styles.highlightedSlot
                    : null,
                ]}
              >
                <Text style={styles.timeText}>{slot.time}</Text>
                <Text style={styles.activityText}>{slot.activity}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  dayContainer: {
    marginRight: 24,
  },
  dayText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  slotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  highlightedSlot: {
    backgroundColor: '#ffeb3b',
    borderRadius: 8,
  },
  hourLine: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 4,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
  activityText: {
    fontSize: 16,
    color: '#666',
  },
});

export default Timetable;

// Example Usage
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
//     ],
//   },
// ];

// <Timetable schedule={exampleSchedule} />
