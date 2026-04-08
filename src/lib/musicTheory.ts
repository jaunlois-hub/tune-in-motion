// ===== Music Theory Data =====

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTE_NAMES[number];

// Frequencies for notes (octave 4)
export const NOTE_FREQUENCIES: Record<string, number> = {
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
  'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.26, 'F5': 698.46,
  'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
};

// ===== Circle of Fifths =====
export const CIRCLE_OF_FIFTHS_MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'] as const;
export const CIRCLE_OF_FIFTHS_MINOR = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'] as const;

// Enharmonic mapping for display
export const ENHARMONIC_MAP: Record<string, string> = {
  'Db': 'C#', 'Ab': 'G#', 'Eb': 'D#', 'Bb': 'A#', 'Bbm': 'A#m',
};

// Chord tones (semitones from root) for synthesis
export const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
};

// Roman numeral progressions
export interface Progression {
  name: string;
  numerals: string[];
  quality: ('major' | 'minor' | 'dom7' | 'min7' | 'maj7' | 'dim')[];
  degrees: number[]; // semitones from root
}

export const PROGRESSIONS: Progression[] = [
  { name: 'I-IV-V-I (Classic)', numerals: ['I', 'IV', 'V', 'I'], quality: ['major', 'major', 'major', 'major'], degrees: [0, 5, 7, 0] },
  { name: 'I-V-vi-IV (Pop)', numerals: ['I', 'V', 'vi', 'IV'], quality: ['major', 'major', 'minor', 'major'], degrees: [0, 7, 9, 5] },
  { name: 'ii-V-I (Jazz)', numerals: ['ii', 'V', 'I'], quality: ['min7', 'dom7', 'maj7'], degrees: [2, 7, 0] },
  { name: 'I-vi-IV-V (50s)', numerals: ['I', 'vi', 'IV', 'V'], quality: ['major', 'minor', 'major', 'major'], degrees: [0, 9, 5, 7] },
  { name: 'vi-IV-I-V (Modern Pop)', numerals: ['vi', 'IV', 'I', 'V'], quality: ['minor', 'major', 'major', 'major'], degrees: [9, 5, 0, 7] },
  { name: 'I-IV-vi-V', numerals: ['I', 'IV', 'vi', 'V'], quality: ['major', 'major', 'minor', 'major'], degrees: [0, 5, 9, 7] },
  { name: 'iii-vi-ii-V (Jazz Turnaround)', numerals: ['iii', 'vi', 'ii', 'V'], quality: ['min7', 'min7', 'min7', 'dom7'], degrees: [4, 9, 2, 7] },
  { name: '12-Bar Blues', numerals: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'], quality: ['dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7'], degrees: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7] },
];

export function getChordName(rootNote: string, degree: number, quality: string): string {
  const rootIdx = NOTE_NAMES.indexOf(rootNote.replace('b', '#') as NoteName);
  const idx = rootIdx >= 0 ? rootIdx : NOTE_NAMES.indexOf(ENHARMONIC_MAP[rootNote] as NoteName || rootNote as NoteName);
  const noteIdx = (idx + degree) % 12;
  const note = NOTE_NAMES[noteIdx];
  const suffix = quality === 'minor' ? 'm' : quality === 'dom7' ? '7' : quality === 'min7' ? 'm7' : quality === 'maj7' ? 'maj7' : quality === 'dim' ? 'dim' : '';
  return `${note}${suffix}`;
}

export function getChordFrequencies(rootNote: string, octave: number, degree: number, quality: string): number[] {
  const rootIdx = NOTE_NAMES.indexOf(rootNote as NoteName) >= 0
    ? NOTE_NAMES.indexOf(rootNote as NoteName)
    : NOTE_NAMES.indexOf((ENHARMONIC_MAP[rootNote] || rootNote) as NoteName);
  const baseMidi = 12 * (octave + 1) + rootIdx + degree;
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS.major;
  return intervals.map(i => 440 * Math.pow(2, (baseMidi + i - 69) / 12));
}

// ===== Scales =====
export interface ScaleDefinition {
  name: string;
  intervals: number[]; // semitone pattern from root
  formula: string;
}

export const SCALES: ScaleDefinition[] = [
  { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], formula: '1-♭3-4-5-♭7' },
  { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], formula: '1-2-3-5-6' },
  { name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10], formula: 'W-H-W-W-H-W-W' },
  { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], formula: 'W-W-H-W-W-W-H' },
  { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], formula: '1-♭3-4-♭5-5-♭7' },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], formula: 'W-H-W-W-W-H-W' },
  { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], formula: 'W-W-H-W-W-H-W' },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], formula: 'W-H-W-W-H-W½-H' },
  { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], formula: 'H-W-W-W-H-W-W' },
];

