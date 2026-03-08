import type { EffectSettings } from '@/hooks/useGuitarEffects';

export interface TonePreset {
  name: string;
  artist: string;
  genre: string;
  description: string;
  youtubeRef?: string;
  keywords: string[];
  tags: string[]; // genre/style tags for genre detection
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
  // ── Clean ──────────────────────────────────────
  { name: 'Sparkling Clean', artist: 'John Mayer', genre: 'Blues/Pop', description: 'Crystal clear Strat clean with subtle compression',
    youtubeRef: 'Gravity', keywords: ['john mayer', 'gravity', 'waiting on the world', 'slow dancing', 'strat clean', 'blues pop clean'],
    tags: ['clean', 'blues', 'pop', 'strat'],
    settings: p({ gain: 0.7, compressor: 0.3, eqTreble: 0.65, reverb: 0.2, chorus: 0.15 }) },
  { name: 'Jazz Warm', artist: 'Joe Pass', genre: 'Jazz', description: 'Warm rounded jazz tone with rolled-off treble',
    keywords: ['joe pass', 'jazz guitar', 'wes montgomery', 'bossa nova', 'jazz clean', 'warm jazz', 'pat metheny', 'george benson', 'grant green'],
    tags: ['jazz', 'clean', 'warm', 'smooth', 'bossa'],
    settings: p({ gain: 0.6, eqBass: 0.6, eqMid: 0.55, eqTreble: 0.3, reverb: 0.15, compressor: 0.2 }) },
  { name: 'Funk Clean', artist: 'Nile Rodgers', genre: 'Funk', description: 'Tight percussive clean with compression',
    youtubeRef: 'Le Freak', keywords: ['nile rodgers', 'le freak', 'chic', 'funk guitar', 'get lucky', 'daft punk guitar', 'disco guitar'],
    tags: ['funk', 'clean', 'disco', 'percussive', 'rhythmic'],
    settings: p({ gain: 0.75, compressor: 0.6, eqBass: 0.4, eqMid: 0.6, eqTreble: 0.7, noiseGate: 0.3 }) },
  { name: 'Country Twang', artist: 'Brad Paisley', genre: 'Country', description: 'Bright clean with snappy compression',
    keywords: ['brad paisley', 'country guitar', 'chicken pickin', 'telecaster', 'nashville', 'country twang', 'keith urban', 'vince gill'],
    tags: ['country', 'clean', 'twang', 'telecaster', 'nashville'],
    settings: p({ gain: 0.7, compressor: 0.5, eqBass: 0.4, eqTreble: 0.75, chorus: 0.1, reverb: 0.15 }) },
  { name: 'Indie Shimmer', artist: 'The Edge', genre: 'Rock', description: 'Ambient clean with delay and modulation',
    youtubeRef: 'Where The Streets Have No Name', keywords: ['the edge', 'u2', 'where the streets', 'with or without you', 'ambient guitar', 'delay shimmer'],
    tags: ['ambient', 'clean', 'delay', 'shimmer', 'atmospheric'],
    settings: p({ gain: 0.65, delay: 0.4, delayTime: 0.35, reverb: 0.4, chorus: 0.2, eqTreble: 0.65 }) },
  { name: 'Acoustic Fingerstyle', artist: 'Tommy Emmanuel', genre: 'Acoustic', description: 'Full-bodied acoustic with natural warmth',
    keywords: ['tommy emmanuel', 'fingerstyle', 'acoustic guitar', 'fingerpicking', 'andy mckee', 'sungha jung', 'unplugged'],
    tags: ['acoustic', 'fingerstyle', 'unplugged', 'clean', 'natural'],
    settings: p({ gain: 0.65, compressor: 0.35, eqBass: 0.55, eqMid: 0.55, eqTreble: 0.6, reverb: 0.25 }) },
  { name: 'Gospel Clean', artist: 'Kerry 2 Smooth', genre: 'Gospel', description: 'Bright sparkling clean with modulation',
    keywords: ['gospel guitar', 'church guitar', 'worship guitar', 'praise', 'gospel lead'],
    tags: ['gospel', 'clean', 'worship', 'church', 'bright'],
    settings: p({ gain: 0.7, compressor: 0.4, eqTreble: 0.7, chorus: 0.25, chorusRate: 1.2, reverb: 0.3, delay: 0.15 }) },

