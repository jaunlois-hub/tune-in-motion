import { useEffect } from 'react';
import { create } from 'zustand';

const INPUT_KEY = 'audioInputDeviceId';
const OUTPUT_KEY = 'audioOutputDeviceId';

type Devices = MediaDeviceInfo[];

interface AudioDevicesState {
  inputs: Devices;
  outputs: Devices;
  inputDeviceId: string | undefined;
  outputDeviceId: string | undefined;
  hasLabels: boolean;
  setInputDeviceId: (id: string | undefined) => void;
  setOutputDeviceId: (id: string | undefined) => void;
  refresh: () => Promise<void>;
}

const supportsSetSinkId = typeof window !== 'undefined' &&
  typeof AudioContext !== 'undefined' &&
  // @ts-expect-error - setSinkId is not in the lib.dom types yet
  typeof AudioContext.prototype.setSinkId === 'function';

export const useAudioDevicesStore = create<AudioDevicesState>((set, get) => ({
  inputs: [],
  outputs: [],
  inputDeviceId: typeof localStorage !== 'undefined' ? localStorage.getItem(INPUT_KEY) ?? undefined : undefined,
  outputDeviceId: typeof localStorage !== 'undefined' ? localStorage.getItem(OUTPUT_KEY) ?? undefined : undefined,
  hasLabels: false,
  setInputDeviceId: (id) => {
    if (id) localStorage.setItem(INPUT_KEY, id);
    else localStorage.removeItem(INPUT_KEY);
    set({ inputDeviceId: id });
  },
  setOutputDeviceId: (id) => {
    if (id) localStorage.setItem(OUTPUT_KEY, id);
    else localStorage.removeItem(OUTPUT_KEY);
    set({ outputDeviceId: id });
  },
  refresh: async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === 'audioinput');
      const outputs = all.filter((d) => d.kind === 'audiooutput');
      const hasLabels = inputs.some((d) => d.label) || outputs.some((d) => d.label);
      set({ inputs, outputs, hasLabels });

      // Drop any saved selection that no longer matches an attached device.
      const { inputDeviceId, outputDeviceId } = get();
      if (inputDeviceId && !inputs.some((d) => d.deviceId === inputDeviceId)) {
        get().setInputDeviceId(undefined);
      }
      if (outputDeviceId && !outputs.some((d) => d.deviceId === outputDeviceId)) {
        get().setOutputDeviceId(undefined);
      }
    } catch (err) {
      console.error('enumerateDevices failed', err);
    }
  },
}));

/**
 * Resolve the audio constraints for getUserMedia, scoped to the selected input device.
 */
export function buildAudioConstraints(
  base: MediaTrackConstraints = {},
): MediaStreamConstraints {
  const inputDeviceId = useAudioDevicesStore.getState().inputDeviceId;
  const audio: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    ...base,
  };
  if (inputDeviceId) {
    audio.deviceId = { exact: inputDeviceId };
  }
  return { audio };
}

/**
 * Apply the currently selected output device to an AudioContext, when supported.
 * No-op on browsers that don't implement AudioContext.setSinkId.
 */
export async function applyOutputSink(ctx: AudioContext): Promise<void> {
  if (!supportsSetSinkId) return;
  const id = useAudioDevicesStore.getState().outputDeviceId;
  if (!id) return;
  try {
    // @ts-expect-error - setSinkId isn't in lib.dom yet
    await ctx.setSinkId(id);
  } catch (err) {
    console.warn('AudioContext.setSinkId failed', err);
  }
}

export const audioDeviceSupport = {
  setSinkId: supportsSetSinkId,
};

/**
 * React hook that keeps the device list in sync with the platform.
 * Refreshes on mount and whenever the OS reports a device change.
 */
export function useAudioDevices() {
  const state = useAudioDevicesStore();

  useEffect(() => {
    state.refresh();
    const handler = () => state.refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
