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
} from '@/store/timeTableStore';

const TimeTableSlot = () => {
  const { todaydata } = useTimeSlotStore_today();
  const { yesterdaydata } = useTimeSlotStore_yesterday();

  const generateFullDaySlots = (
    slots: firebase_type[] | null
  ): (firebase_type | null)[] => {
    const totalSlots = 144;
    const fullDaySlots: (firebase_type | null)[] = new Array(totalSlots).fill(
      null
    );

    //여기에서 start, end index로 변환해야함.
    slots?.forEach((slot) => {
      const startTime: string = slot.event.startTime;
      const endTime: string = slot.event.endTime;
      const calHour =
        (Number(endTime.substring(0, 2)) - Number(startTime.substring(0, 2))) *
        60;
      const calMin =
        Number(endTime.substring(2)) - Number(startTime.substring(2));
      const indexRange = (calHour + calMin) / 10;
      const hourIndex =
        Number(startTime.substring(0, 2)) * 6 +
        Number(startTime.substring(2)) / 10;
      fullDaySlots[hourIndex - 1] = { ...slot, range: indexRange };
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
            {/* today 값이 없으면 오류 date! 사용해서  */}
            <Text style={styles.dayText}>{data![0]['date']}</Text>
            {/* 여기 아래에서 slot따져서 핻강 아이템에 들어갈것인지 말지. slot은 start에서 따지고 slotrange는 end-start로 계산해서 */}
            {generateFullDaySlots(data).map((slotdata, slotIndex) => (
              <View key={slotIndex} style={styles.fullSlotContainer}>
                <TimeTableSlotItem slotdata={slotdata} />

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