  // ── Crunch ─────────────────────────────────────
  { name: 'Blues Crunch', artist: 'SRV', genre: 'Blues', description: 'Texas blues overdrive with warm mids',
    youtubeRef: 'Pride and Joy', keywords: ['srv', 'stevie ray vaughan', 'pride and joy', 'texas flood', 'texas blues', 'blues overdrive', 'bb king', 'albert king', 'buddy guy', 'john lee hooker'],
    tags: ['blues', 'crunch', 'overdrive', 'texas', 'warm'],
    settings: p({ distortion: 0.3, gain: 0.8, eqBass: 0.55, eqMid: 0.65, eqTreble: 0.55, reverb: 0.2, compressor: 0.2 }) },
  { name: 'Classic Rock', artist: 'AC/DC', genre: 'Rock', description: 'Marshall-style crunch, punchy mids',
    youtubeRef: 'Back in Black', keywords: ['ac/dc', 'acdc', 'back in black', 'highway to hell', 'thunderstruck', 'angus young', 'marshall crunch', 'classic rock', 'led zeppelin', 'deep purple', 'aerosmith'],
    tags: ['rock', 'classic', 'crunch', 'marshall', 'british'],
    settings: p({ distortion: 0.4, gain: 0.85, eqBass: 0.6, eqMid: 0.7, eqTreble: 0.6, noiseGate: 0.2 }) },
  { name: 'Punk Rock', artist: 'Green Day', genre: 'Punk', description: 'Aggressive mid-forward crunch',
    youtubeRef: 'American Idiot', keywords: ['green day', 'american idiot', 'basket case', 'blink 182', 'punk rock', 'ramones', 'offspring', 'bad religion', 'sum 41', 'nofx'],
    tags: ['punk', 'crunch', 'aggressive', 'fast', 'power chord'],
    settings: p({ distortion: 0.45, gain: 0.9, eqBass: 0.5, eqMid: 0.7, eqTreble: 0.6, compressor: 0.3, noiseGate: 0.3 }) },
  { name: 'Vintage Overdrive', artist: 'Jimi Hendrix', genre: 'Rock', description: 'Warm fuzz-like overdrive with psychedelic vibe',
    youtubeRef: 'Purple Haze', keywords: ['hendrix', 'purple haze', 'foxy lady', 'all along the watchtower', 'psychedelic', 'fuzz', 'vintage overdrive', 'experience'],
    tags: ['psychedelic', 'vintage', 'fuzz', 'overdrive', '60s'],
    settings: p({ distortion: 0.45, gain: 0.75, reverb: 0.35, phaser: 0.3, phaserRate: 0.6, eqMid: 0.6 }) },
  { name: 'Grunge', artist: 'Nirvana', genre: 'Grunge', description: 'Raw scooped distortion with attitude',
    youtubeRef: 'Smells Like Teen Spirit', keywords: ['nirvana', 'smells like teen spirit', 'come as you are', 'kurt cobain', 'grunge', 'pearl jam', 'soundgarden', 'alice in chains', 'stone temple pilots', 'mudhoney'],
    tags: ['grunge', 'alternative', '90s', 'raw', 'scooped'],
    settings: p({ distortion: 0.55, gain: 0.85, eqBass: 0.6, eqMid: 0.35, eqTreble: 0.55, chorus: 0.1, noiseGate: 0.25 }) },
  { name: 'Blues Rock', artist: 'Gary Moore', genre: 'Blues', description: 'Singing blues-rock lead tone',
    youtubeRef: 'Still Got The Blues', keywords: ['gary moore', 'still got the blues', 'parisienne walkways', 'peter green', 'blues rock lead', 'joe bonamassa'],
    tags: ['blues', 'rock', 'lead', 'singing', 'sustain'],
    settings: p({ distortion: 0.35, gain: 0.8, reverb: 0.25, delay: 0.15, eqMid: 0.65, eqTreble: 0.55, compressor: 0.25 }) },
  { name: 'Southern Rock', artist: 'Lynyrd Skynyrd', genre: 'Southern Rock', description: 'Open crunchy tone with warm sustain',
    youtubeRef: 'Free Bird', keywords: ['lynyrd skynyrd', 'free bird', 'allman brothers', 'southern rock', 'zz top', 'molly hatchet', 'marshall tucker'],
    tags: ['southern', 'rock', 'crunch', 'warm', 'open'],
    settings: p({ distortion: 0.35, gain: 0.8, eqBass: 0.55, eqMid: 0.6, eqTreble: 0.55, reverb: 0.2, compressor: 0.2 }) },
  { name: 'Pop Rock', artist: 'Foo Fighters', genre: 'Rock', description: 'Radio-friendly crunch with big power chords',
    youtubeRef: 'Everlong', keywords: ['foo fighters', 'everlong', 'dave grohl', 'best of you', 'learn to fly', 'my hero', 'pop rock'],
    tags: ['pop', 'rock', 'crunch', 'radio', 'alternative'],
    settings: p({ distortion: 0.4, gain: 0.85, eqBass: 0.55, eqMid: 0.6, eqTreble: 0.6, reverb: 0.15, compressor: 0.25 }) },

