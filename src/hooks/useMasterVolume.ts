import { create } from 'zustand';

interface MasterVolumeState {
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
}

export const useMasterVolume = create<MasterVolumeState>((set) => ({
  masterVolume: 0.8,
  setMasterVolume: (volume: number) => set({ masterVolume: Math.max(0, Math.min(1, volume)) }),
}));

// All live master gain nodes so the slider applies to every audible source.
// Each entry is { ctx, gain }; we hold the ctx so we can drop closed contexts.
const liveMasters = new Set<{ ctx: AudioContext; gain: GainNode }>();

/**
 * Create a master GainNode connected to ctx.destination, tracked so the
 * master-volume slider drives it. Use this in place of ctx.destination for
 * anything the user expects the master volume to affect.
 *
 * Returns the gain node and a release() to call on stop()/unmount.
 */
export function createMasterGain(ctx: AudioContext): { master: GainNode; release: () => void } {
  const master = ctx.createGain();
  const highCut = ctx.createBiquadFilter();
  highCut.type = 'lowpass';
  highCut.frequency.value = 8500;
  highCut.Q.value = 0.2;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.knee.value = 8;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  master.gain.value = useMasterVolume.getState().masterVolume;
  master.connect(highCut);
  highCut.connect(limiter);
  limiter.connect(ctx.destination);
  const entry = { ctx, gain: master };
  liveMasters.add(entry);
  return {
    master,
    release: () => {
      try { master.disconnect(); } catch { /* already disconnected */ }
      try { highCut.disconnect(); } catch { /* already disconnected */ }
      try { limiter.disconnect(); } catch { /* already disconnected */ }
      liveMasters.delete(entry);
    },
  };
}

let lastVolume = useMasterVolume.getState().masterVolume;
useMasterVolume.subscribe((state) => {
  if (state.masterVolume === lastVolume) return;
  lastVolume = state.masterVolume;
  // Smooth ramp avoids zipper noise when the slider drags.
  for (const entry of liveMasters) {
    if (entry.ctx.state === 'closed') {
      liveMasters.delete(entry);
      continue;
    }
    try {
      const now = entry.ctx.currentTime;
      entry.gain.gain.cancelScheduledValues(now);
      entry.gain.gain.setTargetAtTime(state.masterVolume, now, 0.02);
    } catch {
      /* ignore — node may have been released between iterations */
    }
  }
});
