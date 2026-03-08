import type { EffectSettings } from '@/hooks/useGuitarEffects';

export interface TonePreset {
  name: string;
  artist: string;
  genre: string;
  description: string;
  youtubeRef?: string;
  settings: EffectSettings;
}

const base: EffectSettings = {
  reverb: 0, delay: 0, delayTime: 0.3, distortion: 0, gain: 0.8,
  chorus: 0, chorusRate: 1.5, flanger: 0, flangerRate: 0.5,
  phaser: 0, phaserRate: 0.8, compressor: 0, noiseGate: 0,
  eqBass: 0.5, eqMid: 0.5, eqTreble: 0.5,
  wah: 0, wahFreq: 0.5, tremolo: 0, tremoloRate: 5,
  octaver: 0, octaverMix: 0.5,
};

const p = (overrides: Partial<EffectSettings>): EffectSettings => ({ ...base, ...overrides });

export const TONE_PRESETS: TonePreset[] = [
  // Clean Tones
  { name: 'Sparkling Clean', artist: 'John Mayer', genre: 'Blues/Pop', description: 'Crystal clear Strat clean with subtle compression',
    youtubeRef: 'Gravity', settings: p({ gain: 0.7, compressor: 0.3, eqTreble: 0.65, reverb: 0.2, chorus: 0.15 }) },
  { name: 'Jazz Warm', artist: 'Joe Pass', genre: 'Jazz', description: 'Warm rounded jazz tone with rolled-off treble',
    settings: p({ gain: 0.6, eqBass: 0.6, eqMid: 0.55, eqTreble: 0.3, reverb: 0.15, compressor: 0.2 }) },
  { name: 'Funk Clean', artist: 'Nile Rodgers', genre: 'Funk', description: 'Tight percussive clean with compression',
    youtubeRef: 'Le Freak', settings: p({ gain: 0.75, compressor: 0.6, eqBass: 0.4, eqMid: 0.6, eqTreble: 0.7, noiseGate: 0.3 }) },
  { name: 'Country Twang', artist: 'Brad Paisley', genre: 'Country', description: 'Bright clean with snappy compression',
    settings: p({ gain: 0.7, compressor: 0.5, eqBass: 0.4, eqTreble: 0.75, chorus: 0.1, reverb: 0.15 }) },
  { name: 'Indie Shimmer', artist: 'The Edge', genre: 'Rock', description: 'Ambient clean with delay and modulation',
    youtubeRef: 'Where The Streets Have No Name', settings: p({ gain: 0.65, delay: 0.4, delayTime: 0.35, reverb: 0.4, chorus: 0.2, eqTreble: 0.65 }) },

  // Crunch Tones
  { name: 'Blues Crunch', artist: 'SRV', genre: 'Blues', description: 'Texas blues overdrive with warm mids',
    youtubeRef: 'Pride and Joy', settings: p({ distortion: 0.3, gain: 0.8, eqBass: 0.55, eqMid: 0.65, eqTreble: 0.55, reverb: 0.2, compressor: 0.2 }) },
  { name: 'Classic Rock', artist: 'AC/DC', genre: 'Rock', description: 'Marshall-style crunch, punchy mids',
    youtubeRef: 'Back in Black', settings: p({ distortion: 0.4, gain: 0.85, eqBass: 0.6, eqMid: 0.7, eqTreble: 0.6, noiseGate: 0.2 }) },
  { name: 'Punk Rock', artist: 'Green Day', genre: 'Punk', description: 'Aggressive mid-forward crunch',
    youtubeRef: 'American Idiot', settings: p({ distortion: 0.45, gain: 0.9, eqBass: 0.5, eqMid: 0.7, eqTreble: 0.6, compressor: 0.3, noiseGate: 0.3 }) },
  { name: 'Vintage Overdrive', artist: 'Jimi Hendrix', genre: 'Rock', description: 'Warm fuzz-like overdrive with psychedelic vibe',
    youtubeRef: 'Purple Haze', settings: p({ distortion: 0.45, gain: 0.75, reverb: 0.35, phaser: 0.3, phaserRate: 0.6, eqMid: 0.6 }) },

  // High Gain
  { name: 'Metal Rhythm', artist: 'Metallica', genre: 'Metal', description: 'Tight palm-muted metal rhythm tone',
    youtubeRef: 'Master of Puppets', settings: p({ distortion: 0.7, gain: 0.85, eqBass: 0.55, eqMid: 0.4, eqTreble: 0.65, noiseGate: 0.5, compressor: 0.3 }) },
  { name: 'Djent', artist: 'Periphery', genre: 'Progressive Metal', description: 'Ultra-tight modern metal with scooped mids',
    settings: p({ distortion: 0.75, gain: 0.9, eqBass: 0.6, eqMid: 0.3, eqTreble: 0.7, noiseGate: 0.6, compressor: 0.5 }) },
  { name: 'Nu-Metal', artist: 'Wes Borland', genre: 'Nu-Metal', description: 'Heavy downtuned with industrial edge',
    settings: p({ distortion: 0.65, gain: 0.85, eqBass: 0.7, eqMid: 0.45, eqTreble: 0.55, noiseGate: 0.4, flanger: 0.15 }) },
  { name: 'Shred Lead', artist: 'Steve Vai', genre: 'Rock', description: 'Smooth singing lead tone with sustain',
    youtubeRef: 'For the Love of God', settings: p({ distortion: 0.55, gain: 0.8, reverb: 0.3, delay: 0.2, delayTime: 0.35, eqMid: 0.65, compressor: 0.4 }) },
  { name: 'Doom Sludge', artist: 'Electric Wizard', genre: 'Doom', description: 'Massive fuzzy wall of sound',
    settings: p({ distortion: 0.85, gain: 0.9, eqBass: 0.75, eqMid: 0.5, eqTreble: 0.4, reverb: 0.3 }) },

  // Modulated & Experimental
  { name: 'Gilmour Solo', artist: 'David Gilmour', genre: 'Progressive Rock', description: 'Singing lead with lush delay and reverb',
    youtubeRef: 'Comfortably Numb', settings: p({ distortion: 0.25, gain: 0.7, reverb: 0.55, delay: 0.45, delayTime: 0.45, compressor: 0.3, phaser: 0.15 }) },
  { name: 'Wah Funk', artist: 'Jimi Hendrix', genre: 'Rock', description: 'Voodoo Chile style wah rhythm',
    youtubeRef: 'Voodoo Child', settings: p({ distortion: 0.35, gain: 0.75, wah: 0.7, wahFreq: 0.6, eqMid: 0.6, reverb: 0.15 }) },
  { name: 'Shoegaze', artist: 'My Bloody Valentine', genre: 'Shoegaze', description: 'Dreamy wall of modulated noise',
    settings: p({ distortion: 0.35, reverb: 0.8, chorus: 0.5, chorusRate: 0.8, tremolo: 0.2, tremoloRate: 3, delay: 0.3, delayTime: 0.4, gain: 0.65 }) },
  { name: 'Tom Morello', artist: 'Tom Morello', genre: 'Rock', description: 'RATM-style aggressive tone',
    youtubeRef: 'Killing in the Name', settings: p({ distortion: 0.7, gain: 0.9, eqBass: 0.5, eqMid: 0.6, eqTreble: 0.55, noiseGate: 0.4, wah: 0.3, wahFreq: 0.7 }) },
  { name: 'Reggae Clean', artist: 'Bob Marley', genre: 'Reggae', description: 'Dark clean with tight chop',
    settings: p({ gain: 0.6, eqBass: 0.4, eqMid: 0.45, eqTreble: 0.35, compressor: 0.4, reverb: 0.15 }) },
  { name: 'Surf Rock', artist: 'Dick Dale', genre: 'Surf', description: 'Drenched spring reverb with tremolo',
    youtubeRef: 'Misirlou', settings: p({ gain: 0.75, reverb: 0.6, tremolo: 0.5, tremoloRate: 6, eqTreble: 0.65, compressor: 0.2 }) },
  { name: '80s Ballad', artist: 'Slash', genre: 'Rock', description: 'Sweet singing lead with chorus and delay',
    youtubeRef: 'November Rain', settings: p({ distortion: 0.35, gain: 0.75, chorus: 0.3, reverb: 0.4, delay: 0.3, delayTime: 0.35, eqMid: 0.6, compressor: 0.3 }) },
  { name: 'Lo-Fi', artist: 'Mac DeMarco', genre: 'Indie', description: 'Wobbly chorus with warm character',
    settings: p({ gain: 0.6, chorus: 0.5, chorusRate: 2, eqBass: 0.55, eqTreble: 0.35, reverb: 0.2 }) },
  { name: 'Octave Fuzz', artist: 'Jack White', genre: 'Garage', description: 'Raw octave-up distortion',
    youtubeRef: 'Seven Nation Army', settings: p({ distortion: 0.6, gain: 0.85, octaver: 0.5, octaverMix: 0.4, eqMid: 0.6, noiseGate: 0.3 }) },
  { name: 'Post-Rock', artist: 'Explosions in the Sky', genre: 'Post-Rock', description: 'Atmospheric swells with massive reverb',
    settings: p({ gain: 0.6, reverb: 0.75, delay: 0.5, delayTime: 0.5, tremolo: 0.15, tremoloRate: 2, chorus: 0.2, eqTreble: 0.6 }) },
];

export const GENRE_CATEGORIES = ['All', 'Blues/Pop', 'Jazz', 'Funk', 'Country', 'Rock', 'Punk', 'Metal', 'Progressive Metal', 'Nu-Metal', 'Doom', 'Progressive Rock', 'Shoegaze', 'Reggae', 'Surf', 'Indie', 'Garage', 'Post-Rock'] as const;