// Standard tuning: string open notes as semitone offsets from C
const STANDARD_TUNING_SEMITONES = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4

export function getScaleFretPositions(rootNote: NoteName, scale: ScaleDefinition): { string: number; fret: number; degree: number }[] {
  const rootIdx = NOTE_NAMES.indexOf(rootNote);
  const positions: { string: number; fret: number; degree: number }[] = [];

  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= 15; f++) {
      const semitone = (STANDARD_TUNING_SEMITONES[s] + f) % 12;
      const interval = (semitone - rootIdx + 12) % 12;
      const degreeIdx = scale.intervals.indexOf(interval);
      if (degreeIdx !== -1) {
        positions.push({ string: s, fret: f, degree: degreeIdx });
      }
    }
  }
  return positions;
}

// ===== Riffs & Licks =====
export interface RiffNote {
  string: number; // 0-5 (low E to high E)
  fret: number;
  duration: number; // beats
}

export interface Riff {
  name: string;
  artist: string;
  bpm: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tab: string; // text-based tab
  notes: RiffNote[]; // for playback
}

export const RIFFS: Riff[] = [
  {
    name: 'Smoke on the Water',
    artist: 'Deep Purple',
    bpm: 112,
    difficulty: 'Easy',
    tab: `e|-------------------|
B|-------------------|
G|--0-3-5--0-3-6-5---|
D|--0-3-5--0-3-6-5---|
A|-------------------|
E|-------------------|`,
    notes: [
      { string: 2, fret: 0, duration: 1 }, { string: 2, fret: 3, duration: 1 }, { string: 2, fret: 5, duration: 1.5 },
      { string: 2, fret: 0, duration: 1 }, { string: 2, fret: 3, duration: 1 }, { string: 2, fret: 6, duration: 0.5 }, { string: 2, fret: 5, duration: 1.5 },
    ],
  },
  {
    name: 'Seven Nation Army',
    artist: 'The White Stripes',
    bpm: 124,
    difficulty: 'Easy',
    tab: `e|-------------------|
B|-------------------|
G|-------------------|
D|-------------------|
A|--7-7-10-7-5-3-2---|
E|-------------------|`,
    notes: [
      { string: 4, fret: 7, duration: 1 }, { string: 4, fret: 7, duration: 0.5 }, { string: 4, fret: 10, duration: 1 },
      { string: 4, fret: 7, duration: 1 }, { string: 4, fret: 5, duration: 1 }, { string: 4, fret: 3, duration: 1 }, { string: 4, fret: 2, duration: 2 },
    ],
  },
  {
    name: 'Iron Man',
    artist: 'Black Sabbath',
    bpm: 76,
    difficulty: 'Easy',
    tab: `e|----------------------|
B|----------------------|
G|----------------------|
D|--2-5--5-7-7-5-5------|
A|--0-3--3-5-5-3-3------|
E|----------------------|`,
    notes: [
      { string: 3, fret: 2, duration: 1 }, { string: 3, fret: 5, duration: 2 }, { string: 3, fret: 5, duration: 0.5 },
      { string: 3, fret: 7, duration: 0.5 }, { string: 3, fret: 7, duration: 1 }, { string: 3, fret: 5, duration: 0.5 }, { string: 3, fret: 5, duration: 1.5 },
    ],
  },
  {
    name: 'Back in Black',
    artist: 'AC/DC',
    bpm: 92,
    difficulty: 'Medium',
    tab: `e|---------------------|
B|---------------------|
G|---------------------|
D|--0-2---0-2-0--------|
A|----------0-0-2------|
E|---------------------|`,
    notes: [
      { string: 3, fret: 0, duration: 0.5 }, { string: 3, fret: 2, duration: 1.5 }, { string: 3, fret: 0, duration: 0.5 },
      { string: 3, fret: 2, duration: 0.5 }, { string: 3, fret: 0, duration: 0.5 }, { string: 4, fret: 0, duration: 0.5 }, { string: 4, fret: 2, duration: 1.5 },
    ],
  },
  {
    name: 'Come As You Are',
    artist: 'Nirvana',
    bpm: 120,
    difficulty: 'Easy',
    tab: `e|-0-0-1-2-2-2-1-0-----|
B|---------------------|
G|---------------------|
D|---------------------|
A|---------------------|
E|---------------------|`,
    notes: [
      { string: 0, fret: 0, duration: 0.5 }, { string: 0, fret: 0, duration: 0.5 }, { string: 0, fret: 1, duration: 0.5 },
      { string: 0, fret: 2, duration: 0.5 }, { string: 0, fret: 2, duration: 0.5 }, { string: 0, fret: 2, duration: 0.5 },
      { string: 0, fret: 1, duration: 0.5 }, { string: 0, fret: 0, duration: 1 },
    ],
  },
  {
    name: 'Enter Sandman',
    artist: 'Metallica',
    bpm: 123,
    difficulty: 'Medium',
    tab: `e|---------------------|
B|---------------------|
G|---------------------|
D|---------------------|
A|---------------------|
E|--0-0-0-5-0-6-5------|`,
    notes: [
      { string: 5, fret: 0, duration: 0.5 }, { string: 5, fret: 0, duration: 0.5 }, { string: 5, fret: 0, duration: 0.5 },
      { string: 5, fret: 5, duration: 0.5 }, { string: 5, fret: 0, duration: 0.5 }, { string: 5, fret: 6, duration: 0.5 }, { string: 5, fret: 5, duration: 1.5 },
    ],
  },
  {
    name: 'Day Tripper',
    artist: 'The Beatles',
    bpm: 138,
    difficulty: 'Medium',
    tab: `e|---------------------|
B|---------------------|
G|---------2-0-2-------|
D|-----2-4-------------|
A|---------------------|
E|--0-0----------------|`,
    notes: [
      { string: 5, fret: 0, duration: 0.5 }, { string: 5, fret: 0, duration: 0.5 }, { string: 3, fret: 2, duration: 0.5 },
      { string: 3, fret: 4, duration: 0.5 }, { string: 2, fret: 2, duration: 0.5 }, { string: 2, fret: 0, duration: 0.5 }, { string: 2, fret: 2, duration: 1 },
    ],
  },
  {
    name: 'Sunshine of Your Love',
    artist: 'Cream',
    bpm: 112,
    difficulty: 'Medium',
    tab: `e|---------------------|
B|---------------------|
G|--12-12-11-----------|
D|--12-12-12-12-10-----|
A|--10-10-10-10-10-----|
E|---------------------|`,
    notes: [
      { string: 4, fret: 10, duration: 0.5 }, { string: 4, fret: 10, duration: 0.5 }, { string: 3, fret: 12, duration: 0.5 },
      { string: 3, fret: 12, duration: 0.75 }, { string: 3, fret: 10, duration: 1.5 },
    ],
  },
  {
    name: 'Purple Haze',
    artist: 'Jimi Hendrix',
    bpm: 109,
    difficulty: 'Hard',
    tab: `e|--0-3-4-0-3-4-0------|
B|---------------------|
G|---------------------|
D|---------------------|
A|---------------------|
E|---------------------|`,
    notes: [
      { string: 0, fret: 0, duration: 0.5 }, { string: 0, fret: 3, duration: 0.5 }, { string: 0, fret: 4, duration: 0.5 },
      { string: 0, fret: 0, duration: 0.5 }, { string: 0, fret: 3, duration: 0.5 }, { string: 0, fret: 4, duration: 0.5 },
      { string: 0, fret: 0, duration: 1 },
    ],
  },
  {
    name: 'Crazy Train',
    artist: 'Ozzy Osbourne',
    bpm: 138,
    difficulty: 'Hard',
    tab: `e|---------------------|
B|--9-12-11-12-9-12-11-|
G|---------------------|
D|---------------------|
A|---------------------|
E|---------------------|`,
    notes: [
      { string: 1, fret: 9, duration: 0.5 }, { string: 1, fret: 12, duration: 0.5 }, { string: 1, fret: 11, duration: 0.5 },
      { string: 1, fret: 12, duration: 0.5 }, { string: 1, fret: 9, duration: 0.5 }, { string: 1, fret: 12, duration: 0.5 },
      { string: 1, fret: 11, duration: 0.5 }, { string: 1, fret: 12, duration: 0.5 },
    ],
  },
  {
    name: 'Walk This Way',
    artist: 'Aerosmith',
    bpm: 112,
    difficulty: 'Hard',
    tab: `e|---------------------|
B|---------------------|
G|--2-2-4-2------------|
D|--2-2-4-2-2-4--------|
A|----------0-0-2-0----|
E|---------------------|`,
    notes: [
      { string: 2, fret: 2, duration: 0.5 }, { string: 2, fret: 2, duration: 0.5 }, { string: 2, fret: 4, duration: 0.5 },
      { string: 2, fret: 2, duration: 0.5 }, { string: 3, fret: 2, duration: 0.5 }, { string: 3, fret: 4, duration: 0.5 },
      { string: 4, fret: 0, duration: 0.5 }, { string: 4, fret: 2, duration: 0.5 }, { string: 4, fret: 0, duration: 0.5 },
    ],
  },
  {
    name: 'Sweet Child O\' Mine',
    artist: 'Guns N\' Roses',
    bpm: 128,
    difficulty: 'Hard',
    tab: `e|---------------------|
B|---12-15-12----------|
G|-12--------12-14-----|
D|---------------------|
A|---------------------|
E|---------------------|`,
    notes: [
      { string: 2, fret: 12, duration: 0.5 }, { string: 1, fret: 12, duration: 0.5 }, { string: 1, fret: 15, duration: 0.5 },
      { string: 1, fret: 12, duration: 0.5 }, { string: 2, fret: 12, duration: 0.5 }, { string: 2, fret: 14, duration: 1 },
    ],
  },
];

