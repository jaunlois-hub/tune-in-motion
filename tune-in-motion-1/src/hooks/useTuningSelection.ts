import { create } from 'zustand';
import { TUNINGS, type Tuning } from '@/lib/tunings';

const STORAGE_KEY = 'selectedTuningId';

const loadInitial = (): Tuning => {
  if (typeof localStorage === 'undefined') return TUNINGS[0];
  const id = localStorage.getItem(STORAGE_KEY);
  return TUNINGS.find((t) => t.id === id) ?? TUNINGS[0];
};

interface TuningSelectionState {
  selectedTuning: Tuning;
  setSelectedTuning: (tuning: Tuning) => void;
}

export const useTuningSelection = create<TuningSelectionState>((set) => ({
  selectedTuning: loadInitial(),
  setSelectedTuning: (tuning) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, tuning.id);
    }
    set({ selectedTuning: tuning });
  },
}));