  // ── High Gain ──────────────────────────────────
  { name: 'Metal Rhythm', artist: 'Metallica', genre: 'Metal', description: 'Tight palm-muted metal rhythm tone',
    youtubeRef: 'Master of Puppets', keywords: ['metallica', 'master of puppets', 'enter sandman', 'one', 'metal rhythm', 'thrash metal', 'james hetfield', 'megadeth', 'slayer', 'anthrax', 'testament'],
    tags: ['metal', 'thrash', 'rhythm', 'tight', 'heavy', 'palm mute'],
    settings: p({ distortion: 0.7, gain: 0.85, eqBass: 0.55, eqMid: 0.4, eqTreble: 0.65, noiseGate: 0.5, compressor: 0.3 }) },
  { name: 'Djent', artist: 'Periphery', genre: 'Progressive Metal', description: 'Ultra-tight modern metal with scooped mids',
    keywords: ['periphery', 'djent', 'meshuggah', 'animals as leaders', 'modern metal', 'progressive metal', 'polyphia', '8 string', 'tosin abasi'],
    tags: ['djent', 'progressive', 'metal', 'modern', 'tight', 'extended range'],
    settings: p({ distortion: 0.75, gain: 0.9, eqBass: 0.6, eqMid: 0.3, eqTreble: 0.7, noiseGate: 0.6, compressor: 0.5 }) },
  { name: 'Nu-Metal', artist: 'Wes Borland', genre: 'Nu-Metal', description: 'Heavy downtuned with industrial edge',
    keywords: ['limp bizkit', 'wes borland', 'korn', 'nu metal', 'deftones', 'linkin park', 'system of a down', 'slipknot', 'drop tuning', 'disturbed', 'papa roach'],
    tags: ['nu-metal', 'heavy', 'downtune', 'industrial', '2000s'],
    settings: p({ distortion: 0.65, gain: 0.85, eqBass: 0.7, eqMid: 0.45, eqTreble: 0.55, noiseGate: 0.4, flanger: 0.15 }) },
  { name: 'Shred Lead', artist: 'Steve Vai', genre: 'Rock', description: 'Smooth singing lead tone with sustain',
    youtubeRef: 'For the Love of God', keywords: ['steve vai', 'for the love of god', 'joe satriani', 'shred', 'yngwie malmsteen', 'paul gilbert', 'guitar virtuoso', 'guthrie govan', 'buckethead'],
    tags: ['shred', 'lead', 'virtuoso', 'sweep', 'legato'],
    settings: p({ distortion: 0.55, gain: 0.8, reverb: 0.3, delay: 0.2, delayTime: 0.35, eqMid: 0.65, compressor: 0.4 }) },
  { name: 'Doom Sludge', artist: 'Electric Wizard', genre: 'Doom', description: 'Massive fuzzy wall of sound',
    keywords: ['electric wizard', 'doom metal', 'black sabbath', 'sludge', 'stoner metal', 'sleep', 'sabbath', 'eyehategod', 'bongripper'],
    tags: ['doom', 'sludge', 'stoner', 'fuzz', 'heavy', 'slow'],
    settings: p({ distortion: 0.85, gain: 0.9, eqBass: 0.75, eqMid: 0.5, eqTreble: 0.4, reverb: 0.3 }) },
  { name: 'Deathcore', artist: 'August Burns Red', genre: 'Metal', description: 'Brutal tight gain with aggressive EQ',
    keywords: ['august burns red', 'deathcore', 'metalcore', 'as i lay dying', 'parkway drive', 'killswitch engage', 'breakdown', 'trivium', 'bullet for my valentine', 'all that remains'],
    tags: ['deathcore', 'metalcore', 'breakdown', 'brutal', 'aggressive'],
    settings: p({ distortion: 0.8, gain: 0.9, eqBass: 0.6, eqMid: 0.35, eqTreble: 0.7, noiseGate: 0.6, compressor: 0.45 }) },
  { name: 'Black Metal', artist: 'Dimmu Borgir', genre: 'Black Metal', description: 'Buzzy tremolo-picked raw distortion',
    keywords: ['dimmu borgir', 'black metal', 'mayhem', 'burzum', 'darkthrone', 'emperor', 'cradle of filth', 'immortal'],
    tags: ['black metal', 'raw', 'tremolo', 'blast beat', 'extreme'],
    settings: p({ distortion: 0.75, gain: 0.85, eqBass: 0.45, eqMid: 0.4, eqTreble: 0.7, noiseGate: 0.5, reverb: 0.15 }) },
  { name: 'Death Metal', artist: 'Death', genre: 'Death Metal', description: 'Thick brutal gain with scooped mids',
    keywords: ['death', 'chuck schuldiner', 'death metal', 'cannibal corpse', 'morbid angel', 'obituary', 'deicide', 'nile'],
    tags: ['death metal', 'brutal', 'extreme', 'heavy', 'technical'],
    settings: p({ distortion: 0.8, gain: 0.9, eqBass: 0.65, eqMid: 0.3, eqTreble: 0.65, noiseGate: 0.55, compressor: 0.4 }) },
  { name: 'Power Metal', artist: 'Helloween', genre: 'Power Metal', description: 'Bright high-gain with soaring lead character',
    keywords: ['helloween', 'power metal', 'dragonforce', 'blind guardian', 'stratovarius', 'rhapsody', 'gamma ray', 'through the fire and flames'],
    tags: ['power metal', 'bright', 'fast', 'soaring', 'epic'],
    settings: p({ distortion: 0.6, gain: 0.85, eqBass: 0.5, eqMid: 0.55, eqTreble: 0.7, delay: 0.15, reverb: 0.2, compressor: 0.3 }) },

