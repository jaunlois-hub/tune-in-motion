# Bleed Out Zone — UI/UX & Library Extraction Plan

> Produced by a 13-agent audit workflow (8 parallel auditors → synthesis → 3 adversarial
> critics → consolidation). All claims were re-verified against the working tree on `develop`.
> P0 quick-wins from §4 have been applied on `feature/p0-ui-ux-quickwins`.

## Executive Summary

Bleed Out Zone is a single-page Vite + React 18 + TS + Tailwind + shadcn guitarist's toolkit, round-tripped through Lovable, with **no test runner**. The synthesis plan was directionally right but rested on two false premises that the critics demolished and that were re-verified against the working tree:

1. **TypeScript is strict, not loose.** `tsconfig.app.json` has `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`. Every "extractions are cheap because the code is loosely typed" assumption is *inverted*: pulling DSP out of hook closures into exported functions will **force explicit boundary types** that currently infer from closure scope. "Move + export" is really "move + export + type."
2. **The build does not typecheck.** Scripts were only `dev / build / build:dev / lint / preview`. `vite build` uses esbuild/SWC and never runs `tsc`. The plan's primary safety net (`bun run build`) catches **zero type/wiring regressions**. **The very first action is to add a `typecheck` script** — a free, instantly-available gate (done in P0).

Three further corrections folded in:
- **The `@boz/*` monorepo is dropped.** No `workspaces` field, no `packages/` dir. All three critics independently flagged the 8-package npm-workspace blueprint as over-engineering that fights Lovable. We keep the **identical acyclic layering as plain in-repo folders** behind `@/` aliases — every de-dup and testability benefit, zero build-system migration.
- **The "no app component layer" claim was false.** `src/components/` has 9 subdirs + 23 root components. The problem is a **flat, unstructured ~30-component layer**, not an absent one.
- **A real buried cycle exists:** `sharedAudioContext.ts` imports `registerAudioContext` from the `useAudioDevices` *hook* and `installDiagnostics` from `audioDiagnostics.ts` (which uses zustand `create()`). The "engine core" depends *upward* on Tier-1 today. The context/devices/diagnostics/masterBus extraction must be **one atomic commit**, not a later cleanup.

