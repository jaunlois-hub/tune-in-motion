
## App Layout Reorganization

### Current Problem
- Studio section is a 772-line monolith mixing unrelated features
- Intonation and Setup Guide are separate sections but logically belong together
- Smart Drummer, Metronome, and Chord Recognition are scattered
- Navigation doesn't reflect logical workflow

### New Section Layout (top to bottom)

**1. 🎸 Tuner** — Always visible hero (unchanged)

**2. 🔧 Guitar Setup** — Single collapsible section combining:
- Intonation Checker
- Setup Guide (action, relief, radius, pickups, etc.)
- Tabs or sub-sections within one card

**3. 🎵 Practice** — New collapsible section combining:
- Metronome
- Smart Drummer  
- Chord Recognition
- These all relate to playing/practicing together

**4. 🎛️ Effects & Tones** — Collapsible section with:
- Guitar effects pedal board (knobs, categories)
- Quick presets + custom presets
- YouTube Tone Matcher
- Master volume/BPM controls

**5. 🎙️ Recording** — Collapsible section with:
- Loop Recorder
- Vocal Recorder

### Nav Updates
Header nav: `Tuner | Setup | Practice | Effects | Record`

### Benefits
- Logical workflow: tune → setup → practice → shape tone → record
- Studio monolith broken into 3 focused sections
- Related tools grouped together
- Fewer nav items, clearer mental model
