import { create } from 'zustand';

/**
 * Tiny pub/sub for "something loud is playing through the output" so other
 * audio nodes (e.g. the mic monitor) can duck themselves to avoid feeding
 * back into the pitch detector.
 *
 * Sources push when they start and pop when they stop. The boolean
 * `isDucked` is true whenever any source is active.
 */
interface AudioDuckingState {
  active: number;
  push: () => void;
  pop: () => void;
  isDucked: () => boolean;
}

export const useAudioDucking = create<AudioDuckingState>((set, get) => ({
  active: 0,
  push: () => set({ active: get().active + 1 }),
  pop: () => set({ active: Math.max(0, get().active - 1) }),
  isDucked: () => get().active > 0,
}));
