import { setCollection_Tests } from '@/@types/firebase/collections';
import { create } from 'zustand';
interface timeSlotStore {
  data: setCollection_Tests | null;
  setTimeSlot: (data: setCollection_Tests) => void;
}

const useTimeSlotStore = create<timeSlotStore>((set) => ({
  data: null,
  setTimeSlot: (data: setCollection_Tests) =>
    set(() => ({
      data: data,
    })),
}));

export default useTimeSlotStore;
