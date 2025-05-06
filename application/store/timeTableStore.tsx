import { setCollection_Tests } from '@/@types/firebase/collections';
import { create } from 'zustand';
interface useTimeSlotStore_today {
  todaydata: { [x: string]: any }[] | null;
  setTimeSlot: (todaydata: { [x: string]: any }[]) => void;
}
interface useTimeSlotStore_yesterday {
  yesterdaydata: { [x: string]: any }[] | null;
  setTimeSlot: (yesterdaydata: { [x: string]: any }[]) => void;
}
interface useTimeSlotStore_today {
  todaydata: { [x: string]: any }[] | null;
  setTimeSlot: (todaydata: { [x: string]: any }[]) => void;
}
interface useTimeSlotStore_yesterday {
  yesterdaydata: { [x: string]: any }[] | null;
  setTimeSlot: (yesterdaydata: { [x: string]: any }[]) => void;
}

export const useTimeSlotStore_today = create<useTimeSlotStore_today>((set) => ({
  todaydata: null,
  setTimeSlot: (data: { [x: string]: any }[]) =>
    set(() => ({
      todaydata: data,
    })),
}));

export const useTodayTimeSlotInfoFromZustand = create<useTimeSlotStore_today>(
  (set) => ({
    todaydata: null,
    setTimeSlot: (data: { [x: string]: any }[]) =>
      set(() => ({
        todaydata: data,
      })),
  })
);

export const useTimeSlotStore_yesterday = create<useTimeSlotStore_yesterday>(
  (set) => ({
    yesterdaydata: null,
    setTimeSlot: (data: { [x: string]: any }[]) =>
      set(() => ({
        yesterdaydata: data,
      })),
  })
);

export const useYesterdayTimeSlotInfoFromZustand =
  create<useTimeSlotStore_yesterday>((set) => ({
    yesterdaydata: null,
    setTimeSlot: (data: { [x: string]: any }[]) =>
      set(() => ({
        yesterdaydata: data,
      })),
  }));

// export default { useTimeSlotStore_today, useTimeSlotStore_yesterday };
