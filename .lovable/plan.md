# Feedback Loop Detector for Audio Diagnostics

## Goal

Automatically flag the exact Web Audio pattern that caused our squelch bug:
a `DelayNode` whose output reaches a `GainNode` that connects back into the
same `DelayNode`'s input (a Karplus-Strong style feedback loop). When such a
cycle appears in the live graph, show a clear warning in the diagnostics
panel with the feedback gain value and the owning feature.

The Web Audio API has no built-in way to enumerate a node's connections, so
we must instrument the graph ourselves at node-creation and `.connect()` time.

## Scope

In scope:
- Track DelayNodes, GainNodes, and BiquadFilterNodes (filters are commonly in
  the loop between delay and gain) created on the shared `AudioContext`.
- Patch `AudioNode.prototype.connect` / `disconnect` on those nodes to
  maintain an adjacency map.
- On each connect, run a small bounded DFS from any new DelayNode output to
  see if it can reach itself through a path that includes a GainNode.
- Attribute each cycle to the current `withAudioFeature(...)` label.
- Surface findings as a new "Warnings" section (and tab badge) in
  `AudioDiagnosticsPanel`, including: feature, feedback gain value, path
  length, and node IDs.
- Include warnings in the JSON snapshot export.

Out of scope:
- Auto-killing offending nodes (we already have PANIC STOP).
- Detecting loops inside `OfflineAudioContext` (our pluck render uses one,
  but it's short-lived and intentional — would just create noise).
- Convolver / WaveShaper graph analysis.

## Files

New:
- `src/lib/audioGraphInspector.ts` — graph tracking + cycle detection.

Edited:
- `src/lib/audioDiagnostics.ts` — add `feedbackWarnings` to store and include
  it in `DiagnosticsSnapshot`.
- `src/lib/sharedAudioContext.ts` — call `installGraphInspector(ctx)` next
  to `installDiagnostics(ctx)`.
- `src/components/diagnostics/AudioDiagnosticsPanel.tsx` — render warnings
  banner in the status strip and a "Warnings" list (under Activity tab or
  as its own small section above the tabs).

No changes to feature audio code (`pluckedSynth.ts`, hooks, etc.). Detection
is purely observational — if a loop exists it gets reported, regardless of
whether it's intentional.

## Technical Details

### Graph tracking (`audioGraphInspector.ts`)

```ts
type NodeKind = 'delay' | 'gain' | 'filter' | 'other';
interface TrackedNode {
  id: number;
  kind: NodeKind;
  feature: string;
  ref: WeakRef<AudioNode>;
  // for gain nodes only — used in warning payload
  gainValue?: () => number;
  // for delay nodes — current delayTime
  delayTime?: () => number;
}
// adjacency: srcId -> Set<dstId>
const edges = new Map<number, Set<number>>();
const nodes = new Map<number, TrackedNode>();
```

`installGraphInspector(ctx)`:
1. Patch `ctx.createDelay`, `ctx.createGain`, `ctx.createBiquadFilter` to
   assign each returned node a hidden `__diagId` and register it in `nodes`
   with `currentFeature()` (reuse the existing `featureStack` — export an
   accessor from `audioDiagnostics.ts`).
2. Patch `AudioNode.prototype.connect` once globally (guarded by a
   `Symbol.for('lov-graph-patched')` flag on the prototype) so that when
   both src and dst have `__diagId` we add the edge and run
   `checkForFeedback(srcId)`.
3. Patch `disconnect` to remove edges (best-effort — when called without
   args, drop all outgoing edges for that node).
4. Periodically sweep `nodes` and drop entries whose `WeakRef.deref()` is
   gone, plus their edges and any warnings referencing them.

### Cycle check

`checkForFeedback(startDelayId)`:
- Only run when the just-added edge originates from a delay node, OR when
  the just-added edge points back into a delay node (cheap heuristic — a
  feedback loop must include at least one such edge).
- Bounded DFS from the delay node's outgoing edges, depth ≤ 6, visiting
  each id once. If we reach `startDelayId` again AND the path contains at
  least one gain node, record a warning:

```ts
interface FeedbackWarning {
  id: string;            // stable hash of delayId + gainId
  feature: string;
  delayId: number;
  gainId: number;
  gainValue: number;     // sampled at detection time
  delayTimeSec: number;
  pathLength: number;
  detectedAt: number;    // performance.now()
}
```

- Warnings are deduped by `id`; if the gain value later changes, update the
  existing warning rather than appending. (We poll gain values every ~500ms
  inside the existing diagnostics interval and refresh `gainValue` on each
  known warning so the UI shows current values.)

### Diagnostics store additions (`audioDiagnostics.ts`)

```ts
interface DiagnosticsState {
  // ...existing...
  feedbackWarnings: FeedbackWarning[];
}
export function reportFeedbackWarning(w: FeedbackWarning): void;
export function clearFeedbackWarnings(): void;
```

`buildDiagnosticsSnapshot()` gains a `feedbackWarnings` field.

### UI changes (`AudioDiagnosticsPanel.tsx`)

- Status strip: if `feedbackWarnings.length > 0`, show a destructive badge
  `⚠ ${n} feedback loop${n>1?'s':''}` next to the existing high-freq danger
  badge.
- New `Warnings` block rendered above the tabs (only when non-empty), one
  row per warning:

  ```
  ⚠  chord-library   delay#42 → gain#43 (×0.997) → delay#42
                     delay 5.10 ms · path len 2 · 2s ago      [Dismiss]
  ```

  Gains ≥ 0.95 are styled with the existing destructive token; below that,
  with the warning/muted token. Dismiss removes that warning id; if the
  cycle still exists on the next connect, it reappears.
- Warnings included in JSON snapshot automatically.

## Limitations (documented in code comments)

- `AudioNode.prototype.connect` is patched globally per page; we guard with
  a symbol so HMR doesn't double-patch.
- Detection is best-effort: connections made before the inspector is
  installed (none in practice — `installGraphInspector` runs at first
  context creation) or via `AudioParam` targets are ignored. Param targets
  can't form an audible feedback loop on their own without a node edge, so
  this is safe.
- We do not patch `OfflineAudioContext`, so the intentional Karplus loop
  inside `ensurePluckBuffer` won't trigger warnings.

## Acceptance

1. Loading the app in dev with no audio playing → no warnings.
2. If a future regression reintroduces a `delay → gain(>0.9) → delay` loop
   on the shared context, the panel shows the warning within one connect
   call, including feature name and gain value.
3. Snapshot JSON includes `feedbackWarnings: []` (or populated array).
4. PANIC STOP and existing tabs continue to work unchanged.
