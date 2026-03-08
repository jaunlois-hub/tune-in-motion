import type { EffectSettings } from '@/hooks/useGuitarEffects';

export interface TonePreset {
  name: string;
  artist: string;
  genre: string;
  description: string;
  youtubeRef?: string;
  keywords: string[];
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
  // Clean
  { name: 'Sparkling Clean', artist: 'John Mayer', genre: 'Blues/Pop', description: 'Crystal clear Strat clean with subtle compression',
    youtubeRef: 'Gravity', keywords: ['john mayer', 'gravity', 'waiting on the world', 'slow dancing', 'strat clean', 'blues pop clean'],
    settings: p({ gain: 0.7, compressor: 0.3, eqTreble: 0.65, reverb: 0.2, chorus: 0.15 }) },
  { name: 'Jazz Warm', artist: 'Joe Pass', genre: 'Jazz', description: 'Warm rounded jazz tone with rolled-off treble',
    keywords: ['joe pass', 'jazz guitar', 'wes montgomery', 'bossa nova', 'jazz clean', 'warm jazz', 'pat metheny'],
    settings: p({ gain: 0.6, eqBass: 0.6, eqMid: 0.55, eqTreble: 0.3, reverb: 0.15, compressor: 0.2 }) },
  { name: 'Funk Clean', artist: 'Nile Rodgers', genre: 'Funk', description: 'Tight percussive clean with compression',
    youtubeRef: 'Le Freak', keywords: ['nile rodgers', 'le freak', 'chic', 'funk guitar', 'get lucky', 'daft punk guitar'],
    settings: p({ gain: 0.75, compressor: 0.6, eqBass: 0.4, eqMid: 0.6, eqTreble: 0.7, noiseGate: 0.3 }) },
  { name: 'Country Twang', artist: 'Brad Paisley', genre: 'Country', description: 'Bright clean with snappy compression',
    keywords: ['brad paisley', 'country guitar', 'chicken pickin', 'telecaster', 'nashville', 'country twang'],
    settings: p({ gain: 0.7, compressor: 0.5, eqBass: 0.4, eqTreble: 0.75, chorus: 0.1, reverb: 0.15 }) },
  { name: 'Indie Shimmer', artist: 'The Edge', genre: 'Rock', description: 'Ambient clean with delay and modulation',
    youtubeRef: 'Where The Streets Have No Name', keywords: ['the edge', 'u2', 'where the streets', 'with or without you', 'ambient guitar', 'delay shimmer'],
    settings: p({ gain: 0.65, delay: 0.4, delayTime: 0.35, reverb: 0.4, chorus: 0.2, eqTreble: 0.65 }) },

  // Crunch
  { name: 'Blues Crunch', artist: 'SRV', genre: 'Blues', description: 'Texas blues overdrive with warm mids',
    youtubeRef: 'Pride and Joy', keywords: ['srv', 'stevie ray vaughan', 'pride and joy', 'texas flood', 'texas blues', 'blues overdrive', 'bb king', 'albert king'],
    settings: p({ distortion: 0.3, gain: 0.8, eqBass: 0.55, eqMid: 0.65, eqTreble: 0.55, reverb: 0.2, compressor: 0.2 }) },
  { name: 'Classic Rock', artist: 'AC/DC', genre: 'Rock', description: 'Marshall-style crunch, punchy mids',
    youtubeRef: 'Back in Black', keywords: ['ac/dc', 'acdc', 'back in black', 'highway to hell', 'thunderstruck', 'angus young', 'marshall crunch', 'classic rock'],
    settings: p({ distortion: 0.4, gain: 0.85, eqBass: 0.6, eqMid: 0.7, eqTreble: 0.6, noiseGate: 0.2 }) },
  { name: 'Punk Rock', artist: 'Green Day', genre: 'Punk', description: 'Aggressive mid-forward crunch',
    youtubeRef: 'American Idiot', keywords: ['green day', 'american idiot', 'basket case', 'blink 182', 'punk rock', 'ramones', 'offspring'],
    settings: p({ distortion: 0.45, gain: 0.9, eqBass: 0.5, eqMid: 0.7, eqTreble: 0.6, compressor: 0.3, noiseGate: 0.3 }) },
  { name: 'Vintage Overdrive', artist: 'Jimi Hendrix', genre: 'Rock', description: 'Warm fuzz-like overdrive with psychedelic vibe',
    youtubeRef: 'Purple Haze', keywords: ['hendrix', 'purple haze', 'foxy lady', 'all along the watchtower', 'psychedelic', 'fuzz', 'vintage overdrive'],
    settings: p({ distortion: 0.45, gain: 0.75, reverb: 0.35, phaser: 0.3, phaserRate: 0.6, eqMid: 0.6 }) },
  { name: 'Grunge', artist: 'Nirvana', genre: 'Grunge', description: 'Raw scooped distortion with attitude',
    youtubeRef: 'Smells Like Teen Spirit', keywords: ['nirvana', 'smells like teen spirit', 'come as you are', 'kurt cobain', 'grunge', 'pearl jam', 'soundgarden', 'alice in chains'],
    settings: p({ distortion: 0.55, gain: 0.85, eqBass: 0.6, eqMid: 0.35, eqTreble: 0.55, chorus: 0.1, noiseGate: 0.25 }) },
  { name: 'Blues Rock', artist: 'Gary Moore', genre: 'Blues', description: 'Singing blues-rock lead tone',
    youtubeRef: 'Still Got The Blues', keywords: ['gary moore', 'still got the blues', 'parisienne walkways', 'peter green', 'blues rock lead'],
    settings: p({ distortion: 0.35, gain: 0.8, reverb: 0.25, delay: 0.15, eqMid: 0.65, eqTreble: 0.55, compressor: 0.25 }) },

