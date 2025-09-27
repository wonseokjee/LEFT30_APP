import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GRAY_7 } from '@/assets/palette';

type Props = {
  onChange: (time: Date) => void;
  slotData: { time: Date; label: string };
  timeFormatOptions?: Intl.DateTimeFormatOptions;
};

const TimeRangePicker: React.FC<Props> = ({
  onChange,
  slotData,
  timeFormatOptions,
}) => {
  const [time, setTime] = useState(
    slotData.time ? new Date(slotData.time) : new Date()
  );
  const [showTime, setShowTime] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setShowTime(true)}>
        <Text style={styles.pickerLabel}>{slotData.label}</Text>
        <Text style={styles.label}>
          {time.toLocaleTimeString([], timeFormatOptions)}
        </Text>
      </TouchableOpacity>
      {showTime && (
        <DateTimePicker
          value={time}
          mode='time'
          is24Hour={true}
          display='spinner' //default
          minuteInterval={30}
          onChange={(event, selectedDate) => {
            setShowTime(false);
            if (selectedDate) {
              setTime(selectedDate);
              onChange(selectedDate);
            }
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
    paddingHorizontal: 10,
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