  // ── Modulated & Experimental ───────────────────
  { name: 'Gilmour Solo', artist: 'David Gilmour', genre: 'Progressive Rock', description: 'Singing lead with lush delay and reverb',
    youtubeRef: 'Comfortably Numb', keywords: ['david gilmour', 'pink floyd', 'comfortably numb', 'time', 'money', 'wish you were here', 'shine on'],
    tags: ['progressive', 'lead', 'delay', 'reverb', 'lush', '70s'],
    settings: p({ distortion: 0.25, gain: 0.7, reverb: 0.55, delay: 0.45, delayTime: 0.45, compressor: 0.3, phaser: 0.15 }) },
  { name: 'Wah Funk', artist: 'Jimi Hendrix', genre: 'Rock', description: 'Voodoo Chile style wah rhythm',
    youtubeRef: 'Voodoo Child', keywords: ['voodoo child', 'wah guitar', 'hendrix wah', 'cry baby', 'kirk hammett wah'],
    tags: ['wah', 'funk', 'psychedelic', 'expressive'],
    settings: p({ distortion: 0.35, gain: 0.75, wah: 0.7, wahFreq: 0.6, eqMid: 0.6, reverb: 0.15 }) },
  { name: 'Shoegaze', artist: 'My Bloody Valentine', genre: 'Shoegaze', description: 'Dreamy wall of modulated noise',
    keywords: ['my bloody valentine', 'shoegaze', 'slowdive', 'ride', 'loveless', 'dream pop', 'cocteau twins', 'nothing', 'whirr'],
    tags: ['shoegaze', 'dreamy', 'wall of sound', 'modulated', 'noise'],
    settings: p({ distortion: 0.35, reverb: 0.8, chorus: 0.5, chorusRate: 0.8, tremolo: 0.2, tremoloRate: 3, delay: 0.3, delayTime: 0.4, gain: 0.65 }) },
  { name: 'Tom Morello', artist: 'Tom Morello', genre: 'Rock', description: 'RATM-style aggressive tone',
    youtubeRef: 'Killing in the Name', keywords: ['tom morello', 'rage against the machine', 'ratm', 'killing in the name', 'bulls on parade', 'audioslave'],
    tags: ['aggressive', 'political', 'funk metal', 'riff'],
    settings: p({ distortion: 0.7, gain: 0.9, eqBass: 0.5, eqMid: 0.6, eqTreble: 0.55, noiseGate: 0.4, wah: 0.3, wahFreq: 0.7 }) },
  { name: 'Reggae Clean', artist: 'Bob Marley', genre: 'Reggae', description: 'Dark clean with tight chop',
    keywords: ['bob marley', 'reggae', 'ska', 'dub', 'no woman no cry', 'peter tosh', 'sublime'],
    tags: ['reggae', 'ska', 'dub', 'clean', 'chop'],
    settings: p({ gain: 0.6, eqBass: 0.4, eqMid: 0.45, eqTreble: 0.35, compressor: 0.4, reverb: 0.15 }) },
  { name: 'Surf Rock', artist: 'Dick Dale', genre: 'Surf', description: 'Drenched spring reverb with tremolo',
    youtubeRef: 'Misirlou', keywords: ['dick dale', 'misirlou', 'surf rock', 'beach boys', 'ventures', 'pulp fiction guitar', 'spring reverb'],
    tags: ['surf', 'reverb', 'tremolo', 'retro', '60s'],
    settings: p({ gain: 0.75, reverb: 0.6, tremolo: 0.5, tremoloRate: 6, eqTreble: 0.65, compressor: 0.2 }) },
  { name: '80s Ballad', artist: 'Slash', genre: 'Rock', description: 'Sweet singing lead with chorus and delay',
    youtubeRef: 'November Rain', keywords: ['slash', 'guns n roses', 'november rain', 'sweet child o mine', 'paradise city', 'les paul lead', 'appetite for destruction'],
    tags: ['80s', 'ballad', 'lead', 'hair metal', 'glam'],
    settings: p({ distortion: 0.35, gain: 0.75, chorus: 0.3, reverb: 0.4, delay: 0.3, delayTime: 0.35, eqMid: 0.6, compressor: 0.3 }) },
  { name: 'Lo-Fi', artist: 'Mac DeMarco', genre: 'Indie', description: 'Wobbly chorus with warm character',
    keywords: ['mac demarco', 'lo-fi', 'lofi', 'indie rock', 'bedroom pop', 'tame impala clean', 'men i trust', 'boy pablo'],
    tags: ['lofi', 'indie', 'bedroom', 'wobbly', 'warm', 'chill'],
    settings: p({ gain: 0.6, chorus: 0.5, chorusRate: 2, eqBass: 0.55, eqTreble: 0.35, reverb: 0.2 }) },
  { name: 'Octave Fuzz', artist: 'Jack White', genre: 'Garage', description: 'Raw octave-up distortion',
    youtubeRef: 'Seven Nation Army', keywords: ['jack white', 'white stripes', 'seven nation army', 'garage rock', 'octave fuzz', 'black keys'],
    tags: ['garage', 'fuzz', 'octave', 'raw', 'lo-fi'],
    settings: p({ distortion: 0.6, gain: 0.85, octaver: 0.5, octaverMix: 0.4, eqMid: 0.6, noiseGate: 0.3 }) },
  { name: 'Post-Rock', artist: 'Explosions in the Sky', genre: 'Post-Rock', description: 'Atmospheric swells with massive reverb',
    keywords: ['explosions in the sky', 'post rock', 'mogwai', 'godspeed', 'sigur ros', 'ambient guitar', 'atmospheric', 'russian circles', 'this will destroy you'],
    tags: ['post-rock', 'ambient', 'atmospheric', 'swell', 'cinematic'],
    settings: p({ gain: 0.6, reverb: 0.75, delay: 0.5, delayTime: 0.5, tremolo: 0.15, tremoloRate: 2, chorus: 0.2, eqTreble: 0.6 }) },
  { name: 'Tame Impala', artist: 'Kevin Parker', genre: 'Psychedelic', description: 'Dreamy phased psychedelia with fuzz',
    youtubeRef: 'Elephant', keywords: ['tame impala', 'kevin parker', 'elephant', 'the less i know', 'psychedelic rock', 'currents', 'let it happen'],
    tags: ['psychedelic', 'phaser', 'dreamy', 'modern psych', 'fuzz'],
    settings: p({ distortion: 0.4, gain: 0.7, phaser: 0.45, phaserRate: 0.5, reverb: 0.4, delay: 0.25, chorus: 0.15, eqMid: 0.55 }) },
  { name: 'Arctic Monkeys', artist: 'Alex Turner', genre: 'Indie Rock', description: 'Garage-tinged indie crunch',
    youtubeRef: 'Do I Wanna Know', keywords: ['arctic monkeys', 'alex turner', 'do i wanna know', 'r u mine', 'indie crunch', '505', 'fluorescent'],
    tags: ['indie', 'garage', 'crunch', 'british', 'alternative'],
    settings: p({ distortion: 0.35, gain: 0.8, eqBass: 0.55, eqMid: 0.6, eqTreble: 0.55, reverb: 0.15, compressor: 0.2 }) },
  { name: 'Van Halen', artist: 'Eddie Van Halen', genre: 'Rock', description: 'Brown sound - warm high gain with phaser',
    youtubeRef: 'Eruption', keywords: ['van halen', 'eddie van halen', 'eruption', 'jump', 'panama', 'brown sound', 'tapping', 'hot for teacher'],
    tags: ['80s', 'shred', 'brown sound', 'phaser', 'tapping'],
    settings: p({ distortion: 0.6, gain: 0.85, phaser: 0.2, phaserRate: 0.4, eqMid: 0.65, eqTreble: 0.6, reverb: 0.15, flanger: 0.1 }) },
  { name: 'R&B Soul', artist: 'Isaiah Sharkey', genre: 'R&B', description: 'Smooth clean R&B with warm compression',
    keywords: ['r&b guitar', 'soul guitar', 'neo soul', 'erykah badu', 'daniel caesar', 'smooth clean', 'isaiah sharkey', 'tom misch', 'frank ocean guitar'],
    tags: ['r&b', 'soul', 'neo soul', 'smooth', 'warm'],
    settings: p({ gain: 0.65, compressor: 0.45, eqBass: 0.55, eqMid: 0.55, eqTreble: 0.5, chorus: 0.1, reverb: 0.2 }) },
  { name: 'Flamenco', artist: 'Paco de Lucía', genre: 'Flamenco', description: 'Bright percussive acoustic-style tone',
    keywords: ['flamenco', 'paco de lucia', 'spanish guitar', 'classical guitar', 'nylon', 'acoustic', 'al di meola'],
    tags: ['flamenco', 'spanish', 'classical', 'nylon', 'acoustic'],
    settings: p({ gain: 0.7, eqBass: 0.4, eqMid: 0.5, eqTreble: 0.7, compressor: 0.35, reverb: 0.25 }) },
  { name: 'EDM Guitar', artist: 'Martin Garrix', genre: 'EDM', description: 'Compressed clean with heavy modulation for electronic tracks',
    keywords: ['edm guitar', 'electronic', 'dance', 'house guitar', 'dubstep guitar', 'martin garrix', 'illenium'],
    tags: ['edm', 'electronic', 'dance', 'compressed', 'modern'],
    settings: p({ gain: 0.75, compressor: 0.6, chorus: 0.35, chorusRate: 1.8, delay: 0.3, delayTime: 0.25, eqTreble: 0.65, noiseGate: 0.3 }) },
  { name: 'Math Rock', artist: 'CHON', genre: 'Math Rock', description: 'Snappy clean with tight articulation',
    keywords: ['chon', 'math rock', 'polyphia', 'covet', 'yvette young', 'ttng', 'tap guitar', 'two handed tapping'],
    tags: ['math rock', 'clean', 'technical', 'tapping', 'progressive'],
    settings: p({ gain: 0.7, compressor: 0.5, eqBass: 0.45, eqMid: 0.55, eqTreble: 0.65, delay: 0.15, delayTime: 0.2, reverb: 0.15 }) },
  { name: 'Midwest Emo', artist: 'American Football', genre: 'Emo', description: 'Twinkly clean with shimmering delay',
    keywords: ['american football', 'midwest emo', 'emo guitar', 'twinkle', 'cap n jazz', 'tiny moving parts', 'modern baseball'],
    tags: ['emo', 'twinkle', 'clean', 'indie', 'midwest'],
    settings: p({ gain: 0.65, delay: 0.35, delayTime: 0.3, reverb: 0.3, chorus: 0.15, eqTreble: 0.65, compressor: 0.25 }) },
  { name: 'Stoner Fuzz', artist: 'Kyuss', genre: 'Stoner Rock', description: 'Thick fuzzy desert tone',
    keywords: ['kyuss', 'stoner rock', 'queens of the stone age', 'qotsa', 'fu manchu', 'desert rock', 'fuzzy'],
    tags: ['stoner', 'fuzz', 'desert', 'heavy', 'thick'],
    settings: p({ distortion: 0.7, gain: 0.85, eqBass: 0.65, eqMid: 0.55, eqTreble: 0.45, reverb: 0.2, phaser: 0.1 }) },
  { name: 'Synthwave Guitar', artist: 'Gunship', genre: 'Synthwave', description: 'Retro 80s lead with heavy chorus and delay',
    keywords: ['synthwave', 'retrowave', 'outrun', 'gunship', '80s synth guitar', 'neon'],
    tags: ['synthwave', '80s', 'retro', 'neon', 'chorus'],
    settings: p({ gain: 0.7, distortion: 0.2, chorus: 0.5, chorusRate: 1.5, delay: 0.4, delayTime: 0.35, reverb: 0.45, eqTreble: 0.6 }) },
];