  // High Gain
  { name: 'Metal Rhythm', artist: 'Metallica', genre: 'Metal', description: 'Tight palm-muted metal rhythm tone',
    youtubeRef: 'Master of Puppets', keywords: ['metallica', 'master of puppets', 'enter sandman', 'one', 'metal rhythm', 'thrash metal', 'james hetfield', 'megadeth', 'slayer'],
    settings: p({ distortion: 0.7, gain: 0.85, eqBass: 0.55, eqMid: 0.4, eqTreble: 0.65, noiseGate: 0.5, compressor: 0.3 }) },
  { name: 'Djent', artist: 'Periphery', genre: 'Progressive Metal', description: 'Ultra-tight modern metal with scooped mids',
    keywords: ['periphery', 'djent', 'meshuggah', 'animals as leaders', 'modern metal', 'progressive metal', 'polyphia', '8 string'],
    settings: p({ distortion: 0.75, gain: 0.9, eqBass: 0.6, eqMid: 0.3, eqTreble: 0.7, noiseGate: 0.6, compressor: 0.5 }) },
  { name: 'Nu-Metal', artist: 'Wes Borland', genre: 'Nu-Metal', description: 'Heavy downtuned with industrial edge',
    keywords: ['limp bizkit', 'wes borland', 'korn', 'nu metal', 'deftones', 'linkin park', 'system of a down', 'slipknot', 'drop tuning'],
    settings: p({ distortion: 0.65, gain: 0.85, eqBass: 0.7, eqMid: 0.45, eqTreble: 0.55, noiseGate: 0.4, flanger: 0.15 }) },
  { name: 'Shred Lead', artist: 'Steve Vai', genre: 'Rock', description: 'Smooth singing lead tone with sustain',
    youtubeRef: 'For the Love of God', keywords: ['steve vai', 'for the love of god', 'joe satriani', 'shred', 'yngwie malmsteen', 'paul gilbert', 'guitar virtuoso'],
    settings: p({ distortion: 0.55, gain: 0.8, reverb: 0.3, delay: 0.2, delayTime: 0.35, eqMid: 0.65, compressor: 0.4 }) },
  { name: 'Doom Sludge', artist: 'Electric Wizard', genre: 'Doom', description: 'Massive fuzzy wall of sound',
    keywords: ['electric wizard', 'doom metal', 'black sabbath', 'sludge', 'stoner metal', 'sleep', 'sabbath'],
    settings: p({ distortion: 0.85, gain: 0.9, eqBass: 0.75, eqMid: 0.5, eqTreble: 0.4, reverb: 0.3 }) },
  { name: 'Deathcore', artist: 'August Burns Red', genre: 'Metal', description: 'Brutal tight gain with aggressive EQ',
    keywords: ['august burns red', 'deathcore', 'metalcore', 'as i lay dying', 'parkway drive', 'killswitch engage', 'breakdown'],
    settings: p({ distortion: 0.8, gain: 0.9, eqBass: 0.6, eqMid: 0.35, eqTreble: 0.7, noiseGate: 0.6, compressor: 0.45 }) },

