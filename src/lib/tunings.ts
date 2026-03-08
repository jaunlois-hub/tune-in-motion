export interface TuningNote {
  string: number;
  note: string;
  octave: number;
  frequency: number;
}

export interface Tuning {
  id: string;
  name: string;
  category: 'guitar' | 'bass' | 'ukulele';
  description: string;
  notes: TuningNote[];
}

export const TUNINGS: Tuning[] = [
  // === GUITAR ===
  {
    id: 'standard',
    name: 'Standard',
    category: 'guitar',
    description: 'E A D G B E',
    notes: [
      { string: 6, note: 'E', octave: 2, frequency: 82.41 },
      { string: 5, note: 'A', octave: 2, frequency: 110.00 },
      { string: 4, note: 'D', octave: 3, frequency: 146.83 },
      { string: 3, note: 'G', octave: 3, frequency: 196.00 },
      { string: 2, note: 'B', octave: 3, frequency: 246.94 },
      { string: 1, note: 'E', octave: 4, frequency: 329.63 },
    ],
  },
  {
    id: 'drop-d',
    name: 'Drop D',
    category: 'guitar',
    description: 'D A D G B E',
    notes: [
      { string: 6, note: 'D', octave: 2, frequency: 73.42 },
      { string: 5, note: 'A', octave: 2, frequency: 110.00 },
      { string: 4, note: 'D', octave: 3, frequency: 146.83 },
      { string: 3, note: 'G', octave: 3, frequency: 196.00 },
      { string: 2, note: 'B', octave: 3, frequency: 246.94 },
      { string: 1, note: 'E', octave: 4, frequency: 329.63 },
    ],
  },
  {
    id: 'half-step-down',
    name: 'Half Step Down',
    category: 'guitar',
    description: 'Eb Ab Db Gb Bb Eb',
    notes: [
      { string: 6, note: 'D#', octave: 2, frequency: 77.78 },
      { string: 5, note: 'G#', octave: 2, frequency: 103.83 },
      { string: 4, note: 'C#', octave: 3, frequency: 138.59 },
      { string: 3, note: 'F#', octave: 3, frequency: 185.00 },
      { string: 2, note: 'A#', octave: 3, frequency: 233.08 },
      { string: 1, note: 'D#', octave: 4, frequency: 311.13 },
    ],
  },
  {
    id: 'full-step-down',
    name: 'Full Step Down',
    category: 'guitar',
    description: 'D G C F A D',
    notes: [
      { string: 6, note: 'D', octave: 2, frequency: 73.42 },
      { string: 5, note: 'G', octave: 2, frequency: 98.00 },
      { string: 4, note: 'C', octave: 3, frequency: 130.81 },
      { string: 3, note: 'F', octave: 3, frequency: 174.61 },
      { string: 2, note: 'A', octave: 3, frequency: 220.00 },
      { string: 1, note: 'D', octave: 4, frequency: 293.66 },
    ],
  },
  {
    id: 'drop-c',
    name: 'Drop C',
    category: 'guitar',
    description: 'C G C F A D',
    notes: [
      { string: 6, note: 'C', octave: 2, frequency: 65.41 },
      { string: 5, note: 'G', octave: 2, frequency: 98.00 },
      { string: 4, note: 'C', octave: 3, frequency: 130.81 },
      { string: 3, note: 'F', octave: 3, frequency: 174.61 },
      { string: 2, note: 'A', octave: 3, frequency: 220.00 },
      { string: 1, note: 'D', octave: 4, frequency: 293.66 },
    ],
  },
  {
    id: 'dadgad',
    name: 'DADGAD',
    category: 'guitar',
    description: 'D A D G A D',
    notes: [
      { string: 6, note: 'D', octave: 2, frequency: 73.42 },
      { string: 5, note: 'A', octave: 2, frequency: 110.00 },
      { string: 4, note: 'D', octave: 3, frequency: 146.83 },
      { string: 3, note: 'G', octave: 3, frequency: 196.00 },
      { string: 2, note: 'A', octave: 3, frequency: 220.00 },
      { string: 1, note: 'D', octave: 4, frequency: 293.66 },
    ],
  },
  {
    id: 'open-g',
    name: 'Open G',
    category: 'guitar',
    description: 'D G D G B D',
    notes: [
      { string: 6, note: 'D', octave: 2, frequency: 73.42 },
      { string: 5, note: 'G', octave: 2, frequency: 98.00 },
      { string: 4, note: 'D', octave: 3, frequency: 146.83 },
      { string: 3, note: 'G', octave: 3, frequency: 196.00 },
      { string: 2, note: 'B', octave: 3, frequency: 246.94 },
      { string: 1, note: 'D', octave: 4, frequency: 293.66 },
    ],
  },
  {
    id: 'open-d',
    name: 'Open D',
    category: 'guitar',
    description: 'D A D F# A D',
    notes: [
      { string: 6, note: 'D', octave: 2, frequency: 73.42 },
      { string: 5, note: 'A', octave: 2, frequency: 110.00 },
      { string: 4, note: 'D', octave: 3, frequency: 146.83 },
      { string: 3, note: 'F#', octave: 3, frequency: 185.00 },
      { string: 2, note: 'A', octave: 3, frequency: 220.00 },
      { string: 1, note: 'D', octave: 4, frequency: 293.66 },
    ],
  },
  {
    id: 'open-e',
    name: 'Open E',
    category: 'guitar',
    description: 'E B E G# B E',
    notes: [
      { string: 6, note: 'E', octave: 2, frequency: 82.41 },
      { string: 5, note: 'B', octave: 2, frequency: 123.47 },
      { string: 4, note: 'E', octave: 3, frequency: 164.81 },
      { string: 3, note: 'G#', octave: 3, frequency: 207.65 },
      { string: 2, note: 'B', octave: 3, frequency: 246.94 },
      { string: 1, note: 'E', octave: 4, frequency: 329.63 },
    ],
  },
  {
    id: 'open-a',
    name: 'Open A',
    category: 'guitar',
    description: 'E A E A C# E',
    notes: [
      { string: 6, note: 'E', octave: 2, frequency: 82.41 },
      { string: 5, note: 'A', octave: 2, frequency: 110.00 },
      { string: 4, note: 'E', octave: 3, frequency: 164.81 },
      { string: 3, note: 'A', octave: 3, frequency: 220.00 },
      { string: 2, note: 'C#', octave: 4, frequency: 277.18 },
      { string: 1, note: 'E', octave: 4, frequency: 329.63 },
    ],
  },
  {
    id: 'standard-c-sharp',
    name: 'Standard C#',
    category: 'guitar',
    description: 'C# F# B E G# C#',
    notes: [
      { string: 6, note: 'C#', octave: 2, frequency: 69.30 },
      { string: 5, note: 'F#', octave: 2, frequency: 92.50 },
      { string: 4, note: 'B', octave: 2, frequency: 123.47 },
      { string: 3, note: 'E', octave: 3, frequency: 164.81 },
      { string: 2, note: 'G#', octave: 3, frequency: 207.65 },
      { string: 1, note: 'C#', octave: 4, frequency: 277.18 },
    ],
  },

  // === BASS GUITAR ===
  {
    id: 'bass-standard',
    name: 'Bass Standard',
    category: 'bass',
    description: 'E A D G',
    notes: [
      { string: 4, note: 'E', octave: 1, frequency: 41.20 },
      { string: 3, note: 'A', octave: 1, frequency: 55.00 },
      { string: 2, note: 'D', octave: 2, frequency: 73.42 },
      { string: 1, note: 'G', octave: 2, frequency: 98.00 },
    ],
  },
  {
    id: 'bass-5-string',
    name: 'Bass 5-String',
    category: 'bass',
    description: 'B E A D G',
    notes: [
      { string: 5, note: 'B', octave: 0, frequency: 30.87 },
      { string: 4, note: 'E', octave: 1, frequency: 41.20 },
      { string: 3, note: 'A', octave: 1, frequency: 55.00 },
      { string: 2, note: 'D', octave: 2, frequency: 73.42 },
      { string: 1, note: 'G', octave: 2, frequency: 98.00 },
    ],
  },
  {
    id: 'bass-drop-d',
    name: 'Bass Drop D',
    category: 'bass',
    description: 'D A D G',
    notes: [
      { string: 4, note: 'D', octave: 1, frequency: 36.71 },
      { string: 3, note: 'A', octave: 1, frequency: 55.00 },
      { string: 2, note: 'D', octave: 2, frequency: 73.42 },
      { string: 1, note: 'G', octave: 2, frequency: 98.00 },
    ],
  },
  {
    id: 'bass-half-step-down',
    name: 'Bass Half Step Down',
    category: 'bass',
    description: 'Eb Ab Db Gb',
    notes: [
      { string: 4, note: 'D#', octave: 1, frequency: 38.89 },
      { string: 3, note: 'G#', octave: 1, frequency: 51.91 },
      { string: 2, note: 'C#', octave: 2, frequency: 69.30 },
      { string: 1, note: 'F#', octave: 2, frequency: 92.50 },
    ],
  },

  // === UKULELE ===
  {
    id: 'uke-standard',
    name: 'Ukulele Standard',
    category: 'ukulele',
    description: 'G C E A',
    notes: [
      { string: 4, note: 'G', octave: 4, frequency: 392.00 },
      { string: 3, note: 'C', octave: 4, frequency: 261.63 },
      { string: 2, note: 'E', octave: 4, frequency: 329.63 },
      { string: 1, note: 'A', octave: 4, frequency: 440.00 },
    ],
  },
  {
    id: 'uke-low-g',
    name: 'Ukulele Low G',
    category: 'ukulele',
    description: 'G C E A (Low G)',
    notes: [
      { string: 4, note: 'G', octave: 3, frequency: 196.00 },
      { string: 3, note: 'C', octave: 4, frequency: 261.63 },
      { string: 2, note: 'E', octave: 4, frequency: 329.63 },
      { string: 1, note: 'A', octave: 4, frequency: 440.00 },
    ],
  },
  {
    id: 'uke-baritone',
    name: 'Ukulele Baritone',
    category: 'ukulele',
    description: 'D G B E',
    notes: [
      { string: 4, note: 'D', octave: 3, frequency: 146.83 },
      { string: 3, note: 'G', octave: 3, frequency: 196.00 },
      { string: 2, note: 'B', octave: 3, frequency: 246.94 },
      { string: 1, note: 'E', octave: 4, frequency: 329.63 },
    ],
  },
  {
    id: 'uke-d-tuning',
    name: 'Ukulele D Tuning',
    category: 'ukulele',
    description: 'A D F# B',
    notes: [
      { string: 4, note: 'A', octave: 4, frequency: 440.00 },
      { string: 3, note: 'D', octave: 4, frequency: 293.66 },
      { string: 2, note: 'F#', octave: 4, frequency: 369.99 },
      { string: 1, note: 'B', octave: 4, frequency: 493.88 },
    ],
  },
];

export function findClosestNote(frequency: number, tuning: Tuning): TuningNote | null {
  let closest: TuningNote | null = null;
  let smallestDiff = Infinity;

  for (const note of tuning.notes) {
    const diff = Math.abs(Math.log2(frequency / note.frequency) * 1200);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = note;
    }
  }

  return closest;
}
