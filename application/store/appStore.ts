import { create } from 'zustand';
import type { SlotRow } from '@/db/types';

export type LastSaved = { slot: SlotRow; previous: SlotRow | null };

interface AppState {
  // 기록 시트가 보고 있는 칸(slot_start). null이면 닫힘.
  sheetSlot: string | null;
  openSheet: (slotStart: string) => void;
  closeSheet: () => void;
  // 저장 직후 토스트(메모 추가·되돌리기)
  lastSaved: LastSaved | null;
  setLastSaved: (saved: LastSaved | null) => void;
  // 동기화가 refresh까지 실패했다. 큐는 보존되고 로그인하면 이어서 보낸다.
  needsLogin: boolean;
  setNeedsLogin: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sheetSlot: null,
  openSheet: (slotStart) => set({ sheetSlot: slotStart }),
  closeSheet: () => set({ sheetSlot: null }),
  lastSaved: null,
  setLastSaved: (saved) => set({ lastSaved: saved }),
  needsLogin: false,
  setNeedsLogin: (value) => set({ needsLogin: value }),
}));