export const GENRE_CATEGORIES = [
  'All', 'Acoustic', 'Blues', 'Blues/Pop', 'Black Metal', 'Country', 'Death Metal',
  'Doom', 'EDM', 'Emo', 'Flamenco', 'Funk', 'Garage', 'Gospel', 'Grunge',
  'Indie', 'Indie Rock', 'Jazz', 'Math Rock', 'Metal', 'Nu-Metal', 'Post-Rock',
  'Power Metal', 'Progressive Metal', 'Progressive Rock', 'Psychedelic', 'Punk',
  'R&B', 'Reggae', 'Rock', 'Shoegaze', 'Southern Rock', 'Stoner Rock', 'Surf', 'Synthwave',
] as const;

// ── Fuzzy String Matching ──────────────────────────

/** Levenshtein distance for fuzzy comparison */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Returns 0–1 similarity score between two strings */
function fuzzySimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ── Genre Detection from Title ─────────────────────

const GENRE_KEYWORDS: Record<string, string[]> = {
  metal: ['metal', 'thrash', 'heavy', 'shred', 'riff', 'breakdown', 'headbang'],
  blues: ['blues', 'bluesy', 'b.b. king', '12 bar', 'shuffle'],
  jazz: ['jazz', 'swing', 'bebop', 'bossa', 'smooth jazz', 'fusion'],
  rock: ['rock', 'rocking', 'guitar solo', 'power chord', 'hard rock'],
  punk: ['punk', 'hardcore', 'pop punk', 'skate punk'],
  country: ['country', 'nashville', 'bluegrass', 'honky tonk', 'outlaw country'],
  funk: ['funk', 'funky', 'groove', 'slap', 'disco'],
  indie: ['indie', 'alternative', 'lo-fi', 'bedroom', 'dream pop'],
  psychedelic: ['psychedelic', 'psych', 'trippy', 'acid'],
  acoustic: ['acoustic', 'unplugged', 'fingerstyle', 'campfire'],
  reggae: ['reggae', 'ska', 'dub', 'roots'],
  electronic: ['edm', 'electronic', 'synth', 'dubstep', 'house'],
  emo: ['emo', 'screamo', 'midwest emo', 'post-hardcore'],
  doom: ['doom', 'sludge', 'stoner', 'desert rock'],
  progressive: ['prog', 'progressive', 'math rock', 'odd time'],
  shoegaze: ['shoegaze', 'dream pop', 'noise pop', 'ethereal'],
  grunge: ['grunge', '90s alternative', 'seattle'],
  classical: ['classical', 'flamenco', 'spanish guitar', 'nylon'],
};

