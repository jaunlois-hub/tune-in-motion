import { useState, useEffect, useCallback } from 'react';

// ============================================================
// Setup specs — every editable measurement, plus model identity
// ============================================================
export type BridgeMode = 'floating-trem' | 'decked-trem' | 'hardtail' | 'offset-trem' | 'dynamic-vibrato';

export interface SetupSpecs {
  // Build constants
  scaleLengthMm: number;
  radiusInches: number;
  numFrets: number;
  pickupConfig: 'SSS' | 'SS';
  bridgeType: string;
  bridgeMode: BridgeMode;
  bridgeStringSpacingMm: number;     // E-to-e at the saddles (Strat 52.4, Tele 54.0, etc.)

  // Editable measurements (mm)
  nutActionTrebleMm: number;
  nutActionBassMm: number;
  action12TrebleMm: number;
  action12BassMm: number;
  reliefMinMm: number;
  reliefMaxMm: number;
  pickupNeckTrebleMm: number;
  pickupNeckBassMm: number;
  pickupMiddleTrebleMm: number; // 0 if model has no middle pickup
  pickupMiddleBassMm: number;
  pickupBridgeTrebleMm: number;
  pickupBridgeBassMm: number;

  // Bridge / saddle (editable)
  bridgePlateGapMm: number;          // gap between trailing edge of bridge plate and body (0 = decked, ≈3.2 = floating Strat)
  springCount: number;                // tremolo claw springs (Strat 2-5; 0 for hardtail / leaf-spring trems)
  saddleScrewHeightMm: number;        // average saddle screw protrusion above the bridge plate, base reference
}

export type SpecKey = keyof Omit<SetupSpecs, 'pickupConfig' | 'bridgeType' | 'numFrets'>;

export interface GuitarModel {
  id: string;
  name: string;
  family: 'Strat' | 'Tele' | 'Offset';
  notes: string;
  specs: SetupSpecs;
}

