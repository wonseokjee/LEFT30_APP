import { create } from 'zustand';

export const useLoginExpiredModalStore = create((set) => ({
  loginExpiredModalVisible: false,
  setLoginExpiredModalVisible: (value: boolean) =>
    set({ loginExpiredModalVisible: value }),
}));
