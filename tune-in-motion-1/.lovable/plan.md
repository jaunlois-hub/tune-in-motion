

## Add Note Playback, Circle of Fifths, Rhythm Samples, Riffs/Licks & Scales

### Overview
Four new features added to the Practice section as additional tabs, plus a "tune by ear" note player in the Tuner section.

---

### 1. Note Playback in Tuner ("Tune by Ear")
**File: `src/components/StringIndicator.tsx`** — Already plays reference tones per string. Enhancement:
- Add a "By Ear" toggle that plays a note for 2 seconds, then stops, so the user tunes by matching pitch from memory
- Add a "Play All" button that sweeps through strings low-to-high with 3s gaps

**File: `src/hooks/useReferenceTone.ts`** — Add a `playForDuration(freq, ms)` method that auto-stops after the given duration.

### 2. Circle of Fifths with Progressions
**New file: `src/components/practice/CircleOfFifths.tsx`**
- Interactive SVG circle showing all 12 keys with major/minor relationships
- Click a key to set it as root; highlights relative minor, dominant, subdominant
- Built-in popular progressions per key:
  - I-IV-V-I, I-V-vi-IV, ii-V-I, I-vi-IV-V, 12-bar blues
  - vi-IV-I-V (pop), I-IV-vi-V, iii-vi-ii-V (jazz)
- "Play" button plays the chord tones as arpeggiated synth sounds using the existing `useReferenceTone` pattern (oscillator per note)
- Each chord shows its `ChordDiagram` on tap

### 3. Rhythm Samples to Practice
**New file: `src/components/practice/RhythmPatterns.tsx`**
- Curated rhythm patterns synthesized via Web Audio (kick, snare, hi-hat using the existing drum synth from `useSmartDrummer`):
  - Basic Rock, Shuffle Blues, Funk 16th, Reggae Skank, Bossa Nova, Jazz Swing, Punk Fast 4, Metal Double Kick, Country Train, Hip-Hop Boom Bap
- Each pattern has: name, time signature, BPM range, visual beat grid
- Play/Stop with adjustable tempo
- Uses the existing `useBpmSync` store for tempo coordination

### 4. Guitar Riffs, Licks & Scales
**New file: `src/components/practice/RiffsAndScales.tsx`**
- Two sub-tabs: "Riffs & Licks" and "Scales"

**Riffs & Licks:**
- Curated list of iconic riff patterns with tablature notation displayed as a simple text-based tab grid:
  - Smoke on the Water, Iron Man, Seven Nation Army, Sunshine of Your Love, Back in Black, Enter Sandman, Sweet Child O' Mine, Purple Haze, Day Tripper, Come As You Are, Crazy Train, Walk This Way
- Each shows: tab notation, suggested BPM, difficulty level
- "Play" button synthesizes the notes using oscillators at the correct frequencies and timing
- Slow-down control (50%-100% speed)

**Scales:**
- Common scales with fretboard visualization:
  - Minor Pentatonic, Major Pentatonic, Natural Minor, Major, Blues, Dorian, Mixolydian, Harmonic Minor, Phrygian
- Select root note (C through B) — generates the scale degrees and fret positions
- Visual fretboard diagram showing dot positions across 12 frets
- "Play Scale" button plays ascending/descending notes
- Shows interval formula (e.g., W-W-H-W-W-W-H)

### 5. Practice Section Update
**File: `src/components/sections/PracticeSection.tsx`**
- Add 3 new tabs: "Circle of 5ths", "Rhythms", "Riffs & Scales"
- Tab bar wraps on mobile (flex-wrap)

---

### Files to Create
1. `src/components/practice/CircleOfFifths.tsx` — Interactive circle + progressions + chord playback
2. `src/components/practice/RhythmPatterns.tsx` — Drum pattern player with beat grid UI
3. `src/components/practice/RiffsAndScales.tsx` — Tab viewer + scale fretboard + audio playback
4. `src/lib/musicTheory.ts` — Data file with scale formulas, chord-in-key mappings, riff tab data

### Files to Edit
1. `src/hooks/useReferenceTone.ts` — Add `playForDuration()` method
2. `src/components/StringIndicator.tsx` — Add "By Ear" mode toggle
3. `src/components/sections/PracticeSection.tsx` — Add 3 new tabs

### Technical Details
- All audio synthesis uses Web Audio API oscillators (no external samples needed)
- Drum sounds reuse the synth drum approach from `useSmartDrummer` (noise bursts for snare/hats, sine for kick)
- Riff playback schedules notes via `AudioContext.currentTime` offsets for tight timing
- Scale fretboard is an SVG with 6 strings x 12 frets, dots colored by interval degree
- Circle of fifths is an SVG with 12 wedges, inner ring for minor keys

