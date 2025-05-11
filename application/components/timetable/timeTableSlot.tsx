import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import TimeTableSlotItem from './timeTableSlotItem';
import { firebase_type } from '@/@types/firebase/collections';
import {
  useTimeSlotStore_today,
  useTimeSlotStore_yesterday,
  useTodayTimeSlotInfoFromZustand,
  useYesterdayTimeSlotInfoFromZustand,
} from '@/store/timeTableStore';
import { timeSlotType } from '@/@types/timeSlot/timeSlotType';

const TimeTableSlot = () => {
  // const { todaydata } = useTimeSlotStore_today();
  // const { yesterdaydata } = useTimeSlotStore_yesterday();
  const { todaydata } = useTodayTimeSlotInfoFromZustand();
  const { yesterdaydata } = useYesterdayTimeSlotInfoFromZustand();

  const generateFullDaySlots = (
    // slots: firebase_type[] | null
    slots: timeSlotType[] | null
  ): (timeSlotType | null)[] => {
    const totalSlots = 144;
    const fullDaySlots: (timeSlotType | null)[] = new Array(totalSlots).fill(
      null
    );

    //여기에서 start, end index로 변환해야함.
    slots?.forEach((slot) => {
      // const startTime: string = slot.event.startTime;
      // const endTime: string = slot.event.endTime;
      // const calHour =
      //   (Number(endTime.substring(0, 2)) - Number(startTime.substring(0, 2))) *
      //   60;
      // const calMin =
      //   Number(endTime.substring(2)) - Number(startTime.substring(2));
      // const indexRange = (calHour + calMin) / 10;
      // const hourIndex =
      //   Number(startTime.substring(0, 2)) * 6 +
      //   Number(startTime.substring(2)) / 10;
      // fullDaySlots[hourIndex - 1] = { ...slot, range: indexRange };

      const startTime = new Date(slot.started_at);
      // const endTime = new Date(slot.ended_at);
      const startIndex =
        startTime.getHours() * 6 + Math.floor(startTime.getMinutes() / 10); // 시작 시간의 인덱스
      // const endIndex =
      //   endTime.getHours() * 6 + Math.ceil(endTime.getMinutes() / 10); // 종료 시간의 인덱스

      // const range = endIndex - startIndex; // 슬롯 범위 계산

      fullDaySlots[startIndex] = { ...slot, range: slot.range }; // 시작 인덱스에 슬롯 데이터 삽입
    });
    // console.log(fullDaySlots);
    return fullDaySlots;
  };

  return (
    <>
      <View style={styles.tableContainer}>
        {/* 이틀치 여기 map에서 돌림.  데이터가 없다면 오류남 map에서 돌리는 방식을 수정해야 할듯 generateFullDaySlots는 map이 맞는데 굳이 여기서 map일 필요는 없음. */}
        {[yesterdaydata, todaydata]?.map((data, index) => (
          <View key={index} style={styles.dayContainer}>
            <View style={styles.dayView}>
              {/* today 값이 없으면 오류 date! 사용해서   오늘 날짜를 직접 넣어야 할 듯*/}
              {data === todaydata ? (
                <Text style={styles.dayText}>{new Date().getDate()}(오늘)</Text>
              ) : (
                <Text style={styles.dayText}>
                  {new Date().getDate() - 1}(어제)
                </Text>
              )}
            </View>

            {/* 여기 아래에서 slot따져서 핻강 아이템에 들어갈것인지 말지. slot은 start에서 따지고 slotrange는 end-start로 계산해서 */}
            {generateFullDaySlots(data).map((slotdata, slotIndex) => (
              <View key={slotIndex} style={styles.fullSlotContainer}>
                <TimeTableSlotItem slotdata={slotdata} />

                <TouchableOpacity
                  style={[
                    styles.slotContainer,
                    slotIndex % 6 === 0 ? styles.sixthSlotBorder : null,
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
    // flex: 7,
    flex: 7,
    // borderWidth: 1,
    // borderColor: 'yellow',
    // height: '150%',
    height: '100%',
  },
  dayContainer: {
    flex: 1,
    // borderWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'white',
    opacity: 0.8,
  },
  dayView: {
    // borderWidth: 1,
    // borderColor: 'red', 
    height: '2%',
  },
  dayText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
    opacity: 0.8,
  },
  fullSlotContainer: {
    // backgroundColor: 'blue',
    height: '0.68%',
    // height: '0.684%',
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
    opacity: 0.6,
  },
});
export default TimeTableSlot;
