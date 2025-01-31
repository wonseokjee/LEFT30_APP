import { create } from 'zustand';

type TimeTableFocusStore = {
  currentPosition: number | null;
  setCurrentPosition: (position: number) => void;
};

const useTimeTableFocusStore = create<TimeTableFocusStore>((set) => ({
  currentPosition: null,
  setCurrentPosition: (position) => set({ currentPosition: position }),
}));

export default useTimeTableFocusStore;
