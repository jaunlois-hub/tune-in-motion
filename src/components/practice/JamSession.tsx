import { useState, useRef, useCallback, useEffect } from 'react';
import { getSharedAudioContextSync } from '@/lib/sharedAudioContext';
import { Play, Square, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  CIRCLE_OF_FIFTHS_MAJOR, ENHARMONIC_MAP, PROGRESSIONS,
  RHYTHM_PATTERNS, NOTE_NAMES, getChordName, getChordFrequencies,
  type Progression, type RhythmPattern,
} from '@/lib/musicTheory';
import { createMasterGain } from '@/hooks/useMasterVolume';

function synthDrum(ctx: AudioContext, type: 'kick' | 'snare' | 'hihat' | 'hihatOpen', time: number, dest: AudioNode) {
  if (type === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(gain); gain.connect(dest);
    osc.start(time); osc.stop(time + 0.3);
  } else if (type === 'snare') {
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime(1000, time);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(dest);
    noise.start(time); noise.stop(time + 0.15);
    const osc = ctx.createOscillator(); const oscGain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
    oscGain.gain.setValueAtTime(0.4, time); oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    osc.connect(oscGain); oscGain.connect(dest); osc.start(time); osc.stop(time + 0.1);
  } else {
    const dur = type === 'hihatOpen' ? 0.2 : 0.05;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, time); gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime(7000, time);
    noise.connect(filter); filter.connect(gain); gain.connect(dest);
    noise.start(time); noise.stop(time + dur + 0.01);
  }
}

function synthChord(ctx: AudioContext, frequencies: number[], time: number, duration: number, dest: AudioNode) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.12, time);
  masterGain.gain.setValueAtTime(0.12, time + duration * 0.7);
  masterGain.gain.linearRampToValueAtTime(0.02, time + duration);
  masterGain.connect(dest);

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(0.7, time + 0.02 + i * 0.03);
    noteGain.gain.linearRampToValueAtTime(0, time + duration);
    osc.connect(noteGain); noteGain.connect(masterGain);
    osc.start(time + i * 0.03); osc.stop(time + duration + 0.1);
  });
}

function countInClick(ctx: AudioContext, time: number, isDownbeat: boolean, dest: AudioNode) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(isDownbeat ? 1500 : 1000, time);
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);
  osc.connect(gain); gain.connect(dest);
  osc.start(time); osc.stop(time + 0.06);
}

