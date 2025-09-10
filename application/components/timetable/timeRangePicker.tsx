import React, { useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  onChange: (start: Date, end: Date) => void;
  slotdata: any; // 타입에 맞게 수정
};

const TimeRangePicker: React.FC<Props> = ({ onChange, slotdata }) => {
  const [startTime, setStartTime] = useState(
    slotdata.started_at ? new Date(slotdata.started_at) : new Date()
  );
  const [endTime, setEndTime] = useState(
    slotdata.started_at
      ? new Date(
          new Date(slotdata.started_at).getTime() +
            slotdata.range * 10 * 60 * 1000
        )
      : new Date()
  );
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setShowStart(true)}>
        <Text>
          시작 시간:{' '}
          {startTime.toLocaleTimeString([], {
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
          }}
        />
      )}

      <TouchableOpacity onPress={() => setShowEnd(true)}>
        <Text>
          종료 시간:{' '}
          {endTime.toLocaleTimeString([], {
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
          }}
        />
      )}

      <TouchableOpacity
        onPress={() => onChange(startTime, endTime)}
        style={{
          marginTop: 10,
          backgroundColor: '#eee',
          padding: 8,
          borderRadius: 6,
        }}
      >
        <Text>적용</Text>
      </TouchableOpacity>
    </>
  );
};

export default TimeRangePicker;
