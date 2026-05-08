import { create } from 'zustand';

const A4_KEY = 'tunerA4';
const MODE_KEY = 'tunerMode';
const MONITOR_VOL_KEY = 'monitorVolume';

export type TunerMode = 'strobe' | 'needle';

const numFromStorage = (key: string, fallback: number, min: number, max: number) => {
  if (typeof localStorage === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const modeFromStorage = (): TunerMode => {
  if (typeof localStorage === 'undefined') return 'strobe';
  const v = localStorage.getItem(MODE_KEY);
  return v === 'needle' || v === 'strobe' ? v : 'strobe';
};

interface TunerPrefsState {
  a4: number;
  mode: TunerMode;
  monitorVolume: number;
  setA4: (hz: number) => void;
  setMode: (mode: TunerMode) => void;
  setMonitorVolume: (vol: number) => void;
}

export const useTunerPrefs = create<TunerPrefsState>((set) => ({
  a4: numFromStorage(A4_KEY, 440, 380, 480),
  mode: modeFromStorage(),
  monitorVolume: numFromStorage(MONITOR_VOL_KEY, 0.7, 0, 1),
  setA4: (hz) => {
    const clamped = Math.min(480, Math.max(380, hz));
    if (typeof localStorage !== 'undefined') localStorage.setItem(A4_KEY, String(clamped));
    set({ a4: clamped });
  },
  setMode: (mode) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(MODE_KEY, mode);
    set({ mode });
  },
  setMonitorVolume: (vol) => {
    const clamped = Math.min(1, Math.max(0, vol));
    if (typeof localStorage !== 'undefined') localStorage.setItem(MONITOR_VOL_KEY, String(clamped));
    set({ monitorVolume: clamped });
  },
}));