  // Modulated & Experimental
  { name: 'Gilmour Solo', artist: 'David Gilmour', genre: 'Progressive Rock', description: 'Singing lead with lush delay and reverb',
    youtubeRef: 'Comfortably Numb', keywords: ['david gilmour', 'pink floyd', 'comfortably numb', 'time', 'money', 'wish you were here', 'shine on'],
    settings: p({ distortion: 0.25, gain: 0.7, reverb: 0.55, delay: 0.45, delayTime: 0.45, compressor: 0.3, phaser: 0.15 }) },
  { name: 'Wah Funk', artist: 'Jimi Hendrix', genre: 'Rock', description: 'Voodoo Chile style wah rhythm',
    youtubeRef: 'Voodoo Child', keywords: ['voodoo child', 'wah guitar', 'hendrix wah', 'cry baby', 'kirk hammett wah'],
    settings: p({ distortion: 0.35, gain: 0.75, wah: 0.7, wahFreq: 0.6, eqMid: 0.6, reverb: 0.15 }) },
  { name: 'Shoegaze', artist: 'My Bloody Valentine', genre: 'Shoegaze', description: 'Dreamy wall of modulated noise',
    keywords: ['my bloody valentine', 'shoegaze', 'slowdive', 'ride', 'loveless', 'dream pop', 'cocteau twins'],
    settings: p({ distortion: 0.35, reverb: 0.8, chorus: 0.5, chorusRate: 0.8, tremolo: 0.2, tremoloRate: 3, delay: 0.3, delayTime: 0.4, gain: 0.65 }) },
  { name: 'Tom Morello', artist: 'Tom Morello', genre: 'Rock', description: 'RATM-style aggressive tone',
    youtubeRef: 'Killing in the Name', keywords: ['tom morello', 'rage against the machine', 'ratm', 'killing in the name', 'bulls on parade', 'audioslave'],
    settings: p({ distortion: 0.7, gain: 0.9, eqBass: 0.5, eqMid: 0.6, eqTreble: 0.55, noiseGate: 0.4, wah: 0.3, wahFreq: 0.7 }) },
  { name: 'Reggae Clean', artist: 'Bob Marley', genre: 'Reggae', description: 'Dark clean with tight chop',
    keywords: ['bob marley', 'reggae', 'ska', 'dub', 'no woman no cry', 'peter tosh'],
    settings: p({ gain: 0.6, eqBass: 0.4, eqMid: 0.45, eqTreble: 0.35, compressor: 0.4, reverb: 0.15 }) },
  { name: 'Surf Rock', artist: 'Dick Dale', genre: 'Surf', description: 'Drenched spring reverb with tremolo',
    youtubeRef: 'Misirlou', keywords: ['dick dale', 'misirlou', 'surf rock', 'beach boys', 'ventures', 'pulp fiction guitar', 'spring reverb'],
    settings: p({ gain: 0.75, reverb: 0.6, tremolo: 0.5, tremoloRate: 6, eqTreble: 0.65, compressor: 0.2 }) },
  { name: '80s Ballad', artist: 'Slash', genre: 'Rock', description: 'Sweet singing lead with chorus and delay',
    youtubeRef: 'November Rain', keywords: ['slash', 'guns n roses', 'november rain', 'sweet child o mine', 'paradise city', 'les paul lead'],
    settings: p({ distortion: 0.35, gain: 0.75, chorus: 0.3, reverb: 0.4, delay: 0.3, delayTime: 0.35, eqMid: 0.6, compressor: 0.3 }) },
  { name: 'Lo-Fi', artist: 'Mac DeMarco', genre: 'Indie', description: 'Wobbly chorus with warm character',
    keywords: ['mac demarco', 'lo-fi', 'lofi', 'indie rock', 'bedroom pop', 'tame impala clean'],
    settings: p({ gain: 0.6, chorus: 0.5, chorusRate: 2, eqBass: 0.55, eqTreble: 0.35, reverb: 0.2 }) },
  { name: 'Octave Fuzz', artist: 'Jack White', genre: 'Garage', description: 'Raw octave-up distortion',
    youtubeRef: 'Seven Nation Army', keywords: ['jack white', 'white stripes', 'seven nation army', 'garage rock', 'octave fuzz', 'black keys'],
    settings: p({ distortion: 0.6, gain: 0.85, octaver: 0.5, octaverMix: 0.4, eqMid: 0.6, noiseGate: 0.3 }) },
  { name: 'Post-Rock', artist: 'Explosions in the Sky', genre: 'Post-Rock', description: 'Atmospheric swells with massive reverb',
    keywords: ['explosions in the sky', 'post rock', 'mogwai', 'godspeed', 'sigur ros', 'ambient guitar', 'atmospheric'],
    settings: p({ gain: 0.6, reverb: 0.75, delay: 0.5, delayTime: 0.5, tremolo: 0.15, tremoloRate: 2, chorus: 0.2, eqTreble: 0.6 }) },
  { name: 'Tame Impala', artist: 'Kevin Parker', genre: 'Psychedelic', description: 'Dreamy phased psychedelia with fuzz',
    youtubeRef: 'Elephant', keywords: ['tame impala', 'kevin parker', 'elephant', 'the less i know', 'psychedelic rock', 'currents'],
    settings: p({ distortion: 0.4, gain: 0.7, phaser: 0.45, phaserRate: 0.5, reverb: 0.4, delay: 0.25, chorus: 0.15, eqMid: 0.55 }) },
  { name: 'Arctic Monkeys', artist: 'Alex Turner', genre: 'Indie Rock', description: 'Garage-tinged indie crunch',
    youtubeRef: 'Do I Wanna Know', keywords: ['arctic monkeys', 'alex turner', 'do i wanna know', 'r u mine', 'indie crunch'],
    settings: p({ distortion: 0.35, gain: 0.8, eqBass: 0.55, eqMid: 0.6, eqTreble: 0.55, reverb: 0.15, compressor: 0.2 }) },
  { name: 'Van Halen', artist: 'Eddie Van Halen', genre: 'Rock', description: 'Brown sound - warm high gain with phaser',
    youtubeRef: 'Eruption', keywords: ['van halen', 'eddie van halen', 'eruption', 'jump', 'panama', 'brown sound', 'tapping'],
    settings: p({ distortion: 0.6, gain: 0.85, phaser: 0.2, phaserRate: 0.4, eqMid: 0.65, eqTreble: 0.6, reverb: 0.15, flanger: 0.1 }) },
  { name: 'R&B Soul', artist: 'John Mayer', genre: 'R&B', description: 'Smooth clean R&B with warm compression',
    keywords: ['r&b guitar', 'soul guitar', 'neo soul', 'erykah badu', 'daniel caesar', 'smooth clean'],
    settings: p({ gain: 0.65, compressor: 0.45, eqBass: 0.55, eqMid: 0.55, eqTreble: 0.5, chorus: 0.1, reverb: 0.2 }) },
  { name: 'Flamenco', artist: 'Paco de Lucía', genre: 'Flamenco', description: 'Bright percussive acoustic-style tone',
    keywords: ['flamenco', 'paco de lucia', 'spanish guitar', 'classical guitar', 'nylon', 'acoustic'],
    settings: p({ gain: 0.7, eqBass: 0.4, eqMid: 0.5, eqTreble: 0.7, compressor: 0.35, reverb: 0.25 }) },
];

