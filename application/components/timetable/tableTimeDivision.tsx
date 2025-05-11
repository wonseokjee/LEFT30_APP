import useTimeTableFocusStore from '@/store/timeTableFocusStore';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const TableTimeDivision: React.FC = () => {
  const { setCurrentPosition } = useTimeTableFocusStore();
  const [currentPosition, setCurrentPos] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [currentTimeBoxHeight, setCurrentTimeBoxHeight] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const generateTimeIndex = () => {
    const HOUR = 12;
    const totalHour: string[] = ['0AM'];
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
      // console.log('timeIndex', timeIndex);
      // 한 칸의 높이 계산 (containerHeight 기반)
      const itemHeight = containerHeight / generateTimeIndex().length;
      // console.log('itemHeight', itemHeight, containerHeight);

      const correctionFactor = containerHeight * 0.01; // 보정값 (1%)
      // 현재 시각 위치 (시간 인덱스 + 분 단위 이동 비율), -13은 보정값
      const newPosition =
        timeIndex * itemHeight + (minute / 60) * itemHeight - correctionFactor;
      // console.log('newPosition', newPosition);
      // 현재 시각 위치를 상태로 저장
      setCurrentPos(newPosition);
      setCurrentPosition(newPosition); // Zustand 상태 업데이트
    };

    updateCurrentPosition();
    const interval = setInterval(updateCurrentPosition, 60000); // 1분마다 업데이트
    //나중에 분단위 바뀌면 업데이트 되는 걸로.

    return () => clearInterval(interval);
  }, [containerHeight]); // ScrollView 높이 변화 감지

  return (
    <>
      <View style={styles.divisionContainer}>
        <View style={styles.timelocalareaTop}></View>
        <View
          style={styles.timeIndexContainer}
          onLayout={(event) =>
            //높이를 받아와서 containerHeight에 넣어줌.
            //높이가 달라서 현재시간 bar가 문제가 생김
            //onLayout 이벤트는 컴포넌트가 렌더링 된 후, 해당 컴포넌트의 크기와 위치를 측정
            setContainerHeight(event.nativeEvent.layout.height)
          }
        >
          {/* <Text style={styles.timelocalarea}></Text> */}
          {/* 현재 시간 구분선 */}
          {/* 현재 시간 표시 (텍스트) */}
          {containerHeight > 0 && (
            <View
              style={[styles.currentTimeBox, { top: currentPosition }]}
              onLayout={(event) =>
                //높이를 받아와서 currentTimeboxHeight에 넣어줌.
                //currnetTimeIndicator의 위치를 currentTimebox의 절반에 맞춰주기 위해서
                setCurrentTimeBoxHeight(event.nativeEvent.layout.height)
              }
            >
              <Text style={styles.currentTimeText}>{currentTime}</Text>
            </View>
          )}
          <View
            style={[
              styles.currentTimeIndicator,
              { top: currentPosition + currentTimeBoxHeight / 2 },
            ]}
          />
          {generateTimeIndex().map((x, idx) => (
            <View key={idx} style={styles.timeContainer}>
              <Text
                style={[
                  styles.timeIndexText,
                  { marginTop: -(currentTimeBoxHeight / 2) },
                ]}
              >
                {x}
              </Text>
            </View>
          ))}
          {/* <Text style={styles.timelocalareaBottom}></Text> */}
        </View>
      </View>
    </>
  );
};
const styles = StyleSheet.create({
  divisionContainer: {
    // flexDirection: 'row',
    // flex: 1,
    // borderWidth: 1,
    // borderColor: 'yellow',
    height: '100%',
  },
  timelocalareaTop: {
    // borderWidth: 1,
    // borderColor: 'blue',
    height: '2%',
  },
  timeIndexContainer: {
    flex: 1,
    borderWidth: 1,
    // borderColor: 'blue',
    // height: '90%',
  },
  // timelocalarea: {
  //   borderWidth: 1,
  //   borderColor: 'blue',
  //   height: '1%',
  // },
  // timelocalareaBottom: {
  //   borderWidth: 1,
  //   borderColor: 'blue',
  //   height: '1.6%',
  // },
  timeContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    borderWidth: 1,
    // borderTopColor: 'red',
  },
  timeIndexText: {
    textAlign: 'right',
    paddingRight: 8,
    color: 'white',
    fontSize: 15,
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
