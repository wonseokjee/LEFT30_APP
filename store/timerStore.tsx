import { create } from 'zustand';
interface numStore {
  timerModalOpen: boolean;
  modalOpenDate: string;
  setModalOpen: () => void;
  setModalClose: () => void;
}

//여기서는 modalOpen 될때 시간 생성. 나중에 시간 자유롭게 추가/수정하려면 date가 여기서 고정되면 안됨.
//or 고정하고 confirm 이전에 수정할 수 있게 하면 됨.
const useNumStore = create<numStore>((set) => ({
  timerModalOpen: false,
  modalOpenDate: '',
  setModalOpen: () =>
    set(() => ({
      timerModalOpen: true,
      modalOpenDate: new Date().toLocaleString(),
    })),
  setModalClose: () => set(() => ({ timerModalOpen: false })),
}));

export default useNumStore;
