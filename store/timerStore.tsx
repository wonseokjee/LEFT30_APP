import { create } from 'zustand';
interface numStore {
  timerModalOpen: boolean;
  setModalOpen: () => void;
  setModalClose: () => void;
}

const useNumStore = create<numStore>((set) => ({
  timerModalOpen: false,
  setModalOpen: () => set(() => ({ timerModalOpen: true })),
  setModalClose: () => set(() => ({ timerModalOpen: false })),
}));

export default useNumStore;
