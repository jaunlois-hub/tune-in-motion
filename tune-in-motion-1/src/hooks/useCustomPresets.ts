import { useState, useCallback, useEffect } from 'react';
import type { EffectSettings } from './useGuitarEffects';

export interface CustomPreset {
  id: string;
  name: string;
  artist: string;
  song: string;
  genre: string;
  settings: EffectSettings;
  createdAt: number;
}

const STORAGE_KEY = 'guitar-custom-presets';

function loadPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useCustomPresets() {
  const [presets, setPresets] = useState<CustomPreset[]>(loadPresets);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  const savePreset = useCallback((preset: Omit<CustomPreset, 'id' | 'createdAt'>) => {
    const newPreset: CustomPreset = {
      ...preset,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setPresets(prev => [newPreset, ...prev]);
    return newPreset;
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  }, []);

  return { presets, savePreset, deletePreset };
}
