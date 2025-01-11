import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import TimeTableSlotItem from './timeTableSlotItem';

type TimeSlot = {
  startIndex: number;
  endIndex: number;
  activity: string;
};

type DaySchedule = {
  day: string;
  slots: TimeSlot[];
};

type TimetableProps = {
  schedule: DaySchedule[];
};

const generateFullDaySlots = (slots: TimeSlot[]): (TimeSlot | null)[] => {
  const totalSlots = 144;
  const fullDaySlots: (TimeSlot | null)[] = new Array(totalSlots).fill(null);

  slots.forEach((slot) => {
    for (let i = slot.startIndex; i <= slot.endIndex; i++) {
      fullDaySlots[i - 1] = { ...slot };
    }
  });

  return fullDaySlots;
};

const generateTimeIndex = () => {
  const HOUR = 12;
  const totalHour: string[] = [''];
  const AMPM = ['AM', 'PM'];
  for (let j = 0; j < 2; j++) {
    for (let i = 1; i <= HOUR; i++) {
      totalHour.push(i + AMPM[j]);
    }
  }
  totalHour.pop();
  return totalHour;
};

const Timetable: React.FC<TimetableProps> = ({ schedule }) => {
  const [highlightedActivity, setHighlightedActivity] = useState<string | null>(
    null
  );

  const handlePress = (activity: string) => {
    setHighlightedActivity(activity || null);
  };

  return (
    <ScrollView contentContainerStyle={styles.horizontalContainer}>
      {/* 여기 아래 view도 timeTableTimeDivision?(이름 고민해봐야)으로 따로 빼기기 */}
      <View style={styles.timeIndexContainer}>
        {/* <Text style={styles.timelocalarea}></Text> */}
        {generateTimeIndex().map((x, idx) => (
          <View key={idx} style={styles.timeContainer}>
            <Text style={styles.timeIndexText}>{x}</Text>
          </View>
        ))}
        <Text style={styles.timelocalareaBottom}></Text>
      </View>
      {/* 여기 아래래부터 slot으로 들어가야 */}
      <View style={styles.tableContainer}>
        {schedule.map((daySchedule, index) => (
          <View key={index} style={styles.dayContainer}>
            <Text style={styles.dayText}>{daySchedule.day}</Text>
            {generateFullDaySlots(daySchedule.slots).map((slot, slotIndex) => (
              <View key={slotIndex} style={styles.fullSlotContainer}>
                <TimeTableSlotItem slotIndex={slotIndex} />

                <TouchableOpacity
                  // onPress={() => slot && handlePress(slot.activity)}
                  style={[
                    styles.slotContainer,
                    // highlightedActivity === slot?.activity && slot?.activity
                    //   ? styles.highlightedSlot
                    //   : null,
                    slotIndex % 6 === 5 ? styles.sixthSlotBorder : null,
                  ]}
                >
                  {/* <Text style={styles.slotIndexText}>Slot {slotIndex + 1}</Text> */}
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
    flexGrow: 1,
    flexDirection: 'row',
    borderWidth: 1,
    // borderColor: 'red',
    height: '200%',
  },
  timeIndexContainer: {
    flex: 1,
    borderWidth: 1,
    // borderColor: 'blue',
    // height: '110%',
  },
  // timelocalarea: {
  //   borderWidth: 1,
  //   borderColor: 'blue',
  //   height: '1%',
  // },
  timelocalareaBottom: {
    // borderWidth: 1,
    // borderColor: 'blue',
    height: '1.7%',
  },
  timeContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    borderWidth: 1,
    // borderColor: 'red',
    // height: '3%',
  },
  timeIndexText: {
    textAlign: 'right',
    paddingRight: 8,
    color: 'white',
    // fontSize:,
  },
  tableContainer: {
    flexDirection: 'row',
    flex: 7,
    // borderWidth: 1,
    // borderColor: 'yellow',
    height: '136%',
  },
  dayContainer: {
    flex: 1,
    // borderWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'white',
  },
  dayText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
  },
  fullSlotContainer: {
    // backgroundColor: 'blue',
    height: '0.5%',
    // flex: 1,
  },
  slotContainer: {
    flexDirection: 'row',
    // justifyContent: 'space-between',
    color: 'white',
    borderColor: 'white',
    // borderWidth: 1,
    borderRightWidth: 1,
    // height: '100%',
  },
  highlightedSlot: {
    backgroundColor: 'grey',
    borderRadius: 10,
  },
  sixthSlotBorder: {
    borderBottomColor: 'white',
    borderBottomWidth: 1,
  },
  slotIndexText: {
    // fontSize: 15,
    color: 'white',
  },
  activityText: {
    // fontSize: 10,
    color: 'white',
  },
});

export default Timetable;
