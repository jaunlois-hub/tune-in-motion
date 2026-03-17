

## Smart Drummer - Follows Your Guitar Playing

### What It Does
A "Smart Drummer" that listens to your guitar via the microphone, detects your playing tempo in real-time using onset detection, and plays drum patterns that automatically follow your rhythm. Available both on the **Tuner tab** (compact widget) and in the **Studio tab** (full controls).

### How It Works

```text
Mic Input → Onset Detection (amplitude peaks) → Tempo Estimation (IOI averaging)
                                                       ↓
                                         Drum Pattern Playback (auto-adjusts BPM)
```

1. **Onset Detection**: Analyze the mic's audio buffer for transient peaks (sharp amplitude increases) using a simple energy-based onset detector with adaptive threshold.
2. **Tempo Tracking**: Measure Inter-Onset Intervals (IOIs), apply median filtering to reject outliers, and derive BPM. Smoothly interpolate BPM changes to avoid jarring tempo jumps.
3. **Pattern Selection**: Auto-select a fitting drum pattern based on detected tempo range (slow = blues shuffle, mid = rock, fast = punk/metal), or let the user pick manually.
4. **Drum Playback**: Reuse the existing `useDrumMachine` drum synthesis (kick, snare, hihat, etc.) with the synced BPM from the global `useBpmSync` store.

### Files to Create/Edit

**New: `src/hooks/useSmartDrummer.ts`**
- Onset detection algorithm using RMS energy comparison frame-by-frame
- Rolling IOI buffer with median filter for stable BPM estimation
- BPM smoothing (exponential moving average) to avoid jumps
- Auto-pattern selection logic based on tempo ranges
- Uses existing `useBpmSync` to sync BPM globally, and `useDrumMachine` internals for playback

**New: `src/components/SmartDrummer.tsx`**
- Compact mode (for Tuner tab): toggle button + current BPM display + pattern selector dropdown + volume slider
- Full mode (for Studio tab): all the above plus onset sensitivity slider, BPM lock toggle, visual beat indicator, and tempo history sparkline

**Edit: `src/components/GuitarTuner.tsx`**
- Add SmartDrummer compact widget below the tuning controls, so users can jam with drums while tuning/playing

**Edit: `src/components/studio/StudioView.tsx`**
- Add SmartDrummer as a new collapsible section (like the existing drum machine but with "follow" mode)

### Key Design Decisions
- Reuses the mic stream from `usePitchDetection` when available (tuner tab), or creates its own stream when used standalone (studio tab)
- BPM changes are rate-limited (max 2 updates/sec) and smoothed to prevent erratic tempo swings
- Users can "lock" the detected BPM if they want consistent playback after the drummer finds the tempo
- Sensitivity control lets users adjust how aggressively onsets are detected (for soft vs. hard playing styles)
- 6 auto-pattern ranges: Ballad (40-75), Blues (76-95), Rock (96-130), Punk (131-165), Metal (166-200), Blast (201+)

