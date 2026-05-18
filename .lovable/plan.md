## Audio Diagnostics Panel

A dev-style overlay that shows in real time which audio features are active (Chord Library, Utilities, Interval Trainer, Metronome, Drummer, Reference Tones, Jam, etc.), how many AudioNodes/sources they currently hold, and the shared AudioContext state. Goal: quickly see *who* is making sound when something squeals.

### 1. Tracking layer — `src/lib/audioDiagnostics.ts` (new)

A tiny Zustand store + helper API:

```ts
type SourceKind = 'buffer' | 'oscillator' | 'media' | 'other';
interface ActiveSource { id; feature; kind; freq?; startedAt; note?; }
interface FeatureStat  { feature; activeCount; totalStarted; lastStartedAt; }

trackSource(feature, node, meta?) → returns id; auto-removes on node.onended
untrackSource(id)
useAudioDiagnostics() → { sources, features, ctxState, sampleRate, masterCount }
```

It wraps `node.onended` (chaining any existing handler) so cleanup is automatic for `AudioBufferSourceNode` / `OscillatorNode`. For long-lived nodes (delays, gains in a pedal chain) the caller gets an explicit `untrackSource` handle.

It also polls `getSharedAudioContextSync().state` + `sampleRate` once per second and reads `liveMasters.size` (exported as a getter from `useMasterVolume.ts`).

### 2. Instrumentation (minimal, surgical)

Add `trackSource(...)` calls at the points that already create/stop audio sources:

- `src/lib/pluckedSynth.ts` → inside `playPluckedNote`, register `src` with `feature` passed via a new optional arg (default `'pluck'`).
- `src/components/trainer/ChordLibrary.tsx` → pass `feature: 'chord-library'` when invoking pluck.
- `src/components/sections/UtilitiesSection.tsx` → pass `feature: 'utilities'`.
- `src/components/trainer/IntervalTrainer.tsx` → `'interval-trainer'`.
- `src/hooks/useReferenceTone.ts`, `useMetronome.ts`, `useDrumMachine.ts`, `useSmartDrummer.ts` → wrap oscillator/buffer creation with `trackSource(feature, node)`.
- `src/components/practice/JamSession.tsx`, `CircleOfFifths.tsx` → same.

No behavior change, just observation.

### 3. UI — `src/components/diagnostics/AudioDiagnosticsPanel.tsx` (new)

Floating bottom-right toggle button (only when a `?debug` query param is present OR a small gear in the footer toggles it — to be confirmed). When open, a fixed panel shows:

- **Context**: state (running/suspended), sample rate, master-gain node count.
- **Features table**: feature name • active count badge (pulses red when >0) • total started • time since last start.
- **Live sources** (collapsible): id, feature, kind, freq, age in ms.
- **Buttons**: "Stop all (panic)" → iterates every tracked source and calls `.stop()`; "Reset counters".

Styled with existing semantic tokens (`bg-card`, `border-border`, `text-primary`), Orbitron/JetBrains Mono per project memory.

### 4. Mount

Mounted once in `src/pages/Index.tsx` at the root level so it overlays every section.

### Out of scope

- No changes to actual audio routing or the squelch fix itself.
- No persistence/telemetry — purely an in-session debug view.

### Open question

Should the panel be always-visible (small collapsed pill) or hidden behind `?debug=1`? I'll default to a small collapsed pill in the corner that the user can hide, unless you prefer the query-param gate.