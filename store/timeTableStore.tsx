import { setCollection_Tests } from '@/@types/firebase/collections';
import { create } from 'zustand';
interface timeSlotStore {
  data: { [x: string]: any }[] | null;
  setTimeSlot: (data: { [x: string]: any }[]) => void;
}

const useTimeSlotStore = create<timeSlotStore>((set) => ({
  data: null,
  setTimeSlot: (data: { [x: string]: any }[]) =>
    set(() => ({
      data: data,
    })),
}));

export default useTimeSlotStore;
