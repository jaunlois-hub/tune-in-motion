# Audio Diagnostics Panel v2

Restructure the floating diagnostics overlay so the most actionable info (live activity + frequency distribution) is glanceable, and add tools to capture evidence when the squelch hits.

## Goals
1. Cleaner, more scannable layout with clear visual hierarchy.
2. Auto-clear of recent frequency samples on a configurable timer.
3. One-click JSON snapshot export of the current diagnostic state.

## UI restructure (`AudioDiagnosticsPanel.tsx`)

New layout, top → bottom:

```text
┌─ Header ───────────────────────────────┐
│ ● AUDIO DIAGNOSTICS    [snapshot] [×] │
├─ Status strip (compact, 1 row) ───────┤
│ ctx:running  44.1k  live:3  ⚠2≥4kHz   │
├─ Tabs ────────────────────────────────┤
│ [ Activity ] [ Frequencies ] [ Sources ]
├─ Tab content (scrolls) ───────────────┤
│ …per-tab content…                     │
├─ Auto-clear controls ─────────────────┤
│ Auto-clear: [Off|5s|15s|60s]  next 12s│
├─ Footer actions ──────────────────────┤
│ [PANIC STOP]   [Reset]   [Clear freqs]│
└───────────────────────────────────────┘
```

- **Header**: title + snapshot (download icon) + close. Snapshot button is always visible (primary debugging affordance).
- **Status strip**: single dense row replacing the 3-column grid; includes a danger badge when high-freq sources are active.
- **Tabs** (shadcn `Tabs`):
  - *Activity* — the per-feature table (live/total/age).
  - *Frequencies* — histogram + top-5 list (current `FrequencyHistogramSection`, restyled to fill the tab).
  - *Sources* — live source list (no longer collapsible, fills the tab).
- **Footer**: three actions on one row; PANIC remains the destructive emphasis.

Widen panel to 400px and let tab content scroll inside a fixed-height region so the footer never moves.

## Auto-clear timer

State held in the panel component:
- `autoClearMs: 0 | 5000 | 15000 | 60000` (0 = off), persisted in `localStorage` under `audio-diag.autoClear`.
- When >0, run a `setInterval` that calls `clearRecentFrequencies()` every N ms and updates a `nextClearAt` timestamp shown as a small countdown ("next 12s").
- Cleared on unmount / when set back to Off.

Only the recent-frequency buffer is auto-cleared. Counters and live sources are untouched (live sources self-clean via `onended`).

## JSON snapshot export

Add `exportDiagnosticsSnapshot()` to `audioDiagnostics.ts`:

```ts
export interface DiagnosticsSnapshot {
  capturedAt: string;        // ISO
  ctxState: string;
  sampleRate: number;
  liveSources: Array<{ id; feature; kind; freq?; ageMs }>;
  features: FeatureStat[];
  recentFreqs: FreqSample[];
  histogram: HistogramBin[];
  topFrequencies: ReturnType<typeof getTopFrequencies>;
  userAgent: string;
}
export function buildDiagnosticsSnapshot(): DiagnosticsSnapshot;
```

Panel's snapshot button:
- Builds the snapshot, serializes with `JSON.stringify(snap, null, 2)`.
- Triggers a download as `audio-diagnostics-<ISO>.json` via a Blob + `<a download>` click.
- Also copies to clipboard (best-effort) and toasts "Snapshot saved" via `sonner` if available, else `console.info`.

## Files

- **Edit** `src/lib/audioDiagnostics.ts` — add `buildDiagnosticsSnapshot()` + `DiagnosticsSnapshot` type.
- **Rewrite** `src/components/diagnostics/AudioDiagnosticsPanel.tsx` — new tabbed layout, auto-clear controls, snapshot download button. Reuses existing store/selectors; no behavior change to tracking layer.

## Out of scope

- No changes to instrumentation, `sharedAudioContext`, or any feature audio code.
- No server upload of snapshots — local download only.
- No persistence of the snapshot list; each export is a one-shot file.