export const GENRE_CATEGORIES = ['All', 'Blues/Pop', 'Blues', 'Jazz', 'Funk', 'Country', 'Rock', 'Punk', 'Grunge', 'Metal', 'Progressive Metal', 'Nu-Metal', 'Doom', 'Progressive Rock', 'Shoegaze', 'Psychedelic', 'Indie Rock', 'R&B', 'Reggae', 'Surf', 'Indie', 'Garage', 'Post-Rock', 'Flamenco'] as const;

/** Fuzzy-match a YouTube video title against preset keywords. Returns presets sorted by relevance score. */
export function matchPresetsToTitle(title: string): { preset: TonePreset; score: number }[] {
  const lower = title.toLowerCase();
  const titleWords = lower.split(/[\s\-–—_|,.()\[\]]+/).filter(w => w.length > 2);

  return TONE_PRESETS.map(preset => {
    let score = 0;

    // Check keywords
    for (const kw of preset.keywords) {
      if (lower.includes(kw)) {
        score += kw.split(' ').length * 3; // Multi-word matches score higher
      } else {
        // Partial word matching
        const kwWords = kw.split(' ');
        for (const kwWord of kwWords) {
          if (kwWord.length > 2 && titleWords.some(tw => tw.includes(kwWord) || kwWord.includes(tw))) {
            score += 1;
          }
        }
      }
    }

    // Check artist name
    if (lower.includes(preset.artist.toLowerCase())) score += 5;

    // Check genre
    if (lower.includes(preset.genre.toLowerCase())) score += 2;

    // Check youtubeRef (song name)
    if (preset.youtubeRef && lower.includes(preset.youtubeRef.toLowerCase())) score += 6;

    // Check preset name
    if (lower.includes(preset.name.toLowerCase())) score += 3;

    return { preset, score };
  })
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score);
}
