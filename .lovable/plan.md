## Add Strange FX + Tonality Loader (IRs & Preset JSON)

### 1. New weird guitar effects
Extend `src/hooks/useGuitarEffects.ts` and `EffectSettings` with three new guitar-only effects, chained in series after Bitcrusher:

- **Granular Stutter** — `ScriptProcessorNode`-free implementation using a rolling `AudioBuffer` written from a `MediaStreamAudioDestinationNode` tap, replayed via `AudioBufferSourceNode` grains scheduled on `currentTime`. Params: grain size (20–200ms), density, jitter, wet mix.
- **Glitch Repeater** — captures the last N ms into a buffer and re-triggers it 2/4/8 times synced to BPM (uses existing `useBpmSync`). Params: slice length, repeats, pitch drift, wet.
- **Reverse Slicer** — same capture buffer, played back with `playbackRate = -1` at slice boundaries. Params: slice length, wet.

All three share one capture buffer (rolling 2 s) to keep the graph light. Each effect gets bypass + wet/dry gain and is registered with the existing feedback-loop inspector.

### 2. Studio UI additions
Update `src/components/studio/StudioView.tsx`:
- New **"🌀 Glitch"** category with sliders for the three effects.
- Two new **Weird presets**: **Stutter Storm**, **Reverse Ghost**.

### 3. Tonality loader — IRs (cabinet/reverb impulse responses)
New hook `src/hooks/useImpulseResponses.ts`:
- Load `.wav` file via `<input type=file>` → `arrayBuffer` → `audioContext.decodeAudioData` → cached `AudioBuffer`.
- Store metadata (name, size, sample rate, duration, id) + buffer in memory; persist metadata (not buffer) in `localStorage` under `guitar-ir-library`. On reload, user re-picks the file if they want it back (buffers can't be persisted).
- Optional built-in IR slots via `public/ir/` (README already exists there).

Wire into `useGuitarEffects.ts`:
- Add a `ConvolverNode` slot placed after cabinet sim / before master. `setImpulseResponse(buffer | null)` swaps `convolver.buffer`. Wet/dry gain + bypass.
- New `EffectSettings.convolverWet` field.

New UI panel `src/components/studio/IRLoader.tsx` inside StudioView "🔊 Cabinet & IR" section:
- File picker (accept `.wav`), list of loaded IRs, load/unload buttons, wet slider.

### 4. Tonality loader — Preset JSON (already partly built)
Existing `useCustomPresets.ts` already imports/exports preset JSON — extend the loader so a single dropped/picked file that looks like an IR (`.wav`) goes to the IR loader and a `.json` goes to preset import. Add a unified "**Load Tonality**" button in StudioView header that opens a picker accepting both, routes by extension.

### 5. Files
**Create**
- `src/hooks/useImpulseResponses.ts`
- `src/components/studio/IRLoader.tsx`

**Edit**
- `src/hooks/useGuitarEffects.ts` — add Granular/Glitch/Reverse nodes, ConvolverNode slot, new `EffectSettings` fields.
- `src/components/studio/StudioView.tsx` — 🌀 Glitch category, 2 new presets, IR loader panel, unified "Load Tonality" button.
- `src/lib/tonePresets.ts` — Stutter Storm + Reverse Ghost presets.
- `src/lib/audioGraphInspector.ts` — register new nodes so feedback-loop detector covers them.

### Technical notes
- Rolling capture buffer uses one `AudioWorkletNode` (fallback to `ScriptProcessorNode` if unavailable) writing into a `Float32Array` ring buffer; grain scheduling reads from that ring via `AudioBuffer` snapshots.
- Convolver placement matters: post-cabinet, pre-limiter, else IRs sound thin.
- IR buffers stay in memory only — clarified in the UI ("Re-load after refresh").
- All effects are guitar-signal-only; no changes to vocal path.
