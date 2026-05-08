// Curated chord progressions for famous songs. Matched to YouTube video titles by
// keyword fuzzy-match. Chord names use the notation in CHORD_DIAGRAMS so the
// existing ChordDiagram component renders fingerings without modification.

export interface SongSection {
  name: string;            // e.g. 'Verse', 'Chorus', 'Intro', 'Bridge', 'Solo'
  chords: string[];        // e.g. ['Em', 'G', 'D', 'C']
  loop?: boolean;          // section repeats throughout (default true)
  description?: string;    // optional context note
}

export interface SongChords {
  matchKeywords: string[];  // lowercase substrings to match against video title
  artist: string;
  song: string;
  key: string;
  capo?: number;
  bpm?: number;
  sections: SongSection[];
  source?: string;          // e.g. 'Verified by ear' / 'Common Ultimate-Guitar version'
}

export const SONG_CHORDS: SongChords[] = [
  {
    matchKeywords: ['smoke on the water', 'deep purple'],
    artist: 'Deep Purple', song: 'Smoke on the Water', key: 'G minor', bpm: 112,
    sections: [
      { name: 'Iconic Riff (power chords)', chords: ['G5', 'A#5', 'C5', 'G5', 'A#5', 'C#5', 'C5'], description: 'Bottom strings, two-note shapes' },
      { name: 'Verse', chords: ['Gm', 'F', 'A#'] },
      { name: 'Chorus', chords: ['C', 'A#', 'Gm'] },
    ],
  },
  {
    matchKeywords: ['sweet child', 'guns n roses', "guns n' roses"],
    artist: "Guns N' Roses", song: "Sweet Child o' Mine", key: 'D major', bpm: 125,
    sections: [
      { name: 'Verse', chords: ['D', 'C', 'G', 'D'] },
      { name: 'Chorus', chords: ['D', 'C', 'G'] },
      { name: 'Bridge ("Where do we go now")', chords: ['A', 'C', 'D'] },
    ],
  },
  {
    matchKeywords: ['wonderwall', 'oasis'],
    artist: 'Oasis', song: 'Wonderwall', key: 'F# minor', bpm: 87, capo: 2,
    sections: [
      { name: 'Verse (capo 2)', chords: ['Em7', 'G', 'Dsus4', 'A7'] },
      { name: 'Chorus', chords: ['C', 'D', 'G', 'Em'] },
    ],
    source: 'Capo on 2nd fret, played with these shapes',
  },
  {
    matchKeywords: ['hotel california', 'eagles'],
    artist: 'Eagles', song: 'Hotel California', key: 'B minor', bpm: 75,
    sections: [
      { name: 'Verse', chords: ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#'] },
      { name: 'Chorus', chords: ['G', 'D', 'Em', 'Bm', 'G', 'D', 'Em', 'F#'] },
    ],
  },
  {
    matchKeywords: ['stairway to heaven', 'led zeppelin'],
    artist: 'Led Zeppelin', song: 'Stairway to Heaven', key: 'A minor', bpm: 82,
    sections: [
      { name: 'Intro fingerpicking', chords: ['Am', 'C', 'D', 'F', 'Am'] },
      { name: 'Verse', chords: ['Am', 'C/G', 'D/F#', 'Fmaj7', 'Am'] },
      { name: 'Bridge', chords: ['C', 'D', 'F', 'Am', 'G', 'F'] },
    ],
  },
  {
    matchKeywords: ['sweet home alabama', 'lynyrd skynyrd'],
    artist: 'Lynyrd Skynyrd', song: 'Sweet Home Alabama', key: 'D major', bpm: 98,
    sections: [
      { name: 'Whole song (loop)', chords: ['D', 'C', 'G'] },
    ],
  },
  {
    matchKeywords: ['knockin on heaven', "knockin' on heaven"],
    artist: 'Bob Dylan', song: "Knockin' on Heaven's Door", key: 'G major', bpm: 78,
    sections: [
      { name: 'Whole song (loop)', chords: ['G', 'D', 'Am'] },
      { name: 'Alternate', chords: ['G', 'D', 'C'] },
    ],
  },
  {
    matchKeywords: ['wish you were here', 'pink floyd'],
    artist: 'Pink Floyd', song: 'Wish You Were Here', key: 'G major', bpm: 60,
    sections: [
      { name: 'Intro / Verse', chords: ['Em7', 'G', 'Em7', 'A7', 'Em7', 'A7', 'G'] },
      { name: 'Chorus', chords: ['Am', 'C', 'D', 'G'] },
    ],
  },
  {
    matchKeywords: ['nothing else matters', 'metallica'],
    artist: 'Metallica', song: 'Nothing Else Matters', key: 'E minor', bpm: 70,
    sections: [
      { name: 'Intro fingerpicking', chords: ['Em', 'D', 'C', 'G'] },
      { name: 'Verse', chords: ['Em', 'D', 'C', 'B7'] },
      { name: 'Chorus', chords: ['Em', 'D', 'C', 'G', 'D'] },
    ],
  },
  {
    matchKeywords: ['hey jude', 'beatles'],
    artist: 'The Beatles', song: 'Hey Jude', key: 'F major', bpm: 73,
    sections: [
      { name: 'Verse', chords: ['F', 'C', 'C7', 'F', 'A#'] },
      { name: 'Chorus', chords: ['F', 'A#', 'F', 'C7', 'F'] },
      { name: 'Outro ("na-na-na")', chords: ['F', 'D#', 'A#', 'F'] },
    ],
  },
  {
    matchKeywords: ['let it be', 'beatles'],
    artist: 'The Beatles', song: 'Let It Be', key: 'C major', bpm: 73,
    sections: [
      { name: 'Verse', chords: ['C', 'G', 'Am', 'Fmaj7', 'F', 'C', 'G', 'F', 'C'] },
      { name: 'Chorus', chords: ['Am', 'G', 'F', 'C', 'F', 'C', 'G', 'F', 'C'] },
    ],
  },
  {
    matchKeywords: ['wonderful tonight', 'eric clapton'],
    artist: 'Eric Clapton', song: 'Wonderful Tonight', key: 'G major', bpm: 96,
    sections: [
      { name: 'Verse', chords: ['G', 'D', 'C', 'D'] },
      { name: 'Chorus', chords: ['C', 'D', 'G', 'Em', 'C', 'D', 'G'] },
    ],
  },
  {
    matchKeywords: ['tears in heaven', 'eric clapton'],
    artist: 'Eric Clapton', song: 'Tears in Heaven', key: 'A major', bpm: 80,
    sections: [
      { name: 'Verse', chords: ['A', 'E', 'F#m', 'A7', 'D', 'A', 'E'] },
      { name: 'Chorus', chords: ['C#m', 'F#m', 'B7', 'E', 'A', 'D', 'E'] },
    ],
  },
  {
    matchKeywords: ['black', 'pearl jam'],
    artist: 'Pearl Jam', song: 'Black', key: 'E major', bpm: 84,
    sections: [
      { name: 'Verse', chords: ['E', 'A'] },
      { name: 'Chorus', chords: ['C#m', 'A', 'B', 'E'] },
    ],
  },
  {
    matchKeywords: ['yesterday', 'beatles'],
    artist: 'The Beatles', song: 'Yesterday', key: 'F major', bpm: 96, capo: 5,
    sections: [
      { name: 'Verse (capo 5)', chords: ['G', 'F#m', 'B7', 'Em', 'C', 'D7', 'G'] },
      { name: 'Bridge', chords: ['F#m', 'B7', 'Em', 'D', 'C', 'Bm', 'Am', 'D7', 'G'] },
    ],
  },
  {
    matchKeywords: ['free fallin', 'tom petty'],
    artist: 'Tom Petty', song: "Free Fallin'", key: 'F major', bpm: 84, capo: 3,
    sections: [
      { name: 'Whole song (capo 3, shapes)', chords: ['D', 'Dsus4', 'G', 'A'] },
    ],
  },
  {
    matchKeywords: ['house of the rising sun', 'animals'],
    artist: 'The Animals', song: 'House of the Rising Sun', key: 'A minor', bpm: 76,
    sections: [
      { name: 'Verse (arpeggios)', chords: ['Am', 'C', 'D', 'F', 'Am', 'E'] },
    ],
  },
  {
    matchKeywords: ['comfortably numb', 'pink floyd'],
    artist: 'Pink Floyd', song: 'Comfortably Numb', key: 'B minor', bpm: 64,
    sections: [
      { name: 'Verse', chords: ['Bm', 'A', 'G', 'Em', 'Bm'] },
      { name: 'Chorus', chords: ['D', 'A', 'C', 'G', 'D'] },
    ],
  },
  {
    matchKeywords: ['black hole sun', 'soundgarden'],
    artist: 'Soundgarden', song: 'Black Hole Sun', key: 'G major', bpm: 52,
    sections: [
      { name: 'Verse', chords: ['G', 'G7', 'C', 'D7'] },
      { name: 'Chorus', chords: ['C#m', 'C', 'B', 'A#'] },
    ],
  },
  {
    matchKeywords: ['californication', 'red hot chili'],
    artist: 'Red Hot Chili Peppers', song: 'Californication', key: 'A minor', bpm: 96,
    sections: [
      { name: 'Verse', chords: ['Am', 'F'] },
      { name: 'Chorus', chords: ['C', 'G', 'F', 'Em', 'F'] },
    ],
  },
  {
    matchKeywords: ['zombie', 'cranberries'],
    artist: 'The Cranberries', song: 'Zombie', key: 'E minor', bpm: 84,
    sections: [
      { name: 'Whole song (loop)', chords: ['Em', 'C', 'G', 'D'] },
    ],
  },
  {
    matchKeywords: ['no woman no cry', 'bob marley'],
    artist: 'Bob Marley', song: 'No Woman No Cry', key: 'C major', bpm: 76,
    sections: [
      { name: 'Verse / Chorus', chords: ['C', 'G', 'Am', 'F', 'C', 'F', 'C', 'G'] },
    ],
  },
  {
    matchKeywords: ['three little birds', 'bob marley'],
    artist: 'Bob Marley', song: 'Three Little Birds', key: 'A major', bpm: 76,
    sections: [
      { name: 'Verse', chords: ['A', 'D', 'A'] },
      { name: 'Chorus', chords: ['A', 'E', 'D', 'A'] },
    ],
  },
];

export function findSongChords(title: string): SongChords | null {
  if (!title) return null;
  const normalized = title.toLowerCase();
  let best: { song: SongChords; score: number } | null = null;
  for (const song of SONG_CHORDS) {
    let score = 0;
    for (const kw of song.matchKeywords) {
      if (normalized.includes(kw.toLowerCase())) {
        score += kw.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { song, score };
    }
  }
  return best?.song ?? null;
}
