import { timeSlotTypes } from '@/@types/timeSlot/timeSlotType';
import { create } from 'zustand';
interface useTimeSlotStore_today {
  todaydata: { [x: string]: any }[] | null;
  setTimeSlot: (todaydata: { [x: string]: any }[]) => void;
}
interface useTimeSlotStore_yesterday {
  yesterdaydata: { [x: string]: any }[] | null;
  setTimeSlot: (yesterdaydata: { [x: string]: any }[]) => void;
}
interface useTodayTimeSlotInfoFromZustand {
  todaydata: timeSlotTypes | null;
  setTimeSlot: (todaydata: timeSlotTypes) => void;
}
interface useYesterdayTimeSlotInfoFromZustand {
  yesterdaydata: timeSlotTypes | null;
  setTimeSlot: (yesterdaydata: timeSlotTypes) => void;
}

interface updateInfoFromZustand {
  isUpdated: boolean;
  setUpdated: (isUpdated: boolean) => void;
}

export const useTimeSlotStore_today = create<useTimeSlotStore_today>((set) => ({
  todaydata: null,
  setTimeSlot: (data: { [x: string]: any }[]) =>
    set(() => ({
      todaydata: data,
    })),
}));

export const useTodayTimeSlotInfoFromZustand =
  create<useTodayTimeSlotInfoFromZustand>((set) => ({
    todaydata: null,
    setTimeSlot: (data: timeSlotTypes) =>
      set(() => ({
        todaydata: data,
      })),
  }));

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
  create<useYesterdayTimeSlotInfoFromZustand>((set) => ({
    yesterdaydata: null,
    setTimeSlot: (data: timeSlotTypes) =>
      set(() => ({
        yesterdaydata: data,
      })),
  }));

export const updateInfoFromZustand = create<updateInfoFromZustand>((set) => ({
  isUpdated: false,
  setUpdated: (isUpdated: boolean) =>
    set(() => ({
      isUpdated: isUpdated,
    })),
}));

// export default { useTimeSlotStore_today, useTimeSlotStore_yesterday };