/** Detect likely genres from a video title */
function detectGenres(title: string): string[] {
  const lower = title.toLowerCase();
  const detected: string[] = [];
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(genre);
    }
  }
  return detected;
}

// ── Scoring Weights ────────────────────────────────

const WEIGHTS = {
  exactKeyword: 5,         // Full keyword phrase found in title
  keywordWordBonus: 2,     // Bonus per word in multi-word keyword match
  fuzzyKeyword: 2.5,       // High fuzzy similarity on keyword
  partialWord: 0.8,        // Individual keyword word found
  artistExact: 8,          // Artist name exact match
  artistFuzzy: 4,          // Artist name fuzzy match
  youtubeRefExact: 10,     // Song reference exact match
  youtubeRefFuzzy: 5,      // Song reference fuzzy match
  presetNameExact: 4,      // Preset name in title
  genreExact: 3,           // Genre word in title
  tagMatch: 2,             // Tag matches detected genre
  genreDetection: 2.5,     // Detected genre matches preset tags
} as const;

const FUZZY_THRESHOLD = 0.75; // Minimum similarity for fuzzy matches

/** 
 * Advanced tone matching: fuzzy string matching, genre detection, weighted keyword scoring.
 * Returns presets sorted by relevance score. 
 */
export function matchPresetsToTitle(title: string): { preset: TonePreset; score: number }[] {
  const lower = title.toLowerCase();
  const titleWords = lower.split(/[\s\-–—_|,.()\[\]{}'"!?&#+]+/).filter(w => w.length > 2);
  const detectedGenres = detectGenres(lower);

  return TONE_PRESETS.map(preset => {
    let score = 0;

    // ── Keyword matching (exact + fuzzy) ──
    for (const kw of preset.keywords) {
      const kwLower = kw.toLowerCase();
      if (lower.includes(kwLower)) {
        // Exact phrase match — bonus per word count
        const wordCount = kwLower.split(' ').length;
        score += WEIGHTS.exactKeyword + (wordCount > 1 ? wordCount * WEIGHTS.keywordWordBonus : 0);
      } else {
        // Try fuzzy match on full keyword
        const sim = fuzzySimilarity(kwLower, lower.substring(0, kwLower.length + 10));
        if (sim >= FUZZY_THRESHOLD) {
          score += WEIGHTS.fuzzyKeyword * sim;
        }
        // Partial word matching
        const kwWords = kwLower.split(' ');
        for (const kwWord of kwWords) {
          if (kwWord.length > 2) {
            // Exact word match in title words
            if (titleWords.includes(kwWord)) {
              score += WEIGHTS.partialWord * 1.5;
            } else if (titleWords.some(tw => tw.includes(kwWord) || kwWord.includes(tw))) {
              score += WEIGHTS.partialWord;
            } else {
              // Fuzzy word match
              const bestSim = Math.max(...titleWords.map(tw => fuzzySimilarity(tw, kwWord)));
              if (bestSim >= 0.8) {
                score += WEIGHTS.partialWord * bestSim;
              }
            }
          }
        }
      }
    }

    // ── Artist matching (exact + fuzzy) ──
    const artistLower = preset.artist.toLowerCase();
    if (lower.includes(artistLower)) {
      score += WEIGHTS.artistExact;
    } else {
      // Fuzzy artist match — check each title segment
      for (const tw of titleWords) {
        if (fuzzySimilarity(tw, artistLower) >= FUZZY_THRESHOLD) {
          score += WEIGHTS.artistFuzzy;
          break;
        }
      }
      // Also check multi-word artist against sliding window
      const artistWords = artistLower.split(' ');
      if (artistWords.length > 1) {
        const joined = artistWords.join(' ');
        const sim = fuzzySimilarity(joined, lower.substring(0, joined.length + 15));
        if (sim >= FUZZY_THRESHOLD) score += WEIGHTS.artistFuzzy;
      }
    }

    // ── YouTube reference / song name (exact + fuzzy) ──
    if (preset.youtubeRef) {
      const refLower = preset.youtubeRef.toLowerCase();
      if (lower.includes(refLower)) {
        score += WEIGHTS.youtubeRefExact;
      } else {
        const sim = fuzzySimilarity(refLower, lower);
        if (sim >= 0.6) score += WEIGHTS.youtubeRefFuzzy * sim;
      }
    }

    // ── Preset name match ──
    if (lower.includes(preset.name.toLowerCase())) {
      score += WEIGHTS.presetNameExact;
    }

    // ── Genre word in title ──
    if (lower.includes(preset.genre.toLowerCase())) {
      score += WEIGHTS.genreExact;
    }

    // ── Genre detection: match detected genres against preset tags ──
    if (detectedGenres.length > 0 && preset.tags) {
      for (const dg of detectedGenres) {
        if (preset.tags.some(tag => tag.includes(dg) || dg.includes(tag))) {
          score += WEIGHTS.genreDetection;
        }
      }
    }

    // ── Tag matching against title words ──
    if (preset.tags) {
      for (const tag of preset.tags) {
        if (lower.includes(tag)) {
          score += WEIGHTS.tagMatch;
        }
      }
    }

    return { preset, score };
  })
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score);
}
