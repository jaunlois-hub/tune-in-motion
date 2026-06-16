import { useState, useCallback, useRef, useEffect } from 'react';
import { getSharedAudioContextSync } from '@/lib/sharedAudioContext';
import { Play, Square, Volume2, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  CIRCLE_OF_FIFTHS_MAJOR, CIRCLE_OF_FIFTHS_MINOR, ENHARMONIC_MAP,
  PROGRESSIONS, getChordName, getChordFrequencies, NOTE_NAMES,
  type Progression,
} from '@/lib/musicTheory';
import { ChordDiagram } from '@/components/studio/ChordDiagram';
import { createMasterGain } from '@/hooks/useMasterVolume';

export function CircleOfFifths() {
  const [selectedKey, setSelectedKey] = useState(0); // index into circle
  const [selectedProgression, setSelectedProgression] = useState<Progression>(PROGRESSIONS[0]);
  const [playingChordIdx, setPlayingChordIdx] = useState<number | null>(null);
  const [isPlayingProgression, setIsPlayingProgression] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [countIn, setCountIn] = useState(-1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTimeoutRef = useRef<number[]>([]);
  const loopingRef = useRef(false);
  const masterRef = useRef<GainNode | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);

  const ensureCtxRegistered = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = getSharedAudioContextSync();
      releaseMasterRef.current?.();
      const { master, release } = createMasterGain(audioCtxRef.current);
      masterRef.current = master;
      releaseMasterRef.current = release;
    }
  }, []);

  const rootNote = CIRCLE_OF_FIFTHS_MAJOR[selectedKey];
  const rootNoteNormalized = ENHARMONIC_MAP[rootNote] || rootNote;
  const relativeMinor = CIRCLE_OF_FIFTHS_MINOR[selectedKey];
  const dominant = CIRCLE_OF_FIFTHS_MAJOR[(selectedKey + 1) % 12]; // next in circle = dominant
  const subdominant = CIRCLE_OF_FIFTHS_MAJOR[(selectedKey + 11) % 12]; // prev = subdominant

  const playChord = useCallback((frequencies: number[], duration = 0.8) => {
    ensureCtxRegistered();
    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.15, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    masterGain.connect(masterRef.current ?? ctx.destination);

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, ctx.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.02 + i * 0.04);
      noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      osc.connect(noteGain);
      noteGain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.04);
      osc.stop(ctx.currentTime + duration + 0.1);
    });
  }, [ensureCtxRegistered]);

  const stopProgression = useCallback(() => {
    loopingRef.current = false;
    playTimeoutRef.current.forEach(clearTimeout);
    playTimeoutRef.current = [];
    setIsPlayingProgression(false);
    setPlayingChordIdx(null);
    setCountIn(-1);
  }, []);

  const scheduleProgression = useCallback((startDelay: number) => {
    const prog = selectedProgression;
    const beatDuration = 600;

    prog.degrees.forEach((degree, i) => {
      const t = window.setTimeout(() => {
        setPlayingChordIdx(i);
        const freqs = getChordFrequencies(rootNoteNormalized, 3, degree, prog.quality[i]);
        playChord(freqs, beatDuration / 1000 * 0.9);
      }, startDelay + i * beatDuration);
      playTimeoutRef.current.push(t);
    });

    const totalDur = prog.degrees.length * beatDuration;
    const endT = window.setTimeout(() => {
      if (loopingRef.current) {
        scheduleProgression(0);
      } else {
        setIsPlayingProgression(false);
        setPlayingChordIdx(null);
      }
    }, startDelay + totalDur);
    playTimeoutRef.current.push(endT);
  }, [selectedProgression, rootNoteNormalized, playChord]);

  const playProgression = useCallback(() => {
    stopProgression();
    loopingRef.current = loopEnabled;
    setIsPlayingProgression(true);

    ensureCtxRegistered();
    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') ctx.resume();

    // 4-beat count-in
    const clickDur = 0.06;
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * 0.5;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 1500 : 1000, t);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + clickDur);
      osc.connect(gain); gain.connect(masterRef.current ?? ctx.destination);
      osc.start(t); osc.stop(t + clickDur);
    }

    // Visual count-in
    setCountIn(1);
    for (let i = 1; i < 4; i++) {
      const t = window.setTimeout(() => setCountIn(i + 1), i * 500);
      playTimeoutRef.current.push(t);
    }

    // Start after count-in
    const countInMs = 4 * 500;
    const t = window.setTimeout(() => {
      setCountIn(-1);
      scheduleProgression(0);
    }, countInMs);
    playTimeoutRef.current.push(t);
  }, [selectedProgression, rootNoteNormalized, playChord, stopProgression, loopEnabled, scheduleProgression, ensureCtxRegistered]);

  useEffect(() => () => {
    loopingRef.current = false;
    playTimeoutRef.current.forEach(clearTimeout);
    playTimeoutRef.current = [];
    releaseMasterRef.current?.();
    masterRef.current = null;
    releaseMasterRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const chordNames = selectedProgression.degrees.map((d, i) =>
    getChordName(rootNoteNormalized, d, selectedProgression.quality[i])
  );

  // SVG circle
  const cx = 160, cy = 160, outerR = 140, innerR = 95;

  return (
    <div className="space-y-6">
      {/* Circle SVG */}
      <div className="flex justify-center">
        <svg width={320} height={320} viewBox="0 0 320 320">
          {/* Outer ring segments (major keys) */}
          {CIRCLE_OF_FIFTHS_MAJOR.map((key, i) => {
            const angle = (i * 30 - 90) * Math.PI / 180;
            const x = cx + outerR * Math.cos(angle);
            const y = cy + outerR * Math.sin(angle);
            const isSelected = i === selectedKey;
            const isDominant = key === dominant;
            const isSubdominant = key === subdominant;

            return (
              <g key={key} onClick={() => setSelectedKey(i)} className="cursor-pointer">
                <circle
                  cx={x} cy={y} r={20}
                  fill={isSelected ? 'hsl(var(--primary))' : isDominant ? 'hsl(var(--primary) / 0.4)' : isSubdominant ? 'hsl(var(--accent) / 0.4)' : 'hsl(var(--secondary))'}
                  stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={1.5}
                />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={12} fontWeight={isSelected ? 700 : 500}
                  fill={isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'}
                >
                  {key}
                </text>
              </g>
            );
          })}

          {/* Inner ring (minor keys) */}
          {CIRCLE_OF_FIFTHS_MINOR.map((key, i) => {
            const angle = (i * 30 - 90) * Math.PI / 180;
            const x = cx + innerR * Math.cos(angle);
            const y = cy + innerR * Math.sin(angle);
            const isRelative = i === selectedKey;

            return (
              <g key={key} onClick={() => setSelectedKey(i)} className="cursor-pointer">
                <circle
                  cx={x} cy={y} r={16}
                  fill={isRelative ? 'hsl(var(--accent) / 0.6)' : 'hsl(var(--muted))'}
                  stroke={isRelative ? 'hsl(var(--accent))' : 'hsl(var(--border))'}
                  strokeWidth={1}
                />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={9} fontWeight={isRelative ? 600 : 400}
                  fill={isRelative ? 'hsl(var(--accent-foreground))' : 'hsl(var(--muted-foreground))'}
                >
                  {key}
                </text>
              </g>
            );
          })}

          {/* Center label */}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={700} fill="hsl(var(--foreground))">
            {rootNote}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
            {relativeMinor}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary inline-block" /> Root</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary/40 inline-block" /> Dominant</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent/40 inline-block" /> Subdominant</span>
      </div>

      {/* Progression selector */}
      <div className="space-y-3">
        <h4 className="text-sm font-display font-semibold text-foreground">Progressions in {rootNote}</h4>
        <div className="flex flex-wrap gap-1.5">
          {PROGRESSIONS.map((prog) => (
            <button
              key={prog.name}
              onClick={() => { setSelectedProgression(prog); stopProgression(); }}
              className={`px-2.5 py-1.5 rounded-full text-xs font-display transition-all ${
                selectedProgression.name === prog.name
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {prog.name}
            </button>
          ))}
        </div>
      </div>

      {/* Count-in overlay */}
      {countIn > 0 && (
        <div className="flex justify-center">
          <motion.div
            key={countIn}
            className="text-5xl font-display font-black text-primary"
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          >
            {countIn}
          </motion.div>
        </div>
      )}

      {/* Chord progression display */}
      <div className="bg-secondary/30 rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-display">
            {selectedProgression.numerals.join(' → ')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLoopEnabled(!loopEnabled)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-display transition-all border ${
                loopEnabled
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Repeat className="w-3 h-3" />
              Loop
            </button>
            <Button
              size="sm"
              variant={isPlayingProgression ? 'destructive' : 'default'}
              onClick={isPlayingProgression ? stopProgression : playProgression}
              className="gap-1.5"
            >
              {isPlayingProgression ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlayingProgression ? 'Stop' : 'Play'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <AnimatePresence>
            {chordNames.map((chord, i) => (
              <motion.div
                key={`${chord}-${i}`}
                className={`rounded-lg border p-2 transition-all ${
                  playingChordIdx === i
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border bg-card'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground">{selectedProgression.numerals[i]}</span>
                </div>
                <ChordDiagram chord={chord} size="xs" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
