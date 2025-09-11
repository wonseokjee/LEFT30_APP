import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GRAY_7 } from '@/assets/palette';

type Props = {
  onChange: (start: Date, end: Date) => void;
  slotData: { started_at: Date; ended_at: Date };
};

const TimeRangePicker: React.FC<Props> = ({ onChange, slotData }) => {
  const [startTime, setStartTime] = useState(
    slotData.started_at ? new Date(slotData.started_at) : new Date()
  );
  const [endTime, setEndTime] = useState(
    slotData.ended_at ? new Date(slotData.ended_at) : new Date()
  );
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setShowStart(true)}>
        <Text style={styles.pickerLabel}>시작</Text>
        <Text style={styles.label}>
          {startTime.toLocaleTimeString([], {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </TouchableOpacity>
      {showStart && (
        <DateTimePicker
          value={startTime}
          mode='time'
          is24Hour={true}
          display='spinner'
          minuteInterval={30}
          onChange={(event, selectedDate) => {
            setShowStart(false);
            if (selectedDate) setStartTime(selectedDate);
            onChange(startTime, endTime);
          }}
          style={styles.picker}
        />
      )}
      <TouchableOpacity onPress={() => setShowEnd(true)}>
        <Text style={styles.pickerLabel}>종료</Text>
        <Text style={styles.label}>
          {/* 종료 시간:{' '} */}
          {endTime.toLocaleTimeString([], {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </TouchableOpacity>
      {showEnd && (
        <DateTimePicker
          value={endTime}
          mode='time'
          is24Hour={true}
          display='spinner'
          minuteInterval={30}
          onChange={(event, selectedDate) => {
            setShowEnd(false);
            if (selectedDate) setEndTime(selectedDate);
            onChange(startTime, endTime);
          }}
          style={styles.picker}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingHorizontal: 8,
    width: '100%',
  },
  pickerSection: {
    width: '100%',
  },
  label: {
    fontSize: 16,

    marginBottom: 8,
    color: GRAY_7,
  },
  pickerLabel: {
    fontSize: 11,

    color: GRAY_7,
  },
  picker: {
    width: '100%',
    minWidth: 120,
  },
});

export default TimeRangePicker;
