import { useState, useCallback, useEffect } from 'react';

/**
 * User-loaded impulse response (IR) library.
 *
 * IRs are .wav files that a `ConvolverNode` uses to imprint the acoustic
 * character of a cabinet, room, or reverb onto the dry signal. Buffers are
 * decoded via an ephemeral `AudioContext` (so we can load them before the
 * effects rig is started) and stored in memory only — metadata is persisted
 * to `localStorage`, but the buffers themselves are not (Web Audio buffers
 * can't be serialized). On page reload the user re-picks the files.
 */
export interface ImpulseResponse {
  id: string;
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  channels: number;
  buffer: AudioBuffer;
}

interface StoredMeta {
  id: string;
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  channels: number;
}

const STORAGE_KEY = 'guitar-ir-library-meta';

function loadMeta(): StoredMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Single throwaway AudioContext used only for decoding IR files.
let decodeCtx: AudioContext | null = null;
function getDecodeCtx(): AudioContext {
  if (!decodeCtx) decodeCtx = new AudioContext();
  return decodeCtx;
}

export function useImpulseResponses() {
  const [irs, setIrs] = useState<ImpulseResponse[]>([]);
  const [activeIrId, setActiveIrId] = useState<string | null>(null);

  // Persist metadata so the UI can show "previously loaded" hints, but buffers
  // themselves must be re-picked by the user each session.
  useEffect(() => {
    const meta: StoredMeta[] = irs.map(({ buffer: _b, ...m }) => m);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  }, [irs]);

  const loadFile = useCallback(async (file: File): Promise<ImpulseResponse> => {
    const ctx = getDecodeCtx();
    const arr = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arr.slice(0));
    const ir: ImpulseResponse = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.wav$/i, ''),
      size: file.size,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      buffer,
    };
    setIrs(prev => [ir, ...prev]);
    return ir;
  }, []);

  const removeIr = useCallback((id: string) => {
    setIrs(prev => prev.filter(x => x.id !== id));
    setActiveIrId(prev => (prev === id ? null : prev));
  }, []);

  return { irs, activeIrId, setActiveIrId, loadFile, removeIr, previouslyLoaded: loadMeta() };
}
