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

interface DiagnosticsState {
  sources: TrackedSource[];
  features: Record<string, FeatureStat>;
  ctxState: AudioContextState | 'uninitialized';
  sampleRate: number;
  // bumped whenever anything mutates so React re-renders without deep equality
  tick: number;
}

export const useAudioDiagnostics = create<DiagnosticsState>(() => ({
  sources: [],
  features: {},
  ctxState: 'uninitialized',
  sampleRate: 0,
  tick: 0,
}));

let nextId = 1;
const featureStack: string[] = [];
const installedContexts = new WeakSet<AudioContext>();

function currentFeature(): string {
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
    ref: new WeakRef(node),
  };
  const s = useAudioDiagnostics.getState();
  const prev = s.features[feature] ?? { feature, activeCount: 0, totalStarted: 0, lastStartedAt: 0 };
  useAudioDiagnostics.setState({
    sources: [...s.sources, entry],
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
    const node = entry.ref.deref();
    if (node) {
      try { node.stop(); stopped++; } catch { /* already stopped */ }
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
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
  useAudioDiagnostics.setState({ features, tick: s.tick + 1 });
}
