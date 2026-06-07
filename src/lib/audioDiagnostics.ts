// Audio diagnostics — a lightweight observation layer over the shared AudioContext.
//
// Purpose: when something in the app makes an unexpected sound (e.g. a high-frequency
// squelch from a runaway oscillator), open the Audio Diagnostics panel to see which
// feature is currently producing audio sources, how many are live, and how old they are.
//
// Mechanism:
//   1. installDiagnostics(ctx) monkey-patches createOscillator/createBufferSource on the
//      shared AudioContext to auto-track every node that gets created.
//   2. Call sites optionally wrap their audio work in withAudioFeature('chord-library', fn)
//      so newly created nodes get attributed to that feature instead of 'unknown'.
//   3. Each tracked node auto-removes itself from the registry when its `onended` fires.
//      A panic stop button iterates every live source and calls .stop().

import { create } from 'zustand';

export type SourceKind = 'oscillator' | 'buffer' | 'other';

export interface TrackedSource {
  id: number;
  feature: string;
  kind: SourceKind;
  startedAt: number; // performance.now()
  freq?: number;
  node: AudioScheduledSourceNode;
}

export interface FeatureStat {
  feature: string;
  activeCount: number;
  totalStarted: number;
  lastStartedAt: number;
}

export interface FreqSample {
  freq: number;
  at: number; // performance.now()
  feature: string;
}

export interface FeedbackWarning {
  /** Stable hash of delayId + gainId so repeated detections dedupe. */
  id: string;
  feature: string;
  delayId: number;
  gainId: number;
  gainValue: number;
  delayTimeSec: number;
  pathLength: number;
  detectedAt: number;
  dismissed?: boolean;
}

interface DiagnosticsState {
  sources: TrackedSource[];
  features: Record<string, FeatureStat>;
  recentFreqs: FreqSample[];
  feedbackWarnings: FeedbackWarning[];
  ctxState: AudioContextState | 'uninitialized';
  sampleRate: number;
  // bumped whenever anything mutates so React re-renders without deep equality
  tick: number;
}

const RECENT_FREQ_CAP = 256;
/** Frequencies at or above this are flagged as likely-squelch in the histogram. */
export const SQUELCH_FREQ_HZ = 4000;

export const useAudioDiagnostics = create<DiagnosticsState>(() => ({
  sources: [],
  features: {},
  recentFreqs: [],
  feedbackWarnings: [],
  ctxState: 'uninitialized',
  sampleRate: 0,
  tick: 0,
}));


export interface HistogramBin {
  label: string;
  minHz: number;
  maxHz: number;
  count: number;
  dangerous: boolean;
}

/** Log-spaced histogram of recent oscillator frequencies. */
export function getFrequencyHistogram(
  binCount = 14,
  minHz = 40,
  maxHz = 12000,
): HistogramBin[] {
  const { recentFreqs } = useAudioDiagnostics.getState();
  const logMin = Math.log(minHz);
  const logMax = Math.log(maxHz);
  const step = (logMax - logMin) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const lo = Math.exp(logMin + i * step);
    const hi = Math.exp(logMin + (i + 1) * step);
    const labelHz = (hi + lo) / 2;
    const label =
      labelHz >= 1000 ? `${(labelHz / 1000).toFixed(1)}k` : `${Math.round(labelHz)}`;
    return { label, minHz: lo, maxHz: hi, count: 0, dangerous: lo >= SQUELCH_FREQ_HZ };
  });
  for (const s of recentFreqs) {
    if (!s.freq || s.freq < minHz || s.freq >= maxHz) continue;
    const idx = Math.min(
      binCount - 1,
      Math.floor((Math.log(s.freq) - logMin) / step),
    );
    bins[idx].count++;
  }
  return bins;
}

