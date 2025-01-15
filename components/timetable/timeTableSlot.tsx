import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import TimeTableSlotItem from './timeTableSlotItem';

type timeTableSlotProps = {
  slotIndex: number;
};

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

const TimeTableSlot: React.FC<TimetableProps> = ({ schedule }) => {
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

  return (
    <>
      <View style={styles.tableContainer}>
        {/* 이틀치 여기 map에서 돌림. */}
        {schedule.map((daySchedule, index) => (
          <View key={index} style={styles.dayContainer}>
            <Text style={styles.dayText}>{daySchedule.day}</Text>
            {/* 여기 아래에서 slot따져서 핻강 아이템에 들어갈것인지 말지. slot은 start에서 따지고 slotrange는 end-start로 계산해서 */}
            {generateFullDaySlots(daySchedule.slots).map((slot, slotIndex) => (
              <View key={slotIndex} style={styles.fullSlotContainer}>
                <TimeTableSlotItem slotIndex={slotIndex} />

                <TouchableOpacity
                  style={[
                    styles.slotContainer,
                    slotIndex % 6 === 5 ? styles.sixthSlotBorder : null,
                  ]}
                ></TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </View>
    </>
  );
};
const styles = StyleSheet.create({
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

  sixthSlotBorder: {
    borderBottomColor: 'white',
    borderBottomWidth: 1,
  },
});
export default TimeTableSlot;
