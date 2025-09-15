import {
  useTodayTimeSlotInfoFromZustand,
  useYesterdayTimeSlotInfoFromZustand,
} from '@/store/timeTableStore';
import api from './api';
import * as SecureStore from 'expo-secure-store';
import { timeSlotType } from '@/@types/timeSlot/timeSlotType';

export const createTimeSlotInfo = async (
  data: timeSlotType,
  user_id: string
) => {
  try {
    const payload = {
      user: user_id, // 사용자 ID
      // start_time: startTime, // 시작 시간
      ended_at: data.ended_at, // 종료 시간
      description: data.description, // 설명
      action: data.action, // 한 일
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
    setTimeSlot(res.data); // Zustand 스토어에 오늘의 정보 저장
  } catch (error) {
    console.error('Error fetching today info:', error);
    return null; // 에러 발생 시 null 반환
  }
};

// 어제의 정보를 받아오는 함수
export const getYesterdayTimeSlotInfoFromDB = async (user_id: string) => {
  const { setTimeSlot } = useYesterdayTimeSlotInfoFromZustand.getState();
  try {
    const res = await api.get('/timetable/yesterday/' + user_id);
    setTimeSlot(res.data);
  } catch (error) {
    console.error('Error fetching yesterday info:', error);
    return null;
  }
};

export const updateTimeSlotInfo = async (
  start: Date | null,
  end: Date | null,
  detail: string,
  action: string
) => {
  const userId = await SecureStore.getItemAsync('user_id');
  try {
    const payload = {
      user: userId, // 사용자 ID
      started_at: start, // 시작 시간
      ended_at: end, // 종료 시간
      description: detail, // 설명
      action: action, // 한 일
    };

    console.log('Payload for update:', payload);
    const res = await api.post('/timetable/timeUpdate/', payload); // 서버의 '/timetable' 엔드포인트 호출
    // console.log('Time slot created:', res.data); // 응답 데이터 확인
    return res.data; // 생성된 timetable 정보 반환
  } catch (error) {
    console.error('Error creating time slot:', error);
    return null; // 에러 발생 시 null 반환
  }
};
