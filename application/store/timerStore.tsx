import { create } from 'zustand';

interface numStore {
  timerModalOpen: boolean;
  date: string;
  endTime: string;
  newDate: number;
  startTime: string;
  setModalOpen: () => void;
  setModalClose: () => void;
}

const endTime = () => {
  const now = new Date();
  const endHour = now.getHours() + 9; // 한국 시간으로 변환 (UTC+9)
  const endMinute = now.getMinutes();
  const endHourString = endHour.toString().padStart(2, '0');
  const endMinuteString = endMinute.toString().padStart(2, '0');
  return `${endHourString}${endMinuteString}`;
};

const startTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 30);
  const startHour = now.getHours() + 9; // 한국 시간으로 변환 (UTC+9)
  const startMinute = now.getMinutes();
  const startHourString = startHour.toString().padStart(2, '0');
  const startMinuteString = startMinute.toString().padStart(2, '0');
  return `${startHourString}${startMinuteString}`;
};

//여기서는 modalOpen 될때 시간 생성. 나중에 시간 자유롭게 추가/수정하려면 date가 여기서 고정되면 안됨.
//or 고정하고 confirm 이전에 수정할 수 있게 하면 됨.

//timetable에 값이 create되어서 read해야 하면 zustand에 값이 변했다는 trigger를 넣기?
//아니면 자동으로 zustand가 상태를 보전가능?

const useNumStore = create<numStore>((set) => ({
  timerModalOpen: false,
  date: '',
  newDate: 0,
  endTime: '',
  startTime: '',
  setModalOpen: () =>
    set(() => ({
      timerModalOpen: true,
      date: new Date().toISOString().split('T')[0],
      newDate: new Date().getTime(),
      endTime: endTime(),
      startTime: startTime(),
    })),
  setModalClose: () => set(() => ({ timerModalOpen: false })),
}));

export default useNumStore;
