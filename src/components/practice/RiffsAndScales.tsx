import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Guitar, Music2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  RIFFS, SCALES, NOTE_NAMES, getScaleFretPositions,
  fretToFrequency, type Riff, type ScaleDefinition, type NoteName,
} from '@/lib/musicTheory';
import { SongsterrSearch } from './SongsterrSearch';
import { YouTubeToTab } from './YouTubeToTab';

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
  const oscsRef = useRef<OscillatorNode[]>([]);
  const timeoutsRef = useRef<number[]>([]);

  const stopPlaying = useCallback(() => {
    loopingRef.current = false;
    oscsRef.current.forEach(o => { try { o.stop(); } catch {} });
    oscsRef.current = [];
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsPlaying(false);
    setCountIn(-1);
  }, []);

  const scheduleRiff = useCallback((ctx: AudioContext) => {
    const beatDur = (60 / selectedRiff.bpm) * (100 / speed);
    let time = ctx.currentTime + 0.05;

    selectedRiff.notes.forEach((note) => {
      const freq = fretToFrequency(note.string, note.fret);
      const dur = note.duration * beatDur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.01);
      gain.gain.setValueAtTime(0.2, time + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, time + dur);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, time);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + dur + 0.05);
      oscsRef.current.push(osc);
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

  const playRiff = useCallback(() => {
    stopPlaying();
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    loopingRef.current = loopEnabled;
    setIsPlaying(true);

    // Count-in
    const beatDur = 60 / selectedRiff.bpm;
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * beatDur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 1500 : 1000, t);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.06);
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
  }, [selectedRiff, speed, stopPlaying, loopEnabled, scheduleRiff]);

  const playScale = useCallback(() => {
    stopPlaying();
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    setIsPlaying(true);

    const rootIdx = NOTE_NAMES.indexOf(rootNote);
    const noteDur = 0.35;
    let time = ctx.currentTime + 0.05;

    // Ascending then descending
    const intervals = [...selectedScale.intervals, ...selectedScale.intervals.slice(0, -1).reverse()];

    intervals.forEach((interval) => {
      const semitone = rootIdx + interval + 48; // octave 3ish
      const freq = 440 * Math.pow(2, (semitone - 69) / 12);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.25, time + 0.01);
      gain.gain.linearRampToValueAtTime(0, time + noteDur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + noteDur + 0.05);
      oscsRef.current.push(osc);
      time += noteDur;
    });

    const totalDur = (time - ctx.currentTime) * 1000;
    const t = window.setTimeout(() => setIsPlaying(false), totalDur);
    timeoutsRef.current.push(t);
  }, [rootNote, selectedScale, stopPlaying]);

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
          <YouTubeToTab />
          <SongsterrSearch />

          {/* Riff selector */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {RIFFS.map((riff) => (
              <button
                key={riff.name}
                onClick={() => { setSelectedRiff(riff); stopPlaying(); }}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedRiff.name === riff.name
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                <div className="font-display font-semibold truncate">{riff.name}</div>
                <div className="text-[10px] opacity-70">{riff.artist}</div>
              </button>
            ))}
          </div>

          {/* Selected riff details */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-display font-bold text-foreground">{selectedRiff.name}</h4>
                <span className="text-xs text-muted-foreground">{selectedRiff.artist}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={difficultyColor(selectedRiff.difficulty)}>{selectedRiff.difficulty}</span>
                <span className="text-muted-foreground">{selectedRiff.bpm} BPM</span>
              </div>
            </div>

            {/* Tab display */}
            <pre className="bg-secondary/50 rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre">
              {selectedRiff.tab}
            </pre>

            {/* Speed control */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">Speed</span>
              <Slider value={[speed]} onValueChange={([v]) => setSpeed(v)} min={50} max={100} className="flex-1" />
              <span className="text-xs font-mono text-primary w-10 text-right">{speed}%</span>
            </div>

            {/* Count-in */}
            {countIn > 0 && (
              <div className="flex justify-center">
                <div className="text-4xl font-display font-black text-primary animate-pulse">{countIn}</div>
              </div>
            )}

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
          </div>
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
