import { create } from 'zustand';

interface LoginExpiredModalState {
  loginExpiredModalVisible: boolean;
  setLoginExpiredModalVisible: (value: boolean) => void;
}

export const useLoginExpiredModalStore = create<LoginExpiredModalState>(
  (set) => ({
    loginExpiredModalVisible: false,
    setLoginExpiredModalVisible: (value) =>
      set({ loginExpiredModalVisible: value }),
  })
);
