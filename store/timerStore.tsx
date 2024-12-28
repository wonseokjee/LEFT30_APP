import { create } from 'zustand';
interface numStore {
  timerModalOpen: boolean;
  modalOpenDate: string;
  setModalOpen: () => void;
  setModalClose: () => void;
}

const useNumStore = create<numStore>((set) => ({
  timerModalOpen: false,
  modalOpenDate: '',
  setModalOpen: () =>
    set(() => ({ timerModalOpen: true, modalOpenDate: Date().toString() })),
  setModalClose: () => set(() => ({ timerModalOpen: false })),
}));

export default useNumStore;
