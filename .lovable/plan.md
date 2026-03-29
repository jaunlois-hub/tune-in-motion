

## Intonation Checker + Guitar Setup Guide

### Overview
Two new components: (1) a step-by-step **Intonation Checker** wizard that tests each string's intonation using the existing pitch detection, and (2) a **Guitar Setup Guide** with reference specs for action height, neck relief, fret radius, and more.

### Files to Create

**1. `src/components/IntonationChecker.tsx`**
- Step-by-step wizard: select a string → play Open → play 12th Harmonic → play 12th Fretted
- Reuses `usePitchDetection` hook for mic input
- Auto-locks reading after ~1.5s of stable pitch (clarity > 0.85)
- Calculates cents difference: `1200 * log2(frettedFreq / harmonicFreq)`
- Shows diagnosis per string:
  - Green (< ±2¢): "In tune"
  - Yellow (2-5¢): "Slightly off"
  - Red (> 5¢): "Needs adjustment"
- Provides saddle direction advice: sharp → move saddle back, flat → move forward
- Estimates adjustment distance (~1mm per 5¢)
- Summary table at bottom showing all 6 strings with color-coded pass/warn/fail
- Works with the currently selected tuning

**2. `src/components/GuitarSetupGuide.tsx`**
- Reference specifications in collapsible sections:
  - **String Action Height** — recommended heights at 12th fret by string (low E: 2.0mm, high E: 1.5mm for electric; higher for acoustic), measurement method
  - **Neck Relief** — how to check with capo + feeler gauge method, recommended gap (0.2-0.3mm at 7th-9th fret), truss rod adjustment direction
  - **Fretboard Radius** — common radii (7.25", 9.5", 12", 16", compound), how radius affects action and playability
  - **Pickup Height** — recommended distances by pickup type (single coil, humbucker, P90)
  - **Nut Slot Depth** — how to check, symptoms of too high/low
  - **Tremolo/Bridge Setup** — floating vs decked, spring tension
- Visual diagrams using simple ASCII/emoji illustrations
- Tips for common issues (buzzing, dead notes, intonation problems)

### Files to Update

**3. `src/pages/Index.tsx`**
- Add two new collapsible sections between Tuner and Metronome:
  - "🔧 Intonation Check" with `IntonationChecker`
  - "📐 Guitar Setup Guide" with `GuitarSetupGuide`
- Add nav items for both sections

### Technical Details
- Intonation checker manages its own `startListening`/`stopListening` lifecycle
- Each string's results stored in component state: `Record<number, { open, harmonic, fretted, centsOff }>`
- The guide is pure static content with collapsible sub-sections — no hooks needed