Highest-leverage moves: delete the 861-line dead `StudioView.tsx`, fix the A4 dead-knob, centralize the AudioContext through a provider (8 verified bypass sites vs Chrome's ~6-context cap), re-cut nav into the guitarist's five verbs, and lift DSP into a framework-agnostic `src/audio/` engine — done **last**, behind frozen hook signatures, with Vitest wired first. Per the UX critic, **elevate the tuner to omnipresent** (not just "demote from first viewport"), add **latency/monitoring feedback** and a **one-gesture audio-resume prompt**, and put **primary mobile controls in the thumb zone**.

Effort: P0 ≈ 1–2 days, P1 ≈ 1–2 weeks, P2 (engine) ≈ the bulk and the real risk.

---

## 1. Menu & Information Architecture (before → after)

### Verified problems
- **Label drift.** `NAV_GROUPS` (`Index.tsx:24-29`) labels `tune/setup/play/studio`; section bodies rename them (`"Setup & Reference"` `:122`, `"Play"`, `"Studio"` `:176`). (Note: 4 nav items map to 4 groups — an earlier audit's "4-vs-5" count was wrong; the real defect is drift, not count.)
- **4 levels deep, ~30 leaves.** group → `SectionGroup` → `SectionCard` (`defaultOpen=false`) → in-card tabs. Speed Trainer = 3 clicks.
- **Three tab idioms** (pill strips, shadcn `Collapsible`, chip rows) inline with drifting padding.
- **Zero deep-linking.** `react-router` is wired but only `/` and `*`; nav is `getElementById().scrollIntoView` (`Index.tsx:31-33`). Back/Forward dead, reload resets, nothing bookmarkable.
- **Drums duplicated** across Play (`SmartDrummer`) and Studio (`useDrumMachine`/`EffectsSection`).
- **Always-open tuner** owns the first viewport (`Index.tsx:102-119`).
- **Mobile drawer** is `grid-cols-2` of the same labels, no active state, no second level.

### Decision: hash-synced sections (P1); real nested routes DROPPED
All three critics flagged nested routes as change-for-its-own-sake — hash-sync already delivers bookmarking + Back/Forward + shareable links, the correct ceiling for a single-page Lovable tool. Build one `useSyncedView` hook over the URL hash (`#practice/speed-trainer`): reads on mount, `history.replaceState`s on change, drives active section + secondary tab + auto-expand. Keep `scrollIntoView` but `behavior: prefersReduced ? 'auto' : 'smooth'` with focus moved to target. **No router tree** — Lovable won't fight it.

### Re-cut ~20 features into 5 intent groups (the guitarist's verbs)

| Group | Secondary items (one tab row) | Pulled from |
|---|---|---|
| **Tune** | Strobe · Needle · Reference Tones | `GuitarTuner`, `ReferenceTonePlayer` |
| **Setup** | Intonation · Action/Relief/Radius · Anatomy (2D + 3D) | `SetupSection`, `StratAnatomy3D`, `SketchfabStratViewer` |
| **Practice** | Metro · Drummer · Rhythm · Jam · Speed · Circle · Riffs · Interval · Chords · Transpose · Modes · Tension | `PracticeSection` + `IntervalTrainer` + `ChordLibrary` + `UtilitiesSection` |
| **Tone** | Rack · Presets · Cabinet · ToneMatch · Progression *(drums removed)* | `EffectsSection` (de-duped) |
| **Record** | Loops · Vocals | `RecordingSection` |

Flatten to **two levels max**. Drums get **one** home (Practice) via `useBpmSync` — **verify the in-rack drum-sequencer BPM-sync semantics match before removing it.**

### Tuner → omnipresent, not just demoted
A **persistent mini-tuner that stays listening across all sections** — docked in the sticky header on desktop, a floating bottom dock on mobile (thumb zone). Shows note/cents/signal-present; full tuner remains the body of `/tune`. Add **trust signals** (needle settles → confirmed green, signal-present indicator).

```
BEFORE: [Tune][Setup][Play][Studio]  (4 nav, drifted labels, always-open tuner owns
        viewport, nothing in URL, Back = no-op, drums in 2 places)

AFTER:  header[ ⚡BOZ ·E2 +3¢♯ docked mini-tuner listens everywhere· Tune Setup Practice Tone Record ]
  /tune      Strobe | Needle | Reference
  /setup     Intonation | Action | Anatomy(2D+3D)
  /practice  Metro|Drummer|Rhythm|Jam|Speed|Circle|Riffs|Interval|Chords|Transpose|Modes|Tension
  /tone      Rack | Presets | Cabinet | ToneMatch | Progression   (drums → Practice via useBpmSync)
  /record    Loops | Vocals
  → shareable #practice/speed-trainer · Back/Forward work · mobile primary actions in thumb-zone bar
  NO nested router tree — hash sync only (Lovable-safe)
```

---

## 2. Component Structure Refactor

The component layer **exists but is flat** (23 root `.tsx` + 9 subdirs). The task is **subfoldering + decomposition + shared-control promotion**. Add `src/components/controls/`, `src/components/audio-ui/`, `src/components/tone/`, `src/components/utilities/`, `src/components/strat3d/`, `src/components/sections/registry.ts`.

### 2a. God-component decomposition

| Component | LOC | Decompose into | Notes |
|---|---|---|---|
| `studio/StudioView.tsx` | **861, DEAD** | **delete** ✅ done in P0 | Verified zero refs. Stale fork of EffectKnob/EFFECTS_BY_CATEGORY/QUICK_PRESETS/drum-seq. |
| `sections/UtilitiesSection.tsx` | 904 | tab shell + `utilities/{TransposerCapo,FretboardTrainer,ModesReference,ChordProgressionGen,StringTensionCalc}.tsx` | `IntervalEarTraining` duplicates `trainer/IntervalTrainer.tsx` → delete, render `<IntervalTrainer compact/>`. Move data → `lib/`. |
| `sections/EffectsSection.tsx` | 612 | `tone/EffectsRack.tsx` + `tone/{PresetLibrary,PresetCard,SavePresetDialog,MasterBpmBar}.tsx` | Keep EffectsSection's richer EffectKnob as canonical. Remove in-rack drum sequencer → Practice (verify semantics first). |
| `setup/StratSetupDiagram.tsx` | 844 | `lib/stratSpec.ts` + `lib/setupAnnotations.ts` + `lib/guitarGeometry.ts` + shell | One `stringDisplayRow` helper so 2D and 3D agree. |
| `StratAnatomy3D.tsx` | 837 | `strat3d/Stratocaster.tsx` + `strat3d/annotations.tsx`; keep only Canvas + controls | Shares `lib/stratSpec.ts`/`lib/guitarGeometry.ts`. |

### 2b. Shared-control promotions (P1-core — active divergence)

| Primitive | Replaces |
|---|---|
| `audio-ui/Knob.tsx` (canonical, `bipolar` flag — kills the `'bass'/'mid'/'treble'` substring sniff at `EffectsSection.tsx:24`) | `EffectsSection` knob (+ deleted `StudioView` fork — was defined 2×, drifted) |
| `controls/TabBar.tsx` (`variant=pill\|chip\|scroll`, cva) | 8 hand-rolled copies (Practice/Setup/Recording/Effects/Utilities/RiffsAndScales/IntervalTrainer/ChordLibrary) |
| `audio-ui/Fretboard.tsx` + pure `noteAtFret/stringDisplayRow` | 4-5 SVG fretboards |
| chord-data unification (move `CHORD_DIAGRAMS`/`CHORD_TEMPLATES` out of the hook `useChordDetection.ts:6,58`) | `ChordDiagram`, `ChordProgressionBuilder`, `ChordLibrary` |

**P1-tail (only if cheap):** `Chip`/`ChipGroup`, `NoteSelector`, `Meter` family, `ScoreBar`/`ChoiceGrid`/headless `useQuiz()`, `lib/format.ts`.

Standardize composition on `cn()` + `cva` so active-state styling stops drifting (28 files use raw template literals).

---

## 3. Library Extraction Blueprint

**No npm packages.** In-repo folders behind `@/` aliases, same acyclic discipline. Enforcement: **eslint-plugin-import `import/no-cycle` + `import/no-restricted-paths`** in `bun run lint`.

Two corrections that fix latent cycles:
- **`EffectSettings`/`EffectKey`/`CabinetType` go into a dedicated `audio/types.ts` leaf** (not `music-data`) — they are DSP-param types whose consumer is the engine. `tonePresets.ts` and `useGuitarEffects` both `import type` from it (inverts the real `tonePresets.ts:1` cycle).
- **`audio-engine` is a COMPOUND atomic extraction:** context + MasterBus + DeviceManager + Diagnostics + GraphInspector in one commit, all zustand `create()` replaced by plain `subscribe()/getSnapshot()`.

| Package (folder) | Purpose | Key modules | Depends on | FW-agnostic? | Public API highlights |
|---|---|---|---|---|---|
| **`lib/music-theory`** | One ET engine; A4 a param everywhere | `notes`, `frets`, `chords`, `scales`, `enharmonic` | — | ✅ | `frequencyToNote(freq,a4?)`, `noteToFrequency(midi,a4?)`, `nearestNote(freq,a4?)`, `buildChord(root,quality)` |
| **`lib/music-data`** | Static datasets, one module per corpus | `tunings`, `riffs`, `rhythms`, `progressions`, `chords` (canonical `CHORDS`), `songChords` | music-theory (types) | ✅ | `TUNINGS`, `CHORDS`, `RIFFS`, `PROGRESSIONS` |
| **`lib/text-match`** | Generic fuzzy title matching | `levenshtein`, `fuzzySimilarity`, `detectGenres`, `scoreCandidates` | — | ✅ | `scoreCandidates(title,cands,weights)` |
| **`audio/types`** | Shared DSP-param types (cycle-breaker) | `EffectSettings`, `EffectKey`, `CabinetType` | — | ✅ | `import type` only |
| **`audio/engine`** | Single-context Web Audio/DSP core; headless-testable vs `OfflineAudioContext` | `AudioEngine`, `MasterBus`, `DeviceManager`, `Ducking`, `Scheduler`, `dsp/{yin,chroma,onsetTracker,PitchSmoother}`, `synthesis/{drums,amp,pluckedString}`, `graph/{GuitarAmp,VocalEffects}`, `diagnostics/*` | music-theory, audio/types | ✅ (no React/zustand) | `engine.pitch.analyze(buf,a4)`, `engine.guitarAmp(src,dst).setParams(s)`, `engine.diagnostics.panicStopAll()` |
| **`audio/transcription`** | Heavyweight basic-pitch/TFJS, separately importable | `transcription` (injected `MODEL_URL`, dynamic import) | basic-pitch, tfjs | ✅ | `transcribe(buffer,{modelUrl})` — NOT in engine core |
| **`audio/react`** | Thin hooks; same names + return shapes | rewrites of all audio hooks; zustand bridges; `useAudioDiagnostics` via `useSyncExternalStore` | engine, transcription, music-data, audio/types | ❌ React | unchanged hook surface |
| **`design-tokens`** | Color (semantic+status+tuner), micro-type, glow, motion | `index.css` vars, `tailwind.config.ts` (`text-2xs`, `shadow-glow-*`), `lib/motion.ts` | — | ✅ | `--success/--warning/--info`, `text-2xs`, `shadow-glow-primary` |
| **`a11y`** | matchMedia/ARIA prims | `useReducedMotion` ✅, `useRafLoop`, `LiveRegion/useAnnounce`, `SkipLink` ✅, `useScrollSpy` | — | ❌ React | `useReducedMotion()`, `useScrollSpy()` |
| **`components/ui`** | Generic IA + controls + pruned shadcn | `SectionCard/SectionGroup`, `TabBar`, `Chip`, `NoteSelector`, `registry`, curated shadcn | design-tokens | ❌ React | — |
| **`components/audio-ui`** | Props-only widgets (numbers, not AudioContext) | `Knob`, `Meter`, `Fretboard`, `StrobeWheel`, `NeedleTuner` | design-tokens, components/ui | ❌ React | numeric props only |

```
TIER 0  (pure leaves)
  music-theory   text-match   audio/types   design-tokens
      │                            │              │
      ▼                            │              │
  music-data                       │              │
      └──────────► audio/engine ◄──┘              │
                       │      │                    │
            audio/transcription│                   │
TIER 1                 ▼       ▼                    ▼
            audio/react      a11y          components/ui
                  │                              ▼
                  │                      components/audio-ui
TIER 2            ▼                              ▼
        feature components (sections/, tone/, utilities/, strat3d/…)
   edges point down only · audio/types is import-type-only · enforced by import/no-cycle
```

**TFJS split:** `@spotify/basic-pitch` + `@tensorflow/tfjs` are MBs; carve `audio/transcription` to a dynamic-import boundary so the tuner-only path stays TFJS-free.

---

## 4. Phased Roadmap

Every phase gated by **`bun run typecheck` + `bun run lint` + `bun run build` + manual `bun run dev` mic exercise**. Hook names/return shapes stay frozen.

### P0 — Quick wins (~1–2 days) — ✅ APPLIED on `feature/p0-ui-ux-quickwins`
| Task | Status |
|---|---|
| Add `typecheck` script | ✅ |
| Delete dead `StudioView.tsx` + fix CLAUDE.md doc row | ✅ |
| Fix A4 dead-knob (`usePitchDetection(a4)` → `frequencyToNote(freq, a4)`, live via ref) | ✅ |
| Token-ize dead-teal `rgba()` glows in `GuitarTuner` | ✅ |
| `prefers-reduced-motion` CSS reset + `useReducedMotion` hook + StrobeWheel rotation gate | ✅ |
| SkipLink + drawer `aria-expanded`/`aria-controls` + `#main-content` | ✅ |

**Deferred from P0 (Lovable-gated):** pruning ~30 unused shadcn primitives, `App.css`, `ui/sidebar.tsx` — requires a Lovable revert-test on a throwaway branch first (`.lovable/plan.md` + `lovable-tagger` confirm active round-tripping).

**Reclassified to P2:** master-volume routing (`useDrumMachine.ts:434` defensible; `useVocalRecorder.ts:634` is the live self-monitor — confirm UX before touching). Audio-resume / mic-permission first-gesture prompt → P2 (stub in P1 if cheap).

### P1 — Structural (~1–2 weeks, sequenced)
1. **Tokens first** (status/glow/micro-type/motion scales), then migrate hardcoded values per-section (bisectable diffs).
2. **`lib/` consolidation** (`music-theory` + `music-data` + `text-match` + `audio/types`): de-dup the 5+ `440*2^((m-69)/12)` copies; invert `tonePresets.ts:1`; promote `CHORD_*` out of `useChordDetection.ts`. Budget for strict-mode boundary types.
3. **Shared controls P1-core** (`Knob`/`TabBar`/`Fretboard` + chord-data unification), swap call sites one file at a time.
4. **God-component decomposition** (Utilities, Effects→EffectsRack, Strat 2D/3D split).
5. **IA registry + hash sync** (`useSyncedView`, `a11y`): generate nav from one `SECTIONS` array; re-cut to 5 verbs; 2 levels; omnipresent mini-tuner; mobile thumb-bar; `useScrollSpy`→`aria-current`. **No nested router.**
6. **Latency feedback** (`AudioContext.baseLatency + outputLatency`).
7. **Quick tone/tuning recall** (recents + favorites + A/B; persistence already exists).

### P2 — Extraction (highest risk, last, behind frozen interfaces)
1. **Wire Vitest first.** Test pure DSP against `OfflineAudioContext`.
2. **`audio/engine` COMPOUND atomic extraction** (context + MasterBus + DeviceManager + Diagnostics + GraphInspector, one commit; zustand→`subscribe/getSnapshot`). Partly a rewrite of the state/lifecycle layer — the bulk of the project.
3. **Migrate the 8 `new AudioContext()` bypass sites one at a time, tuner-first** (`usePitchDetection.ts:220`, `useChordDetection.ts:227`, `useAudioMonitoring.ts:42`, `useGuitarEffects.ts:344`, `useVocalRecorder.ts:84`, `InputLevelMeter.tsx:44`, `YouTubeToTab.tsx:143`, `audioToTab.ts:34`), each behind typecheck + Vitest + a manual latency/x-run checklist. Fold in master-bus routing + audio-resume prompt.
4. **`audio/transcription`** carved out so TFJS stays off the tuner path.
5. **`audio/react`** adapter rewrite — same hook names/shapes.

---

## 5. Risks & Guardrails

- **No test runner + non-typechecking build = oversized regression surface.** `typecheck` lands first (done) and gates every step; `vite build` is a bundling check only. Vitest mandatory before P2.
- **Strict-mode boundary explosion.** Extracting closure-scoped DSP forces dozens of new explicit types; only `tsc` flags them. Re-scope every "move + export" to "move + export + type."
- **Don't regress audio.** Unifying schedulers, collapsing to one AudioContext, re-routing through MasterBus can shift timing/gain/latency with no automated detection — the 6-context distortion and a refactor gain bug *sound identical*. Capture a per-feature reference recording + commit checkpoint before touching each feature; manual listening checklist per swap; tuner-first.
- **Master-bus re-routing can change behaviour the user didn't ask for** (esp. the vocal self-monitor). Confirm intended UX first.
- **Lovable round-trip.** Riskiest moves (deleting ~30 `ui/` primitives, folder moves, CLAUDE.md edits) are exactly what Lovable may revert/duplicate. Throwaway-branch revert test before any structural move; no real packages, no router tree, no shell rewrite. Deleting dead StudioView is the durable doc fix.
- **DAG degradation on AI edits.** A single Vite app has no real package isolation; add `eslint-plugin-import` `import/no-cycle` + `import/no-restricted-paths` so "acyclic" is mechanically enforced.
- **Bundle:** 4.1MB single chunk. Keep `music-data` per-corpus, carve `audio/transcription` to dynamic import, avoid mega-barrels.
- **Over-engineering watch.** The 8-package monorepo and nested router were dropped. The felt guitarist wins — tuner ubiquity, latency feedback, fast recall, thumb-zone controls, audio-resume prompt — must not be deprioritized behind extraction.

### Key files for the engineer
A4 bug `usePitchDetection.ts` + `GuitarTuner.tsx`; buried cycle `lib/sharedAudioContext.ts:11-13` + `lib/audioDiagnostics.ts:15` + `useReferenceTone.ts:4` + `useChordDetection.ts:2`; inverted dep `lib/tonePresets.ts:1`; chord-data-in-hook `useChordDetection.ts:6,58`; routing `useDrumMachine.ts:434` + `useVocalRecorder.ts:634`; duplicated knob `EffectsSection.tsx:24`; nav `Index.tsx:24-33`; TFJS deps `package.json`; Lovable artifacts `.lovable/plan.md` + `FOLLOW-UPS.md`.
