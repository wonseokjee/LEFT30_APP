import { create } from 'zustand';
interface numStore {
  timerModalOpen: boolean;
  date: string;
  endTime: string;
  startTime: string;
  setModalOpen: () => void;
  setModalClose: () => void;
}

//여기서는 modalOpen 될때 시간 생성. 나중에 시간 자유롭게 추가/수정하려면 date가 여기서 고정되면 안됨.
//or 고정하고 confirm 이전에 수정할 수 있게 하면 됨.

//timetable에 값이 create되어서 read해야 하면 zustand에 값이 변했다는 trigger를 넣기?
//아니면 자동으로 zustand가 상태를 보전가능?
const useNumStore = create<numStore>((set) => ({
  timerModalOpen: false,
  date: '',
  endTime: '',
  startTime: '',
  setModalOpen: () =>
    set(() => ({
      timerModalOpen: true,
      date: new Date().toISOString().split('T')[0],
      endTime: `${new Date().getHours()}${new Date().getMinutes()}`,
      startTime: `${new Date().getHours()}${new Date().getMinutes() - 30}`,
    })),
  setModalClose: () => set(() => ({ timerModalOpen: false })),
}));

export default useNumStore;
