# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**BLEED OUT ZONE** (branded name in `src/pages/Index.tsx`) is a browser-based guitar tuner + practice/effects/recording suite. It is a single-page Vite + React 18 + TypeScript app, styled with Tailwind + shadcn-ui, and generated/maintained via [Lovable](https://lovable.dev) (see `.lovable/plan.md` and the `lovable-tagger` Vite plugin).

All audio is synthesized/analyzed in the browser via the Web Audio API — there is **no backend, no database, no external API**. Microphone access is required for the tuner, intonation checker, chord recognition, and loop recorder.

## Commands

Package manager: **Bun** is used (`bun.lock`, `bun.lockb` committed) but npm also works (`package-lock.json` is tracked too).

```sh
bun install              # or: npm i
bun run dev              # Vite dev server on http://localhost:8080 (see vite.config.ts — host "::")
bun run build            # Production build → dist/
bun run build:dev        # Development-mode build (keeps lovable-tagger)
bun run lint             # ESLint over the repo
bun run preview          # Preview a production build
```

There is **no test runner configured** — no Jest/Vitest/Playwright. Do not invent test commands; if asked to add tests, wire up Vitest first.

## Deployment

- **Lovable** is the canonical host. `README.md` documents "Share → Publish" from the Lovable project UI. Changes pushed to this repo sync into Lovable; edits made inside Lovable commit back here.
- The app is pure static output from `vite build`, so it can also be served from any static host (Netlify, Vercel, S3, etc.) without modification.
- `lovable-tagger` runs only in development mode (`vite.config.ts:12`) — it injects component source annotations for Lovable's visual editor and is stripped from production bundles.

## Architecture

### Page shell
Single route app. `src/App.tsx` wires:
- `QueryClientProvider` (React Query — currently unused by any hook, kept in case features land)
- `ThemeProvider` (`next-themes`, defaults to dark)
- `BrowserRouter` with only `/` → `pages/Index.tsx` and `*` → `NotFound.tsx`
- `Toaster` (shadcn) and `Sonner` side-by-side

`src/pages/Index.tsx` is the entire UX: a sticky header, then five collapsible sections rendered top-to-bottom. The tuner is always visible; every other section is a shadcn `Collapsible`.

### The five sections
Each is a thin wrapper in `src/components/sections/` that composes lower-level feature components:

| Section | File | Composes |
|---|---|---|
| Tuner (always open) | `components/GuitarTuner.tsx` | `StrobeWheel`, `NeedleTuner`, `NoteDisplay`, `CentsMeter`, `TuningSelector`, `StringIndicator`, `FrequencyDisplay`, `A4Calibration`, `SignalStrength`, `TuningHistoryPanel` |
| Setup | `sections/SetupSection.tsx` | `IntonationChecker`, `GuitarSetupGuide` (tabbed) |
| Practice | `sections/PracticeSection.tsx` | `MetronomeView`, `SmartDrummer`, `ChordRecognitionView`, `CircleOfFifths`, `RhythmPatterns`, `RiffsAndScales`, `SpeedTrainer`, `JamSession` |
| Effects | `sections/EffectsSection.tsx` | `StudioView`, `ChordProgressionBuilder`, `YouTubeToneMatcher`, etc. |
| Recording | `sections/RecordingSection.tsx` | `VocalRecorderView`, loop recorder UI |

### Audio pipeline (the core of the app)

The interesting architecture lives entirely in `src/hooks/`. Each hook owns its own `AudioContext` / `AnalyserNode` / `MediaStream` refs and cleans them up on unmount. There is no shared audio graph — hooks are independent.

- **`usePitchDetection.ts`** — heart of the tuner. Runs a YIN-inspired algorithm (cumulative mean normalized difference + parabolic interpolation) on a 8192-sample buffer at the device sample rate. Post-processing chain: RMS gate → median filter (HISTORY_SIZE=10, rejects readings >3% off median) → exponential moving average (α=0.25) → 2-read note-change hysteresis → 15-frame silence decay. Returns `{ frequency, note, octave, cents, clarity }`. Tune these constants carefully — they are the result of stability tuning and affect the "feel" of the tuner.
- **`useReferenceTone.ts`** — plays sine oscillator tones for ear-training / string reference. Exposes `toggle`, `stop`, `playForDuration`.
- **`useMetronome.ts`, `useDrumMachine.ts`, `useSmartDrummer.ts`** — scheduled percussion via `AudioContext.currentTime` offsets. Drum sounds are synthesized (sine kick, noise-burst snare/hats), **no samples are shipped**.
- **`useBpmSync.ts`** — Zustand store that broadcasts BPM between the metronome, smart drummer, rhythm patterns, and jam session so they stay locked together.
- **`useLoopRecorder.ts`, `useVocalRecorder.ts`** — `MediaRecorder` over the mic stream.
- **`useChordDetection.ts`** — real-time chord recognition from harmonic content.
- **`useGuitarEffects.ts`** — Web Audio effect chain (distortion/delay/etc.) via native nodes.
- **`useAudioMonitoring.ts`** — routes the mic back through an output gain so the user can hear themselves.
- **`useTuningHistory.ts`, `useCustomPresets.ts`** — localStorage-backed persistence.

Note: multiple hooks may each open their own `AudioContext`. Browsers cap this (~6 on Chrome). If you add a new feature that allocates a context, consider whether it can piggyback on an existing hook instead.

### Data & music theory
`src/lib/` holds all static data — no runtime fetching.
- `tunings.ts` — 30+ tunings (guitar / bass / uke / banjo / mandolin / violin / 7-string / 12-string) with per-string frequencies precomputed at A=440. `findClosestNote()` is the main consumer.
- `musicTheory.ts` — scale formulas, chord-in-key tables, riff tab data used by `CircleOfFifths`, `RiffsAndScales`.
- `tonePresets.ts` — effect chain presets for the studio view.

### UI conventions
- shadcn-ui (`src/components/ui/*`, ~49 primitives) is wired via `components.json` with `style: default`, CSS variables, `@/` alias.
- Fonts: **Orbitron** for display (`font-display`), **JetBrains Mono** for body. Both loaded from Google Fonts in `src/index.css`.
- Dark mode is the default (`App.tsx`) and most tuner visuals assume dark; always verify both themes when touching color-dependent components.
- Tuner-specific HSL tokens (`--tuner-flat`, `--tuner-sharp`, `--tuner-perfect`, `--tuner-glow`, `--tuner-strobe`) are defined in `index.css` and exposed via `tailwind.config.ts` as `bg-tuner-*` / `text-tuner-*`.

### TypeScript looseness
`tsconfig.json` intentionally disables `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, and `noUnusedParameters`. ESLint also has `@typescript-eslint/no-unused-vars: off`. Don't fight this — match the surrounding style. If you want stricter checks on new code, scope them locally; don't flip the global flags without user approval.

### Path alias
`@/` → `src/` in both `tsconfig.json` and `vite.config.ts`. Always use `@/components/...`, `@/hooks/...`, `@/lib/...` in imports — it keeps the Lovable tooling happy.

## Testing changes

UI is the product. Type-check / lint passes are necessary but not sufficient — run `bun run dev`, open the browser, and actually exercise the feature (mic permission required for anything pitch-related). If you cannot test in a browser in the current environment, say so explicitly rather than claiming the change works.
