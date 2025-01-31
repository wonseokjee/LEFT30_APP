import useTimeTableFocusStore from '@/store/timeTableFocusStore';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const TableTimeDivision: React.FC = () => {
  const { setCurrentPosition } = useTimeTableFocusStore();
  const [currentPosition, setCurrentPos] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
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
  useEffect(() => {
    const updateCurrentPosition = () => {
      if (containerHeight === 0) return;

      const now = new Date();
      let hour = now.getHours();
      let minute = now.getMinutes();
      let ampm = hour < 12 ? 'AM' : 'PM';

      // 24시간제를 12시간제로 변환
      if (hour > 12) hour -= 12;
      if (hour === 0) hour = 12;

      const formattedTime = `${hour}:${
        minute < 10 ? '0' + minute : minute
      } ${ampm}`;
      setCurrentTime(formattedTime);
      // 현재 시간이 몇 번째 인덱스인지 찾기
      const timeIndex = generateTimeIndex().indexOf(hour + ampm);

      // 한 칸의 높이 계산 (containerHeight 기반)
      const itemHeight = containerHeight / generateTimeIndex().length;

      // 현재 시각 위치 (시간 인덱스 + 분 단위 이동 비율)
      const newPosition = timeIndex * itemHeight + (minute / 60) * itemHeight;

      setCurrentPos(newPosition);
      setCurrentPosition(newPosition); // Zustand 상태 업데이트
    };

    updateCurrentPosition();
    const interval = setInterval(updateCurrentPosition, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, [containerHeight]); // ScrollView 높이 변화 감지

  return (
    <>
      <View
        style={styles.timeIndexContainer}
        onLayout={(event) =>
          setContainerHeight(event.nativeEvent.layout.height)
        }
      >
        {/* <Text style={styles.timelocalarea}></Text> */}
        {/* 현재 시간 구분선 */}
        {/* 현재 시간 표시 (텍스트) */}
        {containerHeight > 0 && (
          <View style={[styles.currentTimeBox, { top: currentPosition - 10 }]}>
            <Text style={styles.currentTimeText}>{currentTime}</Text>
          </View>
        )}
        <View style={[styles.currentTimeIndicator, { top: currentPosition }]} />
        {generateTimeIndex().map((x, idx) => (
          <View key={idx} style={styles.timeContainer}>
            <Text style={styles.timeIndexText}>{x}</Text>
          </View>
        ))}
        <Text style={styles.timelocalareaBottom}></Text>
      </View>
    </>
  );
};
const styles = StyleSheet.create({
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
    opacity: 0.6,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    width: Dimensions.get('window').width,
    borderTopWidth: 2,
    borderTopColor: 'white', // 현재 시간 표시선 색상
    zIndex: 1, // 다른 요소 위에 표시되도록 설정
  },
  currentTimeBox: {
    position: 'absolute',
    // left: '10%', // 왼쪽 여백을 줘서 가독성 향상
    backgroundColor: 'black', // 강조를 위한 배경색
    padding: 2,
    paddingLeft: 5,
    // borderRadius: 8,
    zIndex: 10, // 다른 요소 위에 표시되도록 설정
  },
  currentTimeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
export default TableTimeDivision;