export function JamSession() {
  const [selectedKey, setSelectedKey] = useState(0);
  const [selectedProg, setSelectedProg] = useState<Progression>(PROGRESSIONS[0]);
  const [selectedPattern, setSelectedPattern] = useState<RhythmPattern>(RHYTHM_PATTERNS[0]);
  const [bpm, setBpm] = useState(110);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIdx, setCurrentChordIdx] = useState(-1);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [countIn, setCountIn] = useState(-1);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const loopRef = useRef<number[]>([]);
  const playingRef = useRef(false);
  const masterRef = useRef<GainNode | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);

  const rootNote = CIRCLE_OF_FIFTHS_MAJOR[selectedKey];
  const rootNoteNormalized = ENHARMONIC_MAP[rootNote] || rootNote;

  const chordNames = selectedProg.degrees.map((d, i) =>
    getChordName(rootNoteNormalized, d, selectedProg.quality[i])
  );

  const stop = useCallback(() => {
    playingRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    loopRef.current.forEach(clearTimeout);
    loopRef.current = [];
    setIsPlaying(false);
    setCurrentChordIdx(-1);
    setCurrentBeat(-1);
    setCountIn(-1);
  }, []);

  const scheduleLoop = useCallback((ctx: AudioContext, startTime: number) => {
    if (!playingRef.current) return;
    const beatDur = 60 / bpm;
    const patternDur = selectedPattern.beats * beatDur;
    const chordsPerBar = selectedProg.degrees.length;
    const totalBars = 1;
    const totalDur = chordsPerBar * patternDur;

    // Schedule drums — one pattern per chord
    const dest = masterRef.current ?? ctx.destination;
    for (let c = 0; c < chordsPerBar; c++) {
      const barStart = startTime + c * patternDur;
      selectedPattern.hits.forEach(hit => {
        synthDrum(ctx, hit.type, barStart + hit.time * beatDur, dest);
      });

      // Schedule chord at start of each bar
      const freqs = getChordFrequencies(rootNoteNormalized, 3, selectedProg.degrees[c], selectedProg.quality[c]);
      synthChord(ctx, freqs, barStart, patternDur * 0.9, dest);
    }

    // Schedule next loop
    const nextLoopMs = (totalDur - 0.3) * 1000;
    const t = window.setTimeout(() => {
      if (playingRef.current) {
        scheduleLoop(ctx, startTime + totalDur);
      }
    }, nextLoopMs);
    loopRef.current.push(t);
  }, [bpm, selectedPattern, selectedProg, rootNoteNormalized]);

  const start = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = getSharedAudioContextSync();
      const { master, release } = createMasterGain(ctxRef.current);
      masterRef.current = master;
      releaseMasterRef.current = release;
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    stop();
    playingRef.current = true;
    setIsPlaying(true);

    const beatDur = 60 / bpm;
    const dest = masterRef.current ?? ctx.destination;

    // Count-in: 4 clicks
    for (let i = 0; i < 4; i++) {
      countInClick(ctx, ctx.currentTime + 0.05 + i * beatDur, i === 0, dest);
    }

    // Visual count-in
    setCountIn(1);
    for (let i = 1; i < 4; i++) {
      const t = window.setTimeout(() => setCountIn(i + 1), i * beatDur * 1000);
      loopRef.current.push(t);
    }

    // Start music after count-in
    const musicStart = ctx.currentTime + 0.05 + 4 * beatDur;
    const countInMs = 4 * beatDur * 1000;

    const t = window.setTimeout(() => {
      setCountIn(-1);
      if (!playingRef.current) return;
      scheduleLoop(ctx, musicStart);

      // Visual beat tracker
      let beatCount = 0;
      const patternBeats = selectedPattern.beats;
      const chordsPerBar = selectedProg.degrees.length;

      timerRef.current = window.setInterval(() => {
        if (!playingRef.current) return;
        const totalPatternBeats = chordsPerBar * patternBeats;
        const pos = beatCount % totalPatternBeats;
        const chordIdx = Math.floor(pos / patternBeats);
        const beatInBar = pos % patternBeats;
        setCurrentChordIdx(chordIdx);
        setCurrentBeat(beatInBar);
        beatCount++;
      }, beatDur * 1000);
    }, countInMs);
    loopRef.current.push(t);
  }, [bpm, selectedPattern, selectedProg, stop, scheduleLoop]);

  useEffect(() => () => {
    stop();
    releaseMasterRef.current?.();
    masterRef.current = null;
    releaseMasterRef.current = null;
    ctxRef.current?.close().catch(() => { /* ignore */ });
    ctxRef.current = null;
  }, [stop]);

  return (
    <div className="space-y-5">
      {/* Key selector */}
      <div>
        <span className="text-xs text-muted-foreground mb-1 block">Key</span>
        <div className="flex flex-wrap gap-1">
          {CIRCLE_OF_FIFTHS_MAJOR.map((key, i) => (
            <button
              key={key}
              onClick={() => setSelectedKey(i)}
              className={`w-9 h-9 rounded-full text-xs font-display font-bold transition-all ${
                selectedKey === i
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Progression selector */}
      <div>
        <span className="text-xs text-muted-foreground mb-1 block">Chord Progression</span>
        <div className="flex flex-wrap gap-1.5">
          {PROGRESSIONS.map((prog) => (
            <button
              key={prog.name}
              onClick={() => { setSelectedProg(prog); if (isPlaying) stop(); }}
              className={`px-2.5 py-1.5 rounded-full text-xs font-display transition-all ${
                selectedProg.name === prog.name
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {prog.name}
            </button>
          ))}
        </div>
      </div>

      {/* Rhythm pattern selector */}
      <div>
        <span className="text-xs text-muted-foreground mb-1 block">Drum Pattern</span>
        <div className="flex flex-wrap gap-1.5">
          {RHYTHM_PATTERNS.map((p) => (
            <button
              key={p.name}
              onClick={() => { setSelectedPattern(p); if (isPlaying) stop(); }}
              className={`px-2.5 py-1.5 rounded-full text-xs font-display transition-all ${
                selectedPattern.name === p.name
                  ? 'bg-accent text-accent-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* BPM */}
      <div className="flex items-center gap-4 bg-secondary/30 rounded-xl border border-border p-3">
        <button onClick={() => setBpm(b => Math.max(30, b - 5))} className="text-muted-foreground hover:text-foreground">
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={30} max={300} />
        </div>
        <button onClick={() => setBpm(b => Math.min(300, b + 5))} className="text-muted-foreground hover:text-foreground">
          <Plus className="w-4 h-4" />
        </button>
        <span className="text-lg font-mono font-bold text-primary w-16 text-right">{bpm}</span>
        <span className="text-xs text-muted-foreground">BPM</span>
      </div>

      {/* Count-in overlay */}
      {countIn > 0 && (
        <div className="flex justify-center">
          <div className="text-6xl font-display font-black text-primary animate-pulse">
            {countIn}
          </div>
        </div>
      )}

      {/* Current chord display */}
      {isPlaying && countIn < 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground font-display">
              {selectedProg.numerals.join(' → ')}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {chordNames.map((chord, i) => (
              <div
                key={`${chord}-${i}`}
                className={`px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                  currentChordIdx === i
                    ? 'border-primary bg-primary/15 shadow-lg shadow-primary/20 scale-110'
                    : 'border-border bg-card'
                }`}
              >
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground block">{selectedProg.numerals[i]}</span>
                  <span className={`text-lg font-display font-bold ${
                    currentChordIdx === i ? 'text-primary' : 'text-foreground'
                  }`}>{chord}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Beat dots */}
          <div className="flex justify-center gap-2 mt-3">
            {Array.from({ length: selectedPattern.beats }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  currentBeat === i ? 'bg-primary scale-125 shadow-md shadow-primary/40' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Idle chord preview */}
      {!isPlaying && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">{selectedProg.numerals.join(' → ')}</span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {chordNames.map((chord, i) => (
              <div key={`${chord}-${i}`} className="px-4 py-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block text-center">{selectedProg.numerals[i]}</span>
                <span className="text-lg font-display font-bold text-foreground text-center block">{chord}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Play/Stop */}
      <div className="flex justify-center">
        <Button
          onClick={isPlaying ? stop : start}
          size="lg"
          variant={isPlaying ? 'destructive' : 'default'}
          className="gap-2 px-8"
        >
          {isPlaying ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isPlaying ? 'Stop Jam' : 'Start Jam'}
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        4-beat count-in • Drums + chords loop continuously • Change key or BPM anytime
      </p>
    </div>
  );
}