// Convert string/fret to frequency
export function fretToFrequency(stringIdx: number, fret: number): number {
  const semitone = STANDARD_TUNING_SEMITONES[5 - stringIdx] + fret; // strings are high-to-low in tab
  return 440 * Math.pow(2, (semitone - 69) / 12);
}

// ===== Rhythm Patterns =====
export interface RhythmHit {
  time: number; // beat position (0-based)
  type: 'kick' | 'snare' | 'hihat' | 'hihatOpen';
}

export interface RhythmPattern {
  name: string;
  bpm: number;
  timeSignature: string;
  beats: number; // total beats in pattern
  hits: RhythmHit[];
}

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  {
    name: 'Basic Rock',
    bpm: 110,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.5, type: 'hihat' },
      { time: 1, type: 'snare' }, { time: 1, type: 'hihat' },
      { time: 1.5, type: 'hihat' },
      { time: 2, type: 'kick' }, { time: 2, type: 'hihat' },
      { time: 2.5, type: 'hihat' },
      { time: 3, type: 'snare' }, { time: 3, type: 'hihat' },
      { time: 3.5, type: 'hihat' },
    ],
  },
  {
    name: 'Shuffle Blues',
    bpm: 85,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.67, type: 'hihat' },
      { time: 1, type: 'snare' }, { time: 1, type: 'hihat' },
      { time: 1.67, type: 'hihat' },
      { time: 2, type: 'kick' }, { time: 2, type: 'hihat' },
      { time: 2.67, type: 'hihat' },
      { time: 3, type: 'snare' }, { time: 3, type: 'hihat' },
      { time: 3.67, type: 'hihat' },
    ],
  },
  {
    name: 'Funk 16th',
    bpm: 100,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.25, type: 'hihat' }, { time: 0.5, type: 'hihat' }, { time: 0.75, type: 'hihat' },
      { time: 1, type: 'snare' }, { time: 1, type: 'hihat' },
      { time: 1.25, type: 'hihat' }, { time: 1.5, type: 'kick' }, { time: 1.5, type: 'hihat' }, { time: 1.75, type: 'hihat' },
      { time: 2, type: 'kick' }, { time: 2, type: 'hihat' },
      { time: 2.25, type: 'hihat' }, { time: 2.5, type: 'hihat' }, { time: 2.75, type: 'hihat' },
      { time: 3, type: 'snare' }, { time: 3, type: 'hihat' },
      { time: 3.25, type: 'hihat' }, { time: 3.5, type: 'hihat' }, { time: 3.75, type: 'kick' },
    ],
  },
  {
    name: 'Reggae Skank',
    bpm: 78,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' },
      { time: 0.75, type: 'hihat' },
      { time: 1, type: 'hihat' },
      { time: 1.5, type: 'snare' },
      { time: 2, type: 'kick' },
      { time: 2.75, type: 'hihat' },
      { time: 3, type: 'hihat' },
      { time: 3.5, type: 'snare' },
    ],
  },
  {
    name: 'Bossa Nova',
    bpm: 130,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.5, type: 'hihat' },
      { time: 1, type: 'hihat' },
      { time: 1.5, type: 'kick' }, { time: 1.5, type: 'hihat' },
      { time: 2, type: 'hihat' },
      { time: 2.5, type: 'hihat' },
      { time: 3, type: 'snare' }, { time: 3, type: 'hihat' },
      { time: 3.5, type: 'hihat' },
    ],
  },
  {
    name: 'Jazz Swing',
    bpm: 140,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'hihat' },
      { time: 0.67, type: 'hihat' },
      { time: 1, type: 'hihat' },
      { time: 1.67, type: 'hihat' },
      { time: 2, type: 'hihat' }, { time: 2, type: 'kick' },
      { time: 2.67, type: 'hihat' },
      { time: 3, type: 'hihat' },
      { time: 3.67, type: 'hihat' },
    ],
  },
  {
    name: 'Punk Fast 4',
    bpm: 180,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.5, type: 'hihat' },
      { time: 1, type: 'snare' }, { time: 1, type: 'hihat' },
      { time: 1.5, type: 'hihat' },
      { time: 2, type: 'kick' }, { time: 2, type: 'hihat' },
      { time: 2.5, type: 'hihat' },
      { time: 3, type: 'snare' }, { time: 3, type: 'hihat' },
      { time: 3.5, type: 'hihat' },
    ],
  },
  {
    name: 'Metal Double Kick',
    bpm: 160,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.25, type: 'kick' },
      { time: 0.5, type: 'kick' }, { time: 0.5, type: 'hihat' },
      { time: 0.75, type: 'kick' },
      { time: 1, type: 'snare' }, { time: 1, type: 'kick' }, { time: 1, type: 'hihat' },
      { time: 1.25, type: 'kick' },
      { time: 1.5, type: 'kick' }, { time: 1.5, type: 'hihat' },
      { time: 1.75, type: 'kick' },
      { time: 2, type: 'kick' }, { time: 2, type: 'hihat' },
      { time: 2.25, type: 'kick' },
      { time: 2.5, type: 'kick' }, { time: 2.5, type: 'hihat' },
      { time: 2.75, type: 'kick' },
      { time: 3, type: 'snare' }, { time: 3, type: 'kick' }, { time: 3, type: 'hihat' },
      { time: 3.25, type: 'kick' },
      { time: 3.5, type: 'kick' }, { time: 3.5, type: 'hihat' },
      { time: 3.75, type: 'kick' },
    ],
  },
  {
    name: 'Country Train',
    bpm: 110,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.25, type: 'hihat' }, { time: 0.5, type: 'hihat' }, { time: 0.75, type: 'hihat' },
      { time: 1, type: 'snare' }, { time: 1, type: 'hihat' },
      { time: 1.25, type: 'hihat' }, { time: 1.5, type: 'kick' }, { time: 1.5, type: 'hihat' }, { time: 1.75, type: 'hihat' },
      { time: 2, type: 'kick' }, { time: 2, type: 'hihat' },
      { time: 2.25, type: 'hihat' }, { time: 2.5, type: 'hihat' }, { time: 2.75, type: 'hihat' },
      { time: 3, type: 'snare' }, { time: 3, type: 'hihat' },
      { time: 3.25, type: 'hihat' }, { time: 3.5, type: 'hihat' }, { time: 3.75, type: 'hihat' },
    ],
  },
  {
    name: 'Hip-Hop Boom Bap',
    bpm: 90,
    timeSignature: '4/4',
    beats: 4,
    hits: [
      { time: 0, type: 'kick' }, { time: 0, type: 'hihat' },
      { time: 0.5, type: 'hihat' },
      { time: 1, type: 'snare' }, { time: 1, type: 'hihat' },
      { time: 1.5, type: 'hihat' },
      { time: 2.25, type: 'kick' }, { time: 2, type: 'hihat' },
      { time: 2.5, type: 'hihat' },
      { time: 3, type: 'snare' }, { time: 3, type: 'hihat' },
      { time: 3.5, type: 'hihat' },
    ],
  },
];
