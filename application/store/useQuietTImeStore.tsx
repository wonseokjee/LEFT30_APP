import { quietTimeType } from '@/@types/user/quietTimeType';
import { create } from 'zustand';

interface getQuietTime {
  quietStartHour: number | null;
  quietStartMinute: number | null;
  quietEndHour: number | null;
  quietEndMinute: number | null;
  setTime: (data: quietTimeType) => void;
}

export const getQuietTimeByZustand = create<getQuietTime>((set) => ({
  quietStartHour: null,
  quietStartMinute: null,
  quietEndHour: null,
  quietEndMinute: null,
  setTime: (data: quietTimeType) =>
    set(() => ({
      quietStartHour: data.quietStartHour,
      quietStartMinute: data.quietStartMinute,
      quietEndHour: data.quietEndHour,
      quietEndMinute: data.quietEndMinute,
    })),
}));