// ============================================================
// Factory specs per Fender model
// References: Fender owner's manuals (American Pro II / Vintera /
// American Vintage II) and CustomShop setup sheets where published.
// All numbers are *factory* — actual pieces vary slightly.
// ============================================================
export const MODELS: GuitarModel[] = [
  {
    id: 'strat-modern',
    name: 'Stratocaster — Modern (9.5″)',
    family: 'Strat',
    notes: 'American Pro II / Vintera modern — 2-point tremolo, 22 frets',
    specs: {
      scaleLengthMm: 648, radiusInches: 9.5, numFrets: 22, pickupConfig: 'SSS',
      bridgeType: '2-point synchronized tremolo',
      bridgeMode: 'floating-trem', bridgeStringSpacingMm: 52.4,
      nutActionTrebleMm: 0.4, nutActionBassMm: 0.7,
      action12TrebleMm: 1.6, action12BassMm: 2.0,
      reliefMinMm: 0.20, reliefMaxMm: 0.30,
      pickupNeckTrebleMm: 2.0, pickupNeckBassMm: 2.4,
      pickupMiddleTrebleMm: 2.0, pickupMiddleBassMm: 2.4,
      pickupBridgeTrebleMm: 2.0, pickupBridgeBassMm: 2.4,
      bridgePlateGapMm: 3.2, springCount: 3, saddleScrewHeightMm: 1.5,
    },
  },
  {
    id: 'strat-vintage',
    name: 'Stratocaster — Vintage (7.25″)',
    family: 'Strat',
    notes: '6-screw vintage tremolo, 21 frets, vintage-curve fretboard',
    specs: {
      scaleLengthMm: 648, radiusInches: 7.25, numFrets: 21, pickupConfig: 'SSS',
      bridgeType: '6-screw vintage tremolo',
      bridgeMode: 'decked-trem', bridgeStringSpacingMm: 56.0,
      nutActionTrebleMm: 0.5, nutActionBassMm: 0.8,
      action12TrebleMm: 2.0, action12BassMm: 2.4,
      reliefMinMm: 0.25, reliefMaxMm: 0.35,
      pickupNeckTrebleMm: 2.0, pickupNeckBassMm: 2.4,
      pickupMiddleTrebleMm: 2.0, pickupMiddleBassMm: 2.4,
      pickupBridgeTrebleMm: 2.0, pickupBridgeBassMm: 2.4,
      bridgePlateGapMm: 0, springCount: 5, saddleScrewHeightMm: 2.0,
    },
  },
  {
    id: 'tele',
    name: 'Telecaster — Modern (9.5″)',
    family: 'Tele',
    notes: '6-saddle string-thru hardtail, 22 frets, no middle pickup',
    specs: {
      scaleLengthMm: 648, radiusInches: 9.5, numFrets: 22, pickupConfig: 'SS',
      bridgeType: '6-saddle string-thru hardtail',
      bridgeMode: 'hardtail', bridgeStringSpacingMm: 54.0,
      nutActionTrebleMm: 0.4, nutActionBassMm: 0.7,
      action12TrebleMm: 1.6, action12BassMm: 2.0,
      reliefMinMm: 0.20, reliefMaxMm: 0.30,
      pickupNeckTrebleMm: 2.0, pickupNeckBassMm: 2.4,
      pickupMiddleTrebleMm: 0, pickupMiddleBassMm: 0,
      pickupBridgeTrebleMm: 1.6, pickupBridgeBassMm: 2.0,
      bridgePlateGapMm: 0, springCount: 0, saddleScrewHeightMm: 1.6,
    },
  },
  {
    id: 'jaguar',
    name: 'Jaguar — Vintage (7.25″)',
    family: 'Offset',
    notes: 'Short 24″ scale, floating tremolo, rocker bridge — needs careful intonation',
    specs: {
      scaleLengthMm: 610, radiusInches: 7.25, numFrets: 22, pickupConfig: 'SS',
      bridgeType: 'Floating tremolo + rocker bridge',
      bridgeMode: 'offset-trem', bridgeStringSpacingMm: 53.0,
      nutActionTrebleMm: 0.5, nutActionBassMm: 0.8,
      action12TrebleMm: 2.0, action12BassMm: 2.4,
      reliefMinMm: 0.25, reliefMaxMm: 0.35,
      pickupNeckTrebleMm: 2.0, pickupNeckBassMm: 2.4,
      pickupMiddleTrebleMm: 0, pickupMiddleBassMm: 0,
      pickupBridgeTrebleMm: 1.8, pickupBridgeBassMm: 2.2,
      bridgePlateGapMm: 0, springCount: 0, saddleScrewHeightMm: 2.5,
    },
  },
  {
    id: 'jazzmaster',
    name: 'Jazzmaster — Vintage (7.25″)',
    family: 'Offset',
    notes: 'Floating tremolo, wide soapbar pickups sit deeper than Strat singles',
    specs: {
      scaleLengthMm: 648, radiusInches: 7.25, numFrets: 21, pickupConfig: 'SS',
      bridgeType: 'Floating tremolo + rocker bridge',
      bridgeMode: 'offset-trem', bridgeStringSpacingMm: 53.0,
      nutActionTrebleMm: 0.5, nutActionBassMm: 0.8,
      action12TrebleMm: 2.0, action12BassMm: 2.4,
      reliefMinMm: 0.25, reliefMaxMm: 0.35,
      pickupNeckTrebleMm: 2.4, pickupNeckBassMm: 2.8,
      pickupMiddleTrebleMm: 0, pickupMiddleBassMm: 0,
      pickupBridgeTrebleMm: 2.4, pickupBridgeBassMm: 2.8,
      bridgePlateGapMm: 0, springCount: 0, saddleScrewHeightMm: 2.5,
    },
  },
  {
    id: 'mustang',
    name: 'Mustang — Short Scale (24″)',
    family: 'Offset',
    notes: 'Dynamic Vibrato unit, lower string tension at pitch — easier bends, less sustain',
    specs: {
      scaleLengthMm: 610, radiusInches: 9.5, numFrets: 22, pickupConfig: 'SS',
      bridgeType: 'Dynamic Vibrato',
      bridgeMode: 'dynamic-vibrato', bridgeStringSpacingMm: 52.0,
      nutActionTrebleMm: 0.4, nutActionBassMm: 0.7,
      action12TrebleMm: 1.6, action12BassMm: 2.0,
      reliefMinMm: 0.20, reliefMaxMm: 0.30,
      pickupNeckTrebleMm: 2.0, pickupNeckBassMm: 2.4,
      pickupMiddleTrebleMm: 0, pickupMiddleBassMm: 0,
      pickupBridgeTrebleMm: 2.0, pickupBridgeBassMm: 2.4,
      bridgePlateGapMm: 0, springCount: 0, saddleScrewHeightMm: 1.6,
    },
  },
];

