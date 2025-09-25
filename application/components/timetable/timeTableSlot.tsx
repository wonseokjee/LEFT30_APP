import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TimeTableSlotItem from './timeTableSlotItem';
import {
  useTodayTimeSlotInfoFromZustand,
  useYesterdayTimeSlotInfoFromZustand,
} from '@/store/timeTableStore';
import { timeSlotType } from '@/@types/timeSlot/timeSlotType';

const TimeTableSlot = () => {
  const { todaydata } = useTodayTimeSlotInfoFromZustand();
  const { yesterdaydata } = useYesterdayTimeSlotInfoFromZustand();

  const mergeSlots = (slots: timeSlotType[] | null): timeSlotType[] => {
    if (!slots || slots.length === 0) return [];
    // 이미 백엔드에서 정렬했음. 정렬 문제 생기면 아래 코드 사용.
    // const sortedSlots = [...slots].sort(
    //   (a, b) =>
    //     new Date(a.started_at ?? 0).getTime() -
    //     new Date(b.started_at ?? 0).getTime()
    // );

    const merged: timeSlotType[] = [];
    let prev = { ...slots[0], range: 3 }; // range 기본값 3 (30분) 현재 30분으로 하드코딩.

    for (let i = 1; i < slots.length; i++) {
      const curr = slots[i];
      // title, detail, action이 모두 같으면 range만 증가
      if (
        prev.description === curr.description &&
        prev.action === curr.action
      ) {
        prev.range = (prev.range || 3) + 3;
      } else {
        merged.push(prev);
        prev = { ...curr, range: 3 };
      }
    }
    merged.push(prev); // 마지막 slot 추가
    return merged;
  };

  const generateFullDaySlots = (
    slots: timeSlotType[] | null
  ): (timeSlotType | null)[] => {
    const totalSlots = 144;
    const fullDaySlots: (timeSlotType | null)[] = new Array(totalSlots).fill(
      null
    );
    const mergedSlots = mergeSlots(slots);

    //여기에서 start, end index로 변환해야함.
    mergedSlots?.forEach((slotdata) => {
      const startTime = new Date(slotdata?.started_at ?? Date.now());
      // Date.getHours()는 해당 Date 객체가 어떤 타임존(UTC, KST 등)으로 생성되었든
      // 항상 **로컬 타임존(사용자 시스템 기준)**의 시(hour)를 반환.
      const startIndex =
        startTime.getHours() * 6 + Math.floor(startTime.getMinutes() / 10); // 시작 시간의 인덱스
      // const endIndex는 필요없음. range로 대체

      fullDaySlots[startIndex] = { ...slotdata, range: slotdata.range }; // 시작 인덱스에 슬롯 데이터 삽입
      //range 1당 10분.
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
