import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Guitar, Music2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  RIFFS, SCALES, NOTE_NAMES, getScaleFretPositions,
  fretToFrequency, type Riff, type ScaleDefinition, type NoteName,
} from '@/lib/musicTheory';
import { ensurePluckBuffer, playPluckedNote, type PluckedNoteHandle } from '@/lib/pluckedSynth';

type SubTab = 'riffs' | 'scales';

const DEGREE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210 80% 60%)',
  'hsl(280 70% 60%)',
  'hsl(30 80% 55%)',
  'hsl(150 60% 45%)',
  'hsl(0 70% 55%)',
  'hsl(60 70% 50%)',
  'hsl(330 60% 55%)',
];

function ScaleFretboard({ root, scale }: { root: NoteName; scale: ScaleDefinition }) {
  const positions = getScaleFretPositions(root, scale);
  const fretCount = 15;
  const stringCount = 6;
  const fretW = 42;
  const stringH = 22;
  const leftPad = 30;
  const topPad = 20;
  const w = leftPad + fretCount * fretW + 10;
  const h = topPad + (stringCount - 1) * stringH + 20;

  const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="min-w-[500px]">
        {/* Nut */}
        <rect x={leftPad - 2} y={topPad - 4} width={3} height={(stringCount - 1) * stringH + 8} fill="hsl(var(--foreground))" rx={1} />

        {/* Frets */}
        {Array.from({ length: fretCount + 1 }).map((_, f) => (
          <line key={f} x1={leftPad + f * fretW} y1={topPad - 4} x2={leftPad + f * fretW} y2={topPad + (stringCount - 1) * stringH + 4}
            stroke="hsl(var(--border))" strokeWidth={1} />
        ))}

        {/* Strings */}
        {Array.from({ length: stringCount }).map((_, s) => (
          <g key={s}>
            <line x1={leftPad} y1={topPad + s * stringH} x2={leftPad + fretCount * fretW} y2={topPad + s * stringH}
              stroke="hsl(var(--muted-foreground))" strokeWidth={s >= 3 ? 2 : 1} opacity={0.4} />
            <text x={leftPad - 14} y={topPad + s * stringH + 4} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">
              {STRING_LABELS[s]}
            </text>
          </g>
        ))}

        {/* Fret numbers */}
        {[3, 5, 7, 9, 12, 15].map(f => (
          <text key={f} x={leftPad + (f - 0.5) * fretW} y={topPad + (stringCount - 1) * stringH + 16}
            fontSize={8} fill="hsl(var(--muted-foreground))" textAnchor="middle">{f}</text>
        ))}

        {/* Fret dots (inlays) */}
        {[3, 5, 7, 9, 15].map(f => (
          <circle key={f} cx={leftPad + (f - 0.5) * fretW} cy={topPad + 2.5 * stringH} r={3}
            fill="hsl(var(--muted-foreground))" opacity={0.15} />
        ))}
        {/* Double dot at 12 */}
        <circle cx={leftPad + 11.5 * fretW} cy={topPad + 1.5 * stringH} r={3} fill="hsl(var(--muted-foreground))" opacity={0.15} />
        <circle cx={leftPad + 11.5 * fretW} cy={topPad + 3.5 * stringH} r={3} fill="hsl(var(--muted-foreground))" opacity={0.15} />

        {/* Scale positions */}
        {positions.filter(p => p.fret <= fretCount).map((pos, i) => {
          const x = pos.fret === 0 ? leftPad - 10 : leftPad + (pos.fret - 0.5) * fretW;
          const y = topPad + pos.string * stringH;
          const isRoot = pos.degree === 0;
          return (
            <g key={`${pos.string}-${pos.fret}-${i}`}>
              <circle cx={x} cy={y} r={isRoot ? 8 : 6}
                fill={DEGREE_COLORS[pos.degree % DEGREE_COLORS.length]}
                opacity={isRoot ? 1 : 0.8}
              />
              {isRoot && (
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="white">R</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RiffsAndScales() {
  const [subTab, setSubTab] = useState<SubTab>('riffs');
  const [selectedRiff, setSelectedRiff] = useState<Riff>(RIFFS[0]);
  const [selectedScale, setSelectedScale] = useState<ScaleDefinition>(SCALES[0]);
  const [rootNote, setRootNote] = useState<NoteName>('A');
  const [speed, setSpeed] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [countIn, setCountIn] = useState(-1);
  const loopingRef = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const notesRef = useRef<PluckedNoteHandle[]>([]);
  const auxOscsRef = useRef<OscillatorNode[]>([]); // count-in clicks etc.
  const timeoutsRef = useRef<number[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const pluckBufferRef = useRef<AudioBuffer | null>(null);

  const stopPlaying = useCallback(() => {
    loopingRef.current = false;
    notesRef.current.forEach(n => n.stop());
    notesRef.current = [];
    auxOscsRef.current.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
    auxOscsRef.current = [];
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsPlaying(false);
    setCountIn(-1);
  }, []);

  const ensureAudioGraph = useCallback(async () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    if (!masterGainRef.current) {
      // Master → reverb (parallel) → destination, with light short-tail reverb for body
      const master = ctx.createGain();
      master.gain.value = 0.85;
      masterGainRef.current = master;

      const conv = ctx.createConvolver();
      // Short synthetic room IR for ambience (not the big reverb the effects rack uses)
      const irLen = ctx.sampleRate * 0.6;
      const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < irLen; i++) {
          const t = i / irLen;
          d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 4) * 0.5;
        }
      }
      conv.buffer = ir;
      reverbRef.current = conv;

      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.18;

      master.connect(ctx.destination);
      master.connect(conv);
      conv.connect(wetGain);
      wetGain.connect(ctx.destination);
    }

    if (!pluckBufferRef.current) {
      pluckBufferRef.current = await ensurePluckBuffer(ctx);
    }
    return ctx;
  }, []);

  const scheduleRiff = useCallback((ctx: AudioContext) => {
    const buffer = pluckBufferRef.current;
    const master = masterGainRef.current;
    if (!buffer || !master) return;

    const beatDur = (60 / selectedRiff.bpm) * (100 / speed);
    let time = ctx.currentTime + 0.05;

    selectedRiff.notes.forEach((note, idx) => {
      const freq = fretToFrequency(note.string, note.fret);
      const dur = note.duration * beatDur;
      // Velocity: accent first note + downbeats (every 4th note), slight humanization
      const isAccent = idx === 0 || idx % 4 === 0;
      const velocity = (isAccent ? 0.78 : 0.62) + (Math.random() - 0.5) * 0.06;
      // Tiny timing jitter (±4ms) to humanize
      const jitter = (Math.random() - 0.5) * 0.008;
      const handle = playPluckedNote(ctx, buffer, freq, time + jitter, dur, velocity, master);
      notesRef.current.push(handle);
      time += dur;
    });

    const totalDur = (time - ctx.currentTime) * 1000;
    const t = window.setTimeout(() => {
      if (loopingRef.current) {
        scheduleRiff(ctx);
      } else {
        setIsPlaying(false);
      }
    }, totalDur);
    timeoutsRef.current.push(t);
  }, [selectedRiff, speed]);

  const playRiff = useCallback(async () => {
    stopPlaying();
    const ctx = await ensureAudioGraph();
    loopingRef.current = loopEnabled;
    setIsPlaying(true);

    // Count-in clicks (woodblock-style: short triangle + brief noise burst)
    const beatDur = 60 / selectedRiff.bpm;
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * beatDur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(i === 0 ? 1800 : 1200, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.05);
      auxOscsRef.current.push(osc);
    }

    setCountIn(1);
    for (let i = 1; i < 4; i++) {
      const tt = window.setTimeout(() => setCountIn(i + 1), i * beatDur * 1000);
      timeoutsRef.current.push(tt);
    }

    const countInMs = 4 * beatDur * 1000;
    const tt = window.setTimeout(() => {
      setCountIn(-1);
      scheduleRiff(ctx);
    }, countInMs);
    timeoutsRef.current.push(tt);
  }, [selectedRiff, stopPlaying, loopEnabled, scheduleRiff, ensureAudioGraph]);

  const playScale = useCallback(async () => {
    stopPlaying();
    const ctx = await ensureAudioGraph();
    const buffer = pluckBufferRef.current;
    const master = masterGainRef.current;
    if (!buffer || !master) return;
    setIsPlaying(true);

    const rootIdx = NOTE_NAMES.indexOf(rootNote);
    const noteDur = 0.42;
    let time = ctx.currentTime + 0.05;

    // Ascending then descending one octave (skip duplicate root in middle)
    const intervalsUp = selectedScale.intervals;
    const intervalsDown = [...selectedScale.intervals].slice(0, -1).reverse();
    const allIntervals = [...intervalsUp, ...intervalsDown];

    allIntervals.forEach((interval, i) => {
      const semitone = rootIdx + interval + 48; // around octave 3-4
      const freq = 440 * Math.pow(2, (semitone - 69) / 12);
      // Accent first note of ascending and first note of descending
      const isPivot = i === 0 || i === intervalsUp.length;
      const velocity = isPivot ? 0.72 : 0.6;
      const handle = playPluckedNote(ctx, buffer, freq, time, noteDur, velocity, master);
      notesRef.current.push(handle);
      time += noteDur;
    });

    const totalDur = (time - ctx.currentTime) * 1000;
    const t = window.setTimeout(() => setIsPlaying(false), totalDur);
    timeoutsRef.current.push(t);
  }, [rootNote, selectedScale, stopPlaying, ensureAudioGraph]);

  useEffect(() => () => stopPlaying(), [stopPlaying]);

  const difficultyColor = (d: string) =>
    d === 'Easy' ? 'text-green-500' : d === 'Medium' ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-5">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border w-fit mx-auto">
        <button
          onClick={() => { setSubTab('riffs'); stopPlaying(); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-display transition-all ${
            subTab === 'riffs' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Guitar className="w-3.5 h-3.5" />
          Riffs & Licks
        </button>
        <button
          onClick={() => { setSubTab('scales'); stopPlaying(); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-display transition-all ${
            subTab === 'scales' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Music2 className="w-3.5 h-3.5" />
          Scales
        </button>
      </div>

      {subTab === 'riffs' && (
        <div className="space-y-4">
          {/* Riff selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {RIFFS.map((riff) => {
              const selected = selectedRiff.name === riff.name;
              return (
                <motion.button
                  key={riff.name}
                  onClick={() => { setSelectedRiff(riff); stopPlaying(); }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative text-left px-3 py-2.5 rounded-lg text-xs overflow-hidden transition-all ${
                    selected
                      ? 'bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-[0_4px_18px_rgba(45,212,191,0.35)] border border-primary'
                      : 'bg-secondary/40 text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 hover:bg-secondary/70'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="riff-pulse"
                      className="absolute inset-0 -z-0 rounded-lg ring-2 ring-primary/40 pointer-events-none"
                      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                    />
                  )}
                  <div className="relative z-10 flex items-start justify-between gap-1">
                    <div className="font-display font-semibold truncate">{riff.name}</div>
                    <span className={`shrink-0 text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-full leading-none ${
                      selected ? 'bg-primary-foreground/15' :
                      riff.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                      riff.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{riff.difficulty}</span>
                  </div>
                  <div className="text-[10px] opacity-70 truncate relative z-10">{riff.artist}</div>
                </motion.button>
              );
            })}
          </div>

          {/* Selected riff details */}
          <motion.div
            key={selectedRiff.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-gradient-to-br from-card to-card/50 rounded-xl border border-border/80 p-4 space-y-3 shadow-md"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-display font-bold text-foreground text-base">{selectedRiff.name}</h4>
                <span className="text-xs text-muted-foreground">{selectedRiff.artist}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-display font-semibold px-2 py-0.5 rounded-full ${
                  selectedRiff.difficulty === 'Easy' ? 'bg-green-500/15 text-green-400' :
                  selectedRiff.difficulty === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' :
                  'bg-red-500/15 text-red-400'
                }`}>{selectedRiff.difficulty}</span>
                <span className="font-mono text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-full">{selectedRiff.bpm} BPM</span>
              </div>
            </div>

            {/* Tab display */}
            <pre className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre border border-border/40 shadow-inner">
              {selectedRiff.tab}
            </pre>

            {/* Speed control */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12 font-display uppercase tracking-wider">Speed</span>
              <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={50} max={100} className="flex-1" />
              <span className="text-xs font-mono text-primary w-10 text-right font-bold">{speed}%</span>
            </div>

            {/* Count-in */}
            <AnimatePresence mode="wait">
              {countIn > 0 && (
                <motion.div
                  key={countIn}
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="flex justify-center"
                >
                  <div className="text-5xl font-display font-black text-primary drop-shadow-[0_0_18px_hsl(var(--primary))]">{countIn}</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Play controls */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-display transition-all border ${
                  loopEnabled
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Repeat className="w-3 h-3" />
                Loop
              </button>
              <Button
                onClick={isPlaying ? stopPlaying : playRiff}
                variant={isPlaying ? 'destructive' : 'default'}
                className="gap-2"
              >
                {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Stop' : 'Play Riff'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {subTab === 'scales' && (
        <div className="space-y-4">
          {/* Scale selector */}
          <div className="flex flex-wrap gap-1.5">
            {SCALES.map((s) => (
              <button
                key={s.name}
                onClick={() => { setSelectedScale(s); stopPlaying(); }}
                className={`px-2.5 py-1.5 rounded-full text-xs font-display transition-all ${
                  selectedScale.name === s.name
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Root note selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Root:</span>
            <div className="flex flex-wrap gap-1">
              {NOTE_NAMES.map((n) => (
                <button
                  key={n}
                  onClick={() => setRootNote(n)}
                  className={`w-8 h-8 rounded-full text-xs font-display font-bold transition-all ${
                    rootNote === n
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Scale info */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-display font-bold text-foreground">{rootNote} {selectedScale.name}</h4>
              <span className="text-xs font-mono text-muted-foreground">{selectedScale.formula}</span>
            </div>

            {/* Notes in scale */}
            <div className="flex gap-2">
              {selectedScale.intervals.map((interval, i) => {
                const noteIdx = (NOTE_NAMES.indexOf(rootNote) + interval) % 12;
                return (
                  <span key={i} className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {NOTE_NAMES[noteIdx]}
                  </span>
                );
              })}
            </div>

            {/* Fretboard */}
            <ScaleFretboard root={rootNote} scale={selectedScale} />

            {/* Play scale */}
            <div className="flex justify-center">
              <Button
                onClick={isPlaying ? stopPlaying : playScale}
                variant={isPlaying ? 'destructive' : 'default'}
                className="gap-2"
              >
                {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Stop' : 'Play Scale'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