/** Aggregate the most common recent frequencies (rounded to 10 Hz). */
export function getTopFrequencies(n = 5): { freq: number; count: number; dangerous: boolean }[] {
  const { recentFreqs } = useAudioDiagnostics.getState();
  const buckets = new Map<number, number>();
  for (const s of recentFreqs) {
    if (!s.freq) continue;
    const rounded = Math.round(s.freq / 10) * 10;
    buckets.set(rounded, (buckets.get(rounded) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([freq, count]) => ({ freq, count, dangerous: freq >= SQUELCH_FREQ_HZ }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

let nextId = 1;
const featureStack: string[] = [];
const installedContexts = new WeakSet<AudioContext>();

/** Current feature label from the withAudioFeature stack. Exported so the
 *  graph inspector can attribute newly-created nodes to the same feature. */
export function currentFeature(): string {
  return featureStack[featureStack.length - 1] ?? 'unknown';
}


/** Push a feature label for the duration of `fn`. Any AudioNodes created
 *  synchronously inside `fn` (or shortly after via the patched factory) will
 *  be attributed to this feature. */
export function withAudioFeature<T>(feature: string, fn: () => T): T {
  featureStack.push(feature);
  try {
    return fn();
  } finally {
    featureStack.pop();
  }
}

function recordStart(node: AudioScheduledSourceNode, kind: SourceKind, feature: string, freq?: number) {
  const id = nextId++;
  const entry: TrackedSource = {
    id,
    feature,
    kind,
    startedAt: performance.now(),
    freq,
    node,
  };
  const s = useAudioDiagnostics.getState();
  const prev = s.features[feature] ?? { feature, activeCount: 0, totalStarted: 0, lastStartedAt: 0 };
  const nextRecent =
    freq && freq > 0
      ? [...s.recentFreqs, { freq, at: entry.startedAt, feature }].slice(-RECENT_FREQ_CAP)
      : s.recentFreqs;
  useAudioDiagnostics.setState({
    sources: [...s.sources, entry],
    recentFreqs: nextRecent,
    features: {
      ...s.features,
      [feature]: {
        ...prev,
        activeCount: prev.activeCount + 1,
        totalStarted: prev.totalStarted + 1,
        lastStartedAt: entry.startedAt,
      },
    },
    tick: s.tick + 1,
  });

  const cleanup = () => {
    const cur = useAudioDiagnostics.getState();
    const stillThere = cur.sources.find((x) => x.id === id);
    if (!stillThere) return;
    const f = cur.features[feature];
    useAudioDiagnostics.setState({
      sources: cur.sources.filter((x) => x.id !== id),
      features: f
        ? { ...cur.features, [feature]: { ...f, activeCount: Math.max(0, f.activeCount - 1) } }
        : cur.features,
      tick: cur.tick + 1,
    });
  };

  // Chain onto any existing onended handler.
  const prevHandler = node.onended;
  node.onended = (ev: Event) => {
    cleanup();
    if (typeof prevHandler === 'function') {
      try { (prevHandler as (this: AudioScheduledSourceNode, ev: Event) => void).call(node, ev); }
      catch (err) { console.warn('Chained onended failed', err); }
    }
  };
}

/** Install patches on the shared AudioContext so every oscillator/buffer source
 *  is auto-tracked. Safe to call multiple times — idempotent per context. */
export function installDiagnostics(ctx: AudioContext): void {
  if (installedContexts.has(ctx)) return;
  installedContexts.add(ctx);

  const origOsc = ctx.createOscillator.bind(ctx);
  const origBuf = ctx.createBufferSource.bind(ctx);

  (ctx as AudioContext).createOscillator = function patchedCreateOscillator(): OscillatorNode {
    const node = origOsc();
    const feature = currentFeature();
    const origStart = node.start.bind(node);
    node.start = function patchedStart(when?: number) {
      recordStart(node, 'oscillator', feature, node.frequency?.value);
      return origStart(when);
    } as OscillatorNode['start'];
    return node;
  };

  (ctx as AudioContext).createBufferSource = function patchedCreateBufferSource(): AudioBufferSourceNode {
    const node = origBuf();
    const feature = currentFeature();
    const origStart = node.start.bind(node);
    node.start = function patchedStart(when?: number, offset?: number, duration?: number) {
      recordStart(node, 'buffer', feature);
      return origStart(when, offset, duration);
    } as AudioBufferSourceNode['start'];
    return node;
  };

  // Poll context state for the UI.
  setInterval(() => {
    const s = useAudioDiagnostics.getState();
    if (s.ctxState !== ctx.state || s.sampleRate !== ctx.sampleRate) {
      useAudioDiagnostics.setState({ ctxState: ctx.state, sampleRate: ctx.sampleRate, tick: s.tick + 1 });
    }
  }, 1000);
  useAudioDiagnostics.setState({ ctxState: ctx.state, sampleRate: ctx.sampleRate });
}

/** Panic: stop every currently tracked source and clear the registry. */
export function panicStopAll(): number {
  const s = useAudioDiagnostics.getState();
  let stopped = 0;
  for (const entry of s.sources) {
    const node = entry.node;
    try { node.stop(); stopped++; } catch { /* already stopped */ }
    try { node.disconnect(); } catch { /* already disconnected */ }
  }
  // Reset active counts; keep totalStarted for history.
  const features = { ...s.features };
  for (const k of Object.keys(features)) features[k] = { ...features[k], activeCount: 0 };
  useAudioDiagnostics.setState({ sources: [], features, tick: s.tick + 1 });
  return stopped;
}

export function resetDiagnosticsCounters(): void {
  const s = useAudioDiagnostics.getState();
  const features: Record<string, FeatureStat> = {};
  for (const k of Object.keys(s.features)) {
    features[k] = { ...s.features[k], totalStarted: s.features[k].activeCount, lastStartedAt: 0 };
  }
  useAudioDiagnostics.setState({ features, recentFreqs: [], tick: s.tick + 1 });
}

export function clearRecentFrequencies(): void {
  const s = useAudioDiagnostics.getState();
  useAudioDiagnostics.setState({ recentFreqs: [], tick: s.tick + 1 });
}

export interface DiagnosticsSnapshot {
  capturedAt: string;
  ctxState: AudioContextState | 'uninitialized';
  sampleRate: number;
  liveSources: Array<{
    id: number;
    feature: string;
    kind: SourceKind;
    freq?: number;
    ageMs: number;
  }>;
  features: FeatureStat[];
  recentFreqs: FreqSample[];
  histogram: HistogramBin[];
  topFrequencies: ReturnType<typeof getTopFrequencies>;
  squelchThresholdHz: number;
  userAgent: string;
}

export function buildDiagnosticsSnapshot(): DiagnosticsSnapshot {
  const s = useAudioDiagnostics.getState();
  const now = performance.now();
  return {
    capturedAt: new Date().toISOString(),
    ctxState: s.ctxState,
    sampleRate: s.sampleRate,
    liveSources: s.sources.map((x) => ({
      id: x.id,
      feature: x.feature,
      kind: x.kind,
      freq: x.freq,
      ageMs: Math.round(now - x.startedAt),
    })),
    features: Object.values(s.features),
    recentFreqs: s.recentFreqs,
    histogram: getFrequencyHistogram(),
    topFrequencies: getTopFrequencies(10),
    squelchThresholdHz: SQUELCH_FREQ_HZ,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };
}
