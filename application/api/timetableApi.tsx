import { useTodayTimeSlotInfoFromZustand } from '@/store/timeTableStore';
import api from './api';
import { setCollection_Test } from '@/@types/firebase/collections';

export const createTimeSlotInfo = async (data: setCollection_Test) => {
  try {
    const payload = {
      user: data.userId, // 사용자 ID
      // start_time: startTime, // 시작 시간
      ended_at: data.event.endTime, // 종료 시간
      description: data.event.detail, // 설명
      action: data.event.action, // 한 일
    };

    const res = await api.post('/timetable', payload); // 서버의 '/timetable' 엔드포인트 호출
    // console.log('Time slot created:', res.data); // 응답 데이터 확인
    return res.data; // 생성된 timetable 정보 반환
  } catch (error) {
    console.error('Error creating time slot:', error);
    return null; // 에러 발생 시 null 반환
  }
};

// 오늘의 정보를 받아오는 함수
export const getTodayTimeSlotInfoFromDB = async (user_id: string) => {
  const { setTimeSlot } = useTodayTimeSlotInfoFromZustand.getState();
  try {
    const res = await api.get('/timetable/today/' + user_id); // 서버의 '/timetable/today/:userid' 엔드포인트 호출
    // console.log('res', res.data); // 응답 데이터 확인
    setTimeSlot(res.data); // Zustand 스토어에 오늘의 정보 저장
    // return res.data; // 오늘의 정보 반환
  } catch (error) {
    console.error('Error fetching today info:', error);
    return null; // 에러 발생 시 null 반환
  }
};

// 어제의 정보를 받아오는 함수
export const getYesterdayTimeSlotInfoFromDB = async (user_id: string) => {
  try {
    const res = await api.get('/timetable/yesterday/' + user_id); // 서버의 '/timetable/yesterday' 엔드포인트 호출
    return res.data; // 어제의 정보 반환
  } catch (error) {
    console.error('Error fetching yesterday info:', error);
    return null; // 에러 발생 시 null 반환
  }
};
