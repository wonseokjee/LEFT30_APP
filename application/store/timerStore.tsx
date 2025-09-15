import { create } from 'zustand';

interface numStore {
  timerModalOpen: boolean;
  endTime: Date;
  // startTime: Date;
  setModalOpen: () => void;
  setModalClose: () => void;
}

const endTime = () => {
  const now = new Date();
  const endHour = now.getHours(); // 한국 시간으로 변환 (UTC+9)하지 않아도 들어감.
  // const endMinute = now.getMinutes();
  // 현재 분이 30 이상이면 30, 아니면 00
  const endMinute = now.getMinutes() >= 30 ? 30 : 0;

  return now.setHours(endHour, endMinute, 0, 0), now;
};

// const startTime = () => {
//   const now = new Date();
//   now.setMinutes(now.getMinutes() - 30);
//   const startHour = now.getHours(); // 한국 시간으로 변환 (UTC+9)하지 않아도 들어감.
//   // const startMinute = now.getMinutes();
//   // 현재 분이 30 이상이면 30, 아니면 00, 이후 20분, 15분 단위 나오면 수정 필요.
//   const startMinute = now.getMinutes() >= 30 ? 30 : 0;
//   const startHourString = startHour.toString().padStart(2, '0');
//   const startMinuteString = startMinute.toString().padStart(2, '0');
//   return `${startHourString}${startMinuteString}`;
// };

//여기서는 modalOpen 될때 시간 생성. 나중에 시간 자유롭게 추가/수정하려면 date가 여기서 고정되면 안됨.
//or 고정하고 confirm 이전에 수정할 수 있게 하면 됨.

//timetable에 값이 create되어서 read해야 하면 zustand에 값이 변했다는 trigger를 넣기?
//아니면 자동으로 zustand가 상태를 보전가능?

const useNumStore = create<numStore>((set) => ({
  timerModalOpen: false,

  endTime: new Date(),
  // startTime: '',
  setModalOpen: () =>
    set(() => ({
      timerModalOpen: true,
      endTime: endTime(),
      // startTime: startTime(),
    })),
  setModalClose: () => set(() => ({ timerModalOpen: false })),
}));

export default useNumStore;
