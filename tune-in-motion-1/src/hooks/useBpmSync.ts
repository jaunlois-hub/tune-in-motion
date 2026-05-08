import { create } from 'zustand';

interface BpmSyncState {
  bpm: number;
  setBpm: (bpm: number) => void;
}

export const useBpmSync = create<BpmSyncState>((set) => ({
  bpm: 120,
  setBpm: (bpm: number) => set({ bpm: Math.max(30, Math.min(300, bpm)) }),
}));
