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
const EXPORT_VERSION = 1;
const EXPORT_KIND = 'lovable.guitar.customPresets';

export interface PresetExportFile {
  kind: typeof EXPORT_KIND;
  version: number;
  exportedAt: number;
  presets: CustomPreset[];
}

function loadPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function downloadBlob(filename: string, data: string) {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeFilename(s: string) {
  return (s || 'preset').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
}

function isPreset(x: unknown): x is CustomPreset {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return typeof p.name === 'string' && typeof p.settings === 'object' && p.settings !== null;
}

/**
 * Normalize an imported preset entry — fill missing IDs/timestamps,
 * coerce optional string fields, and accept either a full export file
 * or a single preset object.
 */
function normalizePreset(p: Partial<CustomPreset>): CustomPreset {
  return {
    id: p.id || crypto.randomUUID(),
    name: String(p.name || 'Imported Preset'),
    artist: String(p.artist || ''),
    song: String(p.song || ''),
    genre: String(p.genre || ''),
    settings: p.settings as EffectSettings,
    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
  };
}

export type ImportMode = 'merge' | 'replace';
export interface ImportResult {
  added: number;
  skipped: number;
  total: number;
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

  const exportAll = useCallback(() => {
    const file: PresetExportFile = {
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      presets,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(`guitar-presets-${stamp}.json`, JSON.stringify(file, null, 2));
    return file;
  }, [presets]);

  const exportPreset = useCallback((id: string) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    const file: PresetExportFile = {
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      presets: [p],
    };
    downloadBlob(`preset-${sanitizeFilename(p.name)}.json`, JSON.stringify(file, null, 2));
  }, [presets]);

  /**
   * Accepts: full export file, bare array of presets, or a single preset object.
   * Returns counts so the UI can toast a result.
   */
  const importPresets = useCallback(async (file: File, mode: ImportMode = 'merge'): Promise<ImportResult> => {
    const text = await file.text();
    const parsed = JSON.parse(text);

    let incoming: unknown[];
    if (Array.isArray(parsed)) {
      incoming = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as PresetExportFile).presets)) {
      incoming = (parsed as PresetExportFile).presets;
    } else if (isPreset(parsed)) {
      incoming = [parsed];
    } else {
      throw new Error('Unrecognized preset file format');
    }

    const valid = incoming.filter(isPreset).map(p => normalizePreset(p as CustomPreset));
    const skipped = incoming.length - valid.length;

    if (valid.length === 0) {
      throw new Error('No valid presets found in file');
    }

    let added = 0;
    setPresets(prev => {
      if (mode === 'replace') {
        added = valid.length;
        return valid;
      }
      const existingIds = new Set(prev.map(p => p.id));
      const existingSig = new Set(prev.map(p => `${p.name}::${p.artist}::${p.song}`));
      const fresh = valid
        // give a new ID on collision to avoid React key clashes
        .map(p => (existingIds.has(p.id) ? { ...p, id: crypto.randomUUID() } : p))
        // dedupe by signature (name+artist+song) to avoid double-imports
        .filter(p => !existingSig.has(`${p.name}::${p.artist}::${p.song}`));
      added = fresh.length;
      return [...fresh, ...prev];
    });

    return { added, skipped, total: incoming.length };
  }, []);

  return { presets, savePreset, deletePreset, exportAll, exportPreset, importPresets };
}
