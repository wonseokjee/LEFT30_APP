import { create } from 'zustand';

interface slotItemInfoOpenStore {
  isSlotItemInfoModalOpen: boolean;
  setItemInfoModalOpen: () => void;
  setItemInfoModalClose: () => void;
}

export const useSlotItemInfoOpenStore = create<slotItemInfoOpenStore>(
  (set) => ({
    isSlotItemInfoModalOpen: false,
    setItemInfoModalOpen: () =>
      set(() => ({
        isSlotItemInfoModalOpen: true,
      })),
    setItemInfoModalClose: () =>
      set(() => ({ isSlotItemInfoModalOpen: false })),
  })
);

export default useSlotItemInfoOpenStore;
