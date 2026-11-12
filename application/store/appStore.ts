import { create } from 'zustand';
import type { SlotRow } from '@/db/types';
import type { MissedRun } from '@/record/batchLogic';

export type LastSaved = { slot: SlotRow; previous: SlotRow | null };

interface AppState {
  // 기록 시트가 보고 있는 칸(slot_start). null이면 닫힘.
  sheetSlot: string | null;
  openSheet: (slotStart: string) => void;
  closeSheet: () => void;
  // 블록 끝 시트가 보고 있는 블록 id(UX-2 A). null이면 닫힘.
  sheetBlock: string | null;
  openBlockSheet: (blockId: string) => void;
  closeBlockSheet: () => void;
  // 놓친 칸 묶음 시트(UX-3). 칸·블록 끝 시트가 먼저다.
  sheetBatch: MissedRun | null;
  openBatchSheet: (run: MissedRun) => void;
  closeBatchSheet: () => void;
  // 블록이 바뀔 때마다 올린다. Home·Todo가 다시 읽는다.
  blockVersion: number;
  bumpBlocks: () => void;
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
  sheetBlock: null,
  openBlockSheet: (blockId) => set({ sheetBlock: blockId }),
  closeBlockSheet: () => set({ sheetBlock: null }),
  sheetBatch: null,
  openBatchSheet: (run) => set({ sheetBatch: run }),
  closeBatchSheet: () => set({ sheetBatch: null }),
  blockVersion: 0,
  bumpBlocks: () => set((s) => ({ blockVersion: s.blockVersion + 1 })),
  lastSaved: null,
  setLastSaved: (saved) => set({ lastSaved: saved }),
  needsLogin: false,
  setNeedsLogin: (value) => set({ needsLogin: value }),
}));
