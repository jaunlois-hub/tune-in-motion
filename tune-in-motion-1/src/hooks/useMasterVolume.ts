import { create } from 'zustand';

interface MasterVolumeState {
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
}

export const useMasterVolume = create<MasterVolumeState>((set) => ({
  masterVolume: 0.8,
  setMasterVolume: (volume: number) => set({ masterVolume: Math.max(0, Math.min(1, volume)) }),
}));