// ============================================================
// Per-string saddle calculations
// Given bridge string spacing W, fretboard radius R, and the
// outer-string actions (treble + bass), compute each string's
// action at the 12th and saddle-drop relative to the highest
// (centre) saddle. Saddle drops follow the radius arc — middle
// strings sit highest, outer strings sit lowest.
// ============================================================
export interface SaddleRow {
  string: 'E' | 'A' | 'D' | 'G' | 'B' | 'e';
  index: number;     // 0 = low E, 5 = high e
  action12Mm: number;
  saddleDropMm: number;
}

const STRING_ORDER: SaddleRow['string'][] = ['E', 'A', 'D', 'G', 'B', 'e'];

export function computeSaddleHeights(specs: SetupSpecs): SaddleRow[] {
  const N = 6;
  const W = specs.bridgeStringSpacingMm;
  const R = specs.radiusInches * 25.4;          // mm

  // String x-positions across the bridge. i=0 is low E (bass side, x = -W/2)
  const positions = Array.from({ length: N }, (_, i) => -W / 2 + (i / (N - 1)) * W);

  // Fretboard arc offset at x: y = R − sqrt(R² − x²)
  const arc = (x: number) => R - Math.sqrt(R * R - x * x);

  // The HIGHEST saddle is at the centre of the arc (smallest absolute x for an even count
  // of strings, the inner pair). We measure how far each saddle SITS BELOW that highest.
  const offsets = positions.map((x) => arc(Math.abs(x)));
  const minOffset = Math.min(...offsets);

  return positions.map((x, i) => {
    const t = i / (N - 1);     // 0 (bass) → 1 (treble)
    // Action interpolates linearly bass→treble across the bridge
    const action12Mm = specs.action12BassMm * (1 - t) + specs.action12TrebleMm * t;
    const saddleDropMm = offsets[i] - minOffset;
    return { string: STRING_ORDER[i], index: i, action12Mm, saddleDropMm };
  });
}

// ============================================================
// Persistence
// ============================================================
const STORAGE_KEY = 'bleedout.setupPrefs.v1';

interface PersistedState {
  modelId: string;
  overrides: Record<string, Partial<SetupSpecs>>;
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { modelId: MODELS[0].id, overrides: {} };
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      modelId: parsed.modelId ?? MODELS[0].id,
      overrides: parsed.overrides ?? {},
    };
  } catch {
    return { modelId: MODELS[0].id, overrides: {} };
  }
}

// ============================================================
// Hook
// ============================================================
export function useSetupPrefs() {
  const [{ modelId, overrides }, setState] = useState<PersistedState>(() => loadPersisted());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ modelId, overrides }));
    } catch {
      /* localStorage may be disabled */
    }
  }, [modelId, overrides]);

  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
  const factory = model.specs;
  const modelOverride = overrides[modelId] ?? {};
  const specs: SetupSpecs = { ...factory, ...modelOverride };

  const setModelId = useCallback((id: string) => {
    setState((s) => ({ ...s, modelId: id }));
  }, []);

  const isOverridden = useCallback(
    (key: SpecKey): boolean => {
      const o = overrides[modelId]?.[key];
      return o !== undefined && o !== factory[key];
    },
    [overrides, modelId, factory],
  );

  const setOverride = useCallback(
    (key: SpecKey, value: number) => {
      setState((s) => {
        const current = s.overrides[s.modelId] ?? {};
        return {
          ...s,
          overrides: {
            ...s.overrides,
            [s.modelId]: { ...current, [key]: value },
          },
        };
      });
    },
    [],
  );

  const resetField = useCallback(
    (key: SpecKey) => {
      setState((s) => {
        const current = { ...(s.overrides[s.modelId] ?? {}) };
        delete (current as Record<string, unknown>)[key];
        return {
          ...s,
          overrides: { ...s.overrides, [s.modelId]: current },
        };
      });
    },
    [],
  );

  const resetAll = useCallback(() => {
    setState((s) => ({ ...s, overrides: { ...s.overrides, [s.modelId]: {} } }));
  }, []);

  const hasAnyOverride = Object.keys(modelOverride).some((k) => modelOverride[k as SpecKey] !== undefined);

  return {
    model,
    modelId,
    setModelId,
    factory,
    specs,
    isOverridden,
    setOverride,
    resetField,
    resetAll,
    hasAnyOverride,
  };
}
