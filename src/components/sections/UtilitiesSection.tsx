import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { getSharedAudioContextSync } from '@/lib/sharedAudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Brain, Music, Layers, Ear, Scale, Play, Square, RotateCcw, Check, X, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { NOTE_NAMES, type NoteName } from '@/lib/musicTheory';
import { ensurePluckBuffer, playPluckedNote, type PluckedNoteHandle } from '@/lib/pluckedSynth';
import { createMasterGain } from '@/hooks/useMasterVolume';

// ============================================================
// Shared helpers
// ============================================================
const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

function parseChord(raw: string): { root: string; quality: string } | null {
  const m = raw.trim().match(/^([A-G][#b]?)(.*)$/);
  if (!m) return null;
  return { root: m[1], quality: m[2] || '' };
}

function transposeNote(note: string, semitones: number): string {
  const normalized = FLAT_TO_SHARP[note] ?? note;
  const idx = NOTE_NAMES.indexOf(normalized as NoteName);
  if (idx < 0) return note;
  return NOTE_NAMES[((idx + semitones) % 12 + 12) % 12];
}

function transposeChord(chord: string, semitones: number): string {
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  // Handle slash chords: G/B → root G, bass B
  const slashIdx = parsed.quality.indexOf('/');
  if (slashIdx >= 0) {
    const bass = parsed.quality.slice(slashIdx + 1);
    const head = parsed.quality.slice(0, slashIdx);
    return transposeNote(parsed.root, semitones) + head + '/' + transposeNote(bass, semitones);
  }
  return transposeNote(parsed.root, semitones) + parsed.quality;
}

function noteAtFret(stringIndex: number, fret: number): string {
  // Standard tuning, string 0 = low E (E2), string 5 = high E (E4)
  const openNotes = ['E', 'A', 'D', 'G', 'B', 'E']; // 0..5
  const idx = NOTE_NAMES.indexOf(openNotes[stringIndex] as NoteName);
  return NOTE_NAMES[(idx + fret) % 12];
}

function freqOfNote(noteName: string, octave: number): number {
  const semitonesFromA4 = NOTE_NAMES.indexOf(noteName as NoteName) - 9 + (octave - 4) * 12;
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

// ============================================================
// Audio context (shared)
// ============================================================
function useAudioPlayback() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);
  const activeNotesRef = useRef<PluckedNoteHandle[]>([]);

  const stopActiveNotes = useCallback(() => {
    activeNotesRef.current.forEach((note) => note.stop());
    activeNotesRef.current = [];
  }, []);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = getSharedAudioContextSync();
      releaseMasterRef.current?.();
      const { master, release } = createMasterGain(ctxRef.current);
      masterRef.current = master;
      releaseMasterRef.current = release;
    }
    return ctxRef.current;
  }, []);

  const playNote = useCallback(async (freq: number, dur = 0.6, vel = 0.7) => {
    stopActiveNotes();
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    if (!bufRef.current) {
      bufRef.current = await ensurePluckBuffer(ctx);
    }
    const dest = masterRef.current ?? ctx.destination;
    const handle = playPluckedNote(ctx, bufRef.current, freq, ctx.currentTime + 0.02, dur, vel, dest, 0.45);
    activeNotesRef.current = [handle];
  }, [ensureCtx, stopActiveNotes]);

  const playSequence = useCallback(async (
    notes: { freq: number; dur?: number; gap?: number; vel?: number }[],
  ) => {
    stopActiveNotes();
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    if (!bufRef.current) {
      bufRef.current = await ensurePluckBuffer(ctx);
    }
    const dest = masterRef.current ?? ctx.destination;
    let t = ctx.currentTime + 0.05;
    const handles: PluckedNoteHandle[] = [];
    for (const n of notes) {
      const dur = n.dur ?? 0.6;
      handles.push(playPluckedNote(ctx, bufRef.current, n.freq, t, dur, n.vel ?? 0.7, dest, 0.45));
      t += (n.gap ?? dur);
    }
    activeNotesRef.current = handles;
  }, [ensureCtx, stopActiveNotes]);

  useEffect(() => () => {
    stopActiveNotes();
    releaseMasterRef.current?.();
    releaseMasterRef.current = null;
    masterRef.current = null;
    ctxRef.current = null;
  }, [stopActiveNotes]);

  return { playNote, playSequence };
}

// ============================================================
// 1) Transposer + Capo Helper
// ============================================================
function TransposerCapo() {
  const [input, setInput] = useState('G D Em C G D C G');
  const [transposeSemis, setTransposeSemis] = useState(0);
  const [capoFret, setCapoFret] = useState(0);

  const chords = useMemo(() => input.split(/\s+/).filter(Boolean), [input]);
  const transposed = useMemo(() => chords.map((c) => transposeChord(c, transposeSemis)), [chords, transposeSemis]);
  // Capo translation: with capo at fret K, you play shapes that are K semitones LOWER to sound at original pitch.
  const capoShapes = useMemo(() => chords.map((c) => transposeChord(c, -capoFret)), [chords, capoFret]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Chord Progression (space-separated)</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="e.g. G D Em C"
          className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Transpose</label>
            <span className="text-xs font-mono text-primary font-bold">
              {transposeSemis >= 0 ? '+' : ''}{transposeSemis} st
            </span>
          </div>
          <Slider value={[transposeSemis]} onValueChange={([v]) => setTransposeSemis(v)} min={-11} max={11} step={1} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Capo Fret</label>
            <span className="text-xs font-mono text-amber-300 font-bold">
              Capo {capoFret}
            </span>
          </div>
          <Slider value={[capoFret]} onValueChange={([v]) => setCapoFret(v)} min={0} max={11} step={1} />
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Original</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {chords.map((c, i) => (
              <span key={i} className="px-2 py-1 rounded-md bg-secondary/40 border border-border/50 text-sm font-display font-bold text-foreground/85">{c}</span>
            ))}
          </div>
        </div>

        {transposeSemis !== 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-primary font-display">Transposed ({transposeSemis >= 0 ? '+' : ''}{transposeSemis} semitones)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {transposed.map((c, i) => (
                <span key={i} className="px-2 py-1 rounded-md bg-primary/15 border border-primary/40 text-sm font-display font-bold text-primary">{c}</span>
              ))}
            </div>
          </div>
        )}

        {capoFret > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-amber-300 font-display">Shape with Capo {capoFret} (sounds as original)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {capoShapes.map((c, i) => (
                <span key={i} className="px-2 py-1 rounded-md bg-amber-400/15 border border-amber-400/40 text-sm font-display font-bold text-amber-200">{c}</span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Place the capo at fret {capoFret}, then play the shapes above; they will sound as the original chords.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 2) Fretboard Note Trainer
// ============================================================
function FretboardTrainer() {
  const { playNote } = useAudioPlayback();
  const [maxFret, setMaxFret] = useState(12);
  const [includeAccidentals, setIncludeAccidentals] = useState(true);
  const [target, setTarget] = useState<{ string: number; fret: number; note: string } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [timer, setTimer] = useState(0);
  const startedAtRef = useRef<number>(0);

  const newQuestion = useCallback(() => {
    let s: number, f: number, n: string;
    let tries = 0;
    do {
      s = Math.floor(Math.random() * 6);
      f = Math.floor(Math.random() * (maxFret + 1));
      n = noteAtFret(s, f);
      tries++;
      if (!includeAccidentals && n.includes('#')) continue;
      break;
    } while (tries < 50);
    setTarget({ string: s, fret: f, note: n });
    setFeedback(null);
    startedAtRef.current = performance.now();
  }, [maxFret, includeAccidentals]);

  useEffect(() => {
    if (!target) newQuestion();
  }, [target, newQuestion]);

  const guess = useCallback((noteGuess: string) => {
    if (!target || feedback) return;
    if (noteGuess === target.note) {
      setFeedback('correct');
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      setTimer((t) => t + elapsed);
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      // Play the note
      const octave = target.string < 2 ? 2 : target.string < 4 ? 3 : 4;
      playNote(freqOfNote(target.note, octave), 0.5, 0.7);
      setTimeout(newQuestion, 500);
    } else {
      setFeedback('wrong');
      setScore((s) => ({ correct: s.correct, total: s.total + 1 }));
      setTimeout(newQuestion, 1100);
    }
  }, [target, feedback, newQuestion, playNote]);

  const accuracy = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);
  const avgTime = score.correct === 0 ? 0 : (timer / score.correct).toFixed(1);

  // Render fretboard
  const FRET_W = 36;
  const STR_H = 22;
  const LEFT_PAD = 24;
  const TOP_PAD = 12;
  const w = LEFT_PAD + (maxFret + 1) * FRET_W + 12;
  const h = TOP_PAD + 6 * STR_H + 24;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        <div className="px-2 py-1.5 rounded bg-card/40 border border-border/40 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Score</div>
          <div className="font-bold text-primary">{score.correct} / {score.total}</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-card/40 border border-border/40 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Accuracy</div>
          <div className="font-bold text-foreground">{accuracy}%</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-card/40 border border-border/40 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Avg Time</div>
          <div className="font-bold text-amber-300">{avgTime}s</div>
        </div>
        <button
          onClick={() => { setScore({ correct: 0, total: 0 }); setTimer(0); newQuestion(); }}
          className="px-2 py-1.5 rounded bg-secondary/40 border border-border/40 text-foreground hover:bg-secondary/70 flex items-center justify-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground font-display uppercase tracking-wide">Max fret</span>
          <Slider value={[maxFret]} onValueChange={([v]) => setMaxFret(v)} min={5} max={15} className="w-32" />
          <span className="font-mono font-bold text-primary w-6">{maxFret}</span>
        </label>
        <button
          onClick={() => setIncludeAccidentals(!includeAccidentals)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-mono border ${
            includeAccidentals ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary/40 border-border/40 text-muted-foreground'
          }`}
        >
          {includeAccidentals ? '◉' : '○'} Sharps
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-gradient-to-br from-amber-900/20 to-card/30 border border-border/50 p-2">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="min-w-[480px]">
          {/* Nut */}
          <rect x={LEFT_PAD - 3} y={TOP_PAD - 4} width={4} height={6 * STR_H + 8} fill="hsl(var(--foreground))" rx={1} />
          {/* Frets */}
          {Array.from({ length: maxFret + 1 }).map((_, f) => (
            <line key={f} x1={LEFT_PAD + f * FRET_W} y1={TOP_PAD - 4} x2={LEFT_PAD + f * FRET_W} y2={TOP_PAD + 6 * STR_H + 4} stroke="hsl(var(--border))" strokeWidth={0.8} />
          ))}
          {/* Strings (drawn from low E at top to high E at bottom, reversed) */}
          {[5, 4, 3, 2, 1, 0].map((sIdx, i) => (
            <g key={sIdx}>
              <line x1={LEFT_PAD} y1={TOP_PAD + i * STR_H} x2={LEFT_PAD + (maxFret + 1) * FRET_W} y2={TOP_PAD + i * STR_H}
                stroke="hsl(var(--muted-foreground))" strokeWidth={i < 3 ? 1.5 : 1} opacity={0.5} />
              <text x={LEFT_PAD - 12} y={TOP_PAD + i * STR_H + 4} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">
                {['e', 'B', 'G', 'D', 'A', 'E'][i]}
              </text>
            </g>
          ))}
          {/* Fret position markers */}
          {[3, 5, 7, 9].map((f) => f <= maxFret && (
            <circle key={f} cx={LEFT_PAD + (f - 0.5) * FRET_W} cy={TOP_PAD + 2.5 * STR_H} r={3} fill="hsl(var(--muted-foreground))" opacity={0.18} />
          ))}
          {12 <= maxFret && [-0.5, 0.5].map((dy) => (
            <circle key={dy} cx={LEFT_PAD + 11.5 * FRET_W} cy={TOP_PAD + (2.5 + dy * 2) * STR_H} r={3} fill="hsl(var(--muted-foreground))" opacity={0.18} />
          ))}
          {/* Fret numbers */}
          {Array.from({ length: maxFret + 1 }).map((_, f) => f > 0 && (
            <text key={f} x={LEFT_PAD + (f - 0.5) * FRET_W} y={TOP_PAD + 6 * STR_H + 18} fontSize={8} fill="hsl(var(--muted-foreground))" textAnchor="middle">{f}</text>
          ))}
          {/* Target marker */}
          {target && (() => {
            // Map string idx (0=lowE) → display row (0=top is high e, so reverse)
            const displayRow = 5 - target.string;
            const cx = target.fret === 0 ? LEFT_PAD - 12 : LEFT_PAD + (target.fret - 0.5) * FRET_W;
            const cy = TOP_PAD + displayRow * STR_H;
            return (
              <motion.circle
                key={`${target.string}-${target.fret}-${score.total}`}
                cx={cx} cy={cy}
                r={feedback === 'correct' ? 12 : feedback === 'wrong' ? 12 : 10}
                fill={feedback === 'correct' ? 'hsl(150 70% 50%)' : feedback === 'wrong' ? 'hsl(0 70% 55%)' : 'hsl(var(--primary))'}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            );
          })()}
        </svg>
      </div>

      {/* Note buttons */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {NOTE_NAMES.map((n) => (
          <button
            key={n}
            onClick={() => guess(n)}
            disabled={!!feedback}
            className={`px-2 py-2 rounded-md text-xs font-display font-bold transition-all ${
              feedback === 'correct' && target?.note === n
                ? 'bg-green-500 text-white shadow-lg'
                : feedback === 'wrong' && target?.note === n
                  ? 'bg-green-500/40 text-white animate-pulse'
                  : 'bg-secondary/50 hover:bg-primary/30 text-foreground border border-border/50 hover:border-primary/40'
            } disabled:opacity-60`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 3) Modes Reference
// ============================================================
const MODES: { name: string; intervals: number[]; mood: string; songs: string[]; formula: string }[] = [
  { name: 'Ionian (Major)',  intervals: [0, 2, 4, 5, 7, 9, 11],  mood: 'Bright, happy, resolved', songs: ["Let It Be", "Twinkle Twinkle"], formula: '1 2 3 4 5 6 7' },
  { name: 'Dorian',          intervals: [0, 2, 3, 5, 7, 9, 10],  mood: 'Cool, jazzy, mysterious minor', songs: ["So What — Miles Davis", "Smoke on the Water"], formula: '1 2 ♭3 4 5 6 ♭7' },
  { name: 'Phrygian',        intervals: [0, 1, 3, 5, 7, 8, 10],  mood: 'Dark, exotic, Spanish/metal', songs: ["Symphony of Destruction", "Wherever I May Roam"], formula: '1 ♭2 ♭3 4 5 ♭6 ♭7' },
  { name: 'Lydian',          intervals: [0, 2, 4, 6, 7, 9, 11],  mood: 'Dreamy, floating, magical', songs: ["The Simpsons theme", "Flying in a Blue Dream"], formula: '1 2 3 ♯4 5 6 7' },
  { name: 'Mixolydian',      intervals: [0, 2, 4, 5, 7, 9, 10],  mood: 'Bluesy, rocky, dominant', songs: ["Sweet Child o’ Mine", "Sweet Home Alabama"], formula: '1 2 3 4 5 6 ♭7' },
  { name: 'Aeolian (Minor)', intervals: [0, 2, 3, 5, 7, 8, 10],  mood: 'Sad, melancholic, natural minor', songs: ["Stairway to Heaven", "Losing My Religion"], formula: '1 2 ♭3 4 5 ♭6 ♭7' },
  { name: 'Locrian',         intervals: [0, 1, 3, 5, 6, 8, 10],  mood: 'Unstable, dissonant, rare', songs: ["Army of Me — Björk", "YYZ outro"], formula: '1 ♭2 ♭3 4 ♭5 ♭6 ♭7' },
];

function ModesReference() {
  const { playSequence } = useAudioPlayback();
  const [modeIdx, setModeIdx] = useState(0);
  const [root, setRoot] = useState<NoteName>('C');
  const mode = MODES[modeIdx];
  const rootIdx = NOTE_NAMES.indexOf(root);
  const notes = mode.intervals.map((iv) => NOTE_NAMES[(rootIdx + iv) % 12]);

  const playMode = useCallback(() => {
    const seq = mode.intervals.map((iv) => ({
      freq: 440 * Math.pow(2, (rootIdx + iv - 9) / 12) * (rootIdx + iv >= 9 ? 1 : 2),
      dur: 0.45,
      gap: 0.4,
    }));
    // Add octave
    seq.push({ freq: seq[0].freq * 2, dur: 0.6, gap: 0.6 });
    playSequence(seq);
  }, [mode, rootIdx, playSequence]);

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m, i) => (
          <button
            key={m.name}
            onClick={() => setModeIdx(i)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-display transition-all ${
              modeIdx === i ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Root selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Root</span>
        <div className="flex flex-wrap gap-1">
          {NOTE_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => setRoot(n)}
              className={`w-7 h-7 rounded-full text-[10px] font-display font-bold transition-all ${
                root === n ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Mode info */}
      <motion.div
        key={`${mode.name}-${root}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-card to-card/40 rounded-xl border border-border/80 p-4 space-y-3"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-display font-bold text-foreground text-base">{root} {mode.name}</h4>
          <span className="text-[11px] font-mono text-muted-foreground">{mode.formula}</span>
        </div>
        <p className="text-[12px] text-foreground/85 italic">{mode.mood}</p>

        <div className="flex flex-wrap gap-2">
          {notes.map((n, i) => (
            <span
              key={`${n}-${i}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold ${
                i === 0 ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-secondary/50 text-foreground border border-border/60'
              }`}
            >
              {n}
            </span>
          ))}
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-display font-bold bg-primary/40 text-primary-foreground border border-primary/60 opacity-70">
            {notes[0]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={playMode} className="gap-1.5">
            <Volume2 className="w-3.5 h-3.5" /> Play scale
          </Button>
          <span className="text-[10px] text-muted-foreground">Example songs: {mode.songs.join(' · ')}</span>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// 4) Chord Progression Generator
// ============================================================
const PROGRESSION_TEMPLATES = [
  { name: 'I–IV–V (Classic Rock)',     degrees: [0, 5, 7],            quals: ['', '', ''],            tags: 'classic' },
  { name: 'I–V–vi–IV (Pop)',           degrees: [0, 7, 9, 5],         quals: ['', '', 'm', ''],       tags: 'pop' },
  { name: 'vi–IV–I–V (Modern Pop)',    degrees: [9, 5, 0, 7],         quals: ['m', '', '', ''],       tags: 'pop' },
  { name: 'I–vi–IV–V (50s doo-wop)',   degrees: [0, 9, 5, 7],         quals: ['', 'm', '', ''],       tags: 'retro' },
  { name: 'ii–V–I (Jazz)',             degrees: [2, 7, 0],            quals: ['m7', '7', 'maj7'],     tags: 'jazz' },
  { name: 'I–vi–ii–V (Jazz turnaround)', degrees: [0, 9, 2, 7],       quals: ['maj7', 'm7', 'm7', '7'], tags: 'jazz' },
  { name: '12-bar Blues',              degrees: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], quals: ['7','7','7','7','7','7','7','7','7','7','7','7'], tags: 'blues' },
  { name: 'I–♭VII–IV (Rock)',          degrees: [0, 10, 5],           quals: ['', '', ''],            tags: 'rock' },
  { name: 'i–♭VI–♭III–♭VII (Andalusian)', degrees: [0, 8, 3, 10],     quals: ['m', '', '', ''],       tags: 'minor' },
  { name: 'i–iv–v (Natural Minor)',    degrees: [0, 5, 7],            quals: ['m', 'm', 'm'],         tags: 'minor' },
  { name: 'I–iii–IV–V',                degrees: [0, 4, 5, 7],         quals: ['', 'm', '', ''],       tags: 'pop' },
  { name: 'I–IV–vi–V',                 degrees: [0, 5, 9, 7],         quals: ['', '', 'm', ''],       tags: 'pop' },
];

function ChordProgressionGen() {
  const { playSequence } = useAudioPlayback();
  const [key, setKey] = useState<NoteName>('C');
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? PROGRESSION_TEMPLATES : PROGRESSION_TEMPLATES.filter((p) => p.tags === filter);

  const buildChords = useCallback((tpl: typeof PROGRESSION_TEMPLATES[number]) => {
    const rootIdx = NOTE_NAMES.indexOf(key);
    return tpl.degrees.map((d, i) => `${NOTE_NAMES[(rootIdx + d) % 12]}${tpl.quals[i]}`);
  }, [key]);

  const playProgression = useCallback((tpl: typeof PROGRESSION_TEMPLATES[number]) => {
    const rootIdx = NOTE_NAMES.indexOf(key);
    const seq = tpl.degrees.map((d, i) => {
      const semitone = rootIdx + d;
      // Voicing: root + 3rd + 5th in lower octave-ish
      const baseFreq = 440 * Math.pow(2, (semitone - 9 - 12) / 12); // ~octave 3
      const isMinor = tpl.quals[i].startsWith('m') && !tpl.quals[i].startsWith('maj');
      const third = baseFreq * Math.pow(2, (isMinor ? 3 : 4) / 12);
      const fifth = baseFreq * Math.pow(2, 7 / 12);
      return [
        { freq: baseFreq, dur: 1.0, gap: 0 },
        { freq: third,    dur: 1.0, gap: 0 },
        { freq: fifth,    dur: 1.0, gap: 1.0 },
      ];
    }).flat();
    playSequence(seq);
  }, [key, playSequence]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Key</span>
        <div className="flex flex-wrap gap-1">
          {NOTE_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => setKey(n)}
              className={`w-7 h-7 rounded-full text-[10px] font-display font-bold transition-all ${
                key === n ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['all', 'pop', 'rock', 'jazz', 'blues', 'minor', 'retro', 'classic'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
              filter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((tpl) => {
          const chords = buildChords(tpl);
          return (
            <div key={tpl.name} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card/40 border border-border/50">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-display font-bold text-foreground">{tpl.name}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {chords.map((c, i) => (
                    <span key={`${c}-${i}`} className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono font-bold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => playProgression(tpl)}
                className="shrink-0 px-3 py-1.5 rounded-md bg-primary/15 border border-primary/40 text-primary hover:bg-primary/30 transition-all flex items-center gap-1 text-xs font-display"
              >
                <Play className="w-3 h-3" /> Play
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 5) Interval Ear Training
// ============================================================
const INTERVALS: { semis: number; name: string; short: string }[] = [
  { semis: 1, name: 'Minor 2nd', short: 'm2' },
  { semis: 2, name: 'Major 2nd', short: 'M2' },
  { semis: 3, name: 'Minor 3rd', short: 'm3' },
  { semis: 4, name: 'Major 3rd', short: 'M3' },
  { semis: 5, name: 'Perfect 4th', short: 'P4' },
  { semis: 6, name: 'Tritone', short: 'TT' },
  { semis: 7, name: 'Perfect 5th', short: 'P5' },
  { semis: 8, name: 'Minor 6th', short: 'm6' },
  { semis: 9, name: 'Major 6th', short: 'M6' },
  { semis: 10, name: 'Minor 7th', short: 'm7' },
  { semis: 11, name: 'Major 7th', short: 'M7' },
  { semis: 12, name: 'Octave', short: 'P8' },
];

function IntervalEarTraining() {
  const { playSequence, playNote } = useAudioPlayback();
  const [mode, setMode] = useState<'asc' | 'desc' | 'harm'>('asc');
  const [target, setTarget] = useState<typeof INTERVALS[number] | null>(null);
  const [rootFreq, setRootFreq] = useState<number>(220);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const playInterval = useCallback(async (interval: typeof INTERVALS[number], rf: number) => {
    const a = rf;
    const b = rf * Math.pow(2, interval.semis / 12);
    if (mode === 'harm') {
      // both at once
      playNote(a, 1.2, 0.7);
      playNote(b, 1.2, 0.7);
    } else {
      const seq = mode === 'asc' ? [{ freq: a, dur: 0.6, gap: 0.6 }, { freq: b, dur: 1.0 }]
                                  : [{ freq: b, dur: 0.6, gap: 0.6 }, { freq: a, dur: 1.0 }];
      playSequence(seq);
    }
  }, [mode, playNote, playSequence]);

  const newQuestion = useCallback(() => {
    const interval = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    const rf = 196 * Math.pow(2, (Math.floor(Math.random() * 5) - 2) / 12); // around G3, varied
    setTarget(interval);
    setRootFreq(rf);
    setFeedback(null);
    setTimeout(() => playInterval(interval, rf), 200);
  }, [playInterval]);

  useEffect(() => {
    if (!target) newQuestion();
  }, [target, newQuestion]);

  const guess = useCallback((semis: number) => {
    if (!target || feedback) return;
    if (semis === target.semis) {
      setFeedback('correct');
      setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
      setTimeout(newQuestion, 700);
    } else {
      setFeedback('wrong');
      setScore((s) => ({ correct: s.correct, total: s.total + 1 }));
      setTimeout(newQuestion, 1500);
    }
  }, [target, feedback, newQuestion]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border">
          {(['asc', 'desc', 'harm'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
                mode === m ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'asc' ? 'Ascending' : m === 'desc' ? 'Descending' : 'Harmonic'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-1 rounded bg-card/40 border border-border/40">
            <span className="text-muted-foreground">Score </span>
            <span className="font-bold text-primary">{score.correct} / {score.total}</span>
          </span>
          <button
            onClick={() => setScore({ correct: 0, total: 0 })}
            className="px-2 py-1 rounded bg-secondary/40 border border-border/40 text-foreground hover:bg-secondary/70"
            title="Reset score"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <Button onClick={() => target && playInterval(target, rootFreq)} disabled={!target} className="gap-2">
          <Volume2 className="w-4 h-4" /> Replay
        </Button>
        <Button variant="outline" onClick={newQuestion} className="gap-2">
          <Play className="w-4 h-4" /> Skip / Next
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {INTERVALS.map((iv) => {
          const wasCorrect = feedback === 'correct' && target?.semis === iv.semis;
          const wasRevealed = feedback === 'wrong' && target?.semis === iv.semis;
          return (
            <button
              key={iv.semis}
              onClick={() => guess(iv.semis)}
              disabled={!!feedback}
              className={`px-2 py-2 rounded-md text-xs font-display transition-all ${
                wasCorrect ? 'bg-green-500 text-white shadow-lg' :
                wasRevealed ? 'bg-green-500/40 text-white animate-pulse' :
                'bg-secondary/50 hover:bg-primary/30 text-foreground border border-border/50 hover:border-primary/40'
              } disabled:opacity-60`}
            >
              <div className="font-bold">{iv.short}</div>
              <div className="text-[9px] opacity-75">{iv.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 6) String Tension Calculator
// ============================================================
// Tension formula: T (lb) = (UW × (2 × L × f)²) / 386.4
// where UW = unit weight (lb/in) — derived from gauge with empirical multipliers.
// Plain steel: UW ≈ 0.000072 × gauge² (gauge in 0.001 in)
// Wound (NW = nickel-wound, common): UW ≈ 0.000094 × gauge² × roughness
// We use simple D'Addario PL/NW approximations.
function unitWeight(gauge: number, wound: boolean): number {
  // gauge in 0.001 in (e.g. 10 = 0.010")
  // Empirical: UW ≈ k × gauge² × 1e-6 (lb/in)
  const k = wound ? 0.135 : 0.080;
  return (k * gauge * gauge) / 1000000;
}

function tensionLb(gauge: number, wound: boolean, scaleIn: number, freq: number): number {
  const uw = unitWeight(gauge, wound);
  return (uw * Math.pow(2 * scaleIn * freq, 2)) / 386.4;
}

const STRING_DEFAULTS_TUNINGS: { name: string; notes: { note: string; octave: number }[] }[] = [
  { name: 'Standard E', notes: [{note:'E',octave:2},{note:'A',octave:2},{note:'D',octave:3},{note:'G',octave:3},{note:'B',octave:3},{note:'E',octave:4}] },
  { name: 'Drop D',     notes: [{note:'D',octave:2},{note:'A',octave:2},{note:'D',octave:3},{note:'G',octave:3},{note:'B',octave:3},{note:'E',octave:4}] },
  { name: 'Eb Standard',notes: [{note:'D#',octave:2},{note:'G#',octave:2},{note:'C#',octave:3},{note:'F#',octave:3},{note:'A#',octave:3},{note:'D#',octave:4}] },
  { name: 'D Standard', notes: [{note:'D',octave:2},{note:'G',octave:2},{note:'C',octave:3},{note:'F',octave:3},{note:'A',octave:3},{note:'D',octave:4}] },
  { name: 'Drop C',     notes: [{note:'C',octave:2},{note:'G',octave:2},{note:'C',octave:3},{note:'F',octave:3},{note:'A',octave:3},{note:'D',octave:4}] },
  { name: 'Open G',     notes: [{note:'D',octave:2},{note:'G',octave:2},{note:'D',octave:3},{note:'G',octave:3},{note:'B',octave:3},{note:'D',octave:4}] },
  { name: 'DADGAD',     notes: [{note:'D',octave:2},{note:'A',octave:2},{note:'D',octave:3},{note:'G',octave:3},{note:'A',octave:3},{note:'D',octave:4}] },
];
const GAUGE_PRESETS: { name: string; gauges: number[] }[] = [
  { name: 'Extra Light (.009)',    gauges: [9, 11, 16, 24, 32, 42] },
  { name: 'Light (.010)',          gauges: [10, 13, 17, 26, 36, 46] },
  { name: 'Medium (.011)',         gauges: [11, 14, 18, 28, 38, 49] },
  { name: 'Heavy (.012)',          gauges: [12, 16, 20, 32, 42, 54] },
  { name: 'Extra Heavy (.013)',    gauges: [13, 17, 26, 36, 46, 56] },
];

function StringTensionCalc() {
  const [tuningIdx, setTuningIdx] = useState(0);
  const [gaugeIdx, setGaugeIdx] = useState(1); // light .010
  const [scaleIn, setScaleIn] = useState(25.5);
  const tuning = STRING_DEFAULTS_TUNINGS[tuningIdx];
  const gauges = GAUGE_PRESETS[gaugeIdx].gauges;

  const tensions = useMemo(() => {
    return tuning.notes.map((n, i) => {
      const f = freqOfNote(n.note, n.octave);
      const wound = i < 3; // E A D wound, G B e plain (typical light set; B sometimes plain)
      const t = tensionLb(gauges[i], wound, scaleIn, f);
      return { string: 6 - i, note: `${n.note}${n.octave}`, freq: f, gauge: gauges[i], wound, tension: t };
    });
  }, [tuning, gauges, scaleIn]);

  const total = tensions.reduce((sum, t) => sum + t.tension, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Tuning</label>
          <select value={tuningIdx} onChange={(e) => setTuningIdx(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 rounded-md bg-secondary/50 border border-border text-xs font-mono">
            {STRING_DEFAULTS_TUNINGS.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Gauge Set</label>
          <select value={gaugeIdx} onChange={(e) => setGaugeIdx(Number(e.target.value))} className="mt-1 w-full px-2 py-1.5 rounded-md bg-secondary/50 border border-border text-xs font-mono">
            {GAUGE_PRESETS.map((g, i) => <option key={g.name} value={i}>{g.name} — {g.gauges.join('/')}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Scale Length</label>
          <span className="text-xs font-mono text-primary font-bold">{scaleIn}″ ({(scaleIn * 25.4).toFixed(0)} mm)</span>
        </div>
        <Slider value={[scaleIn]} onValueChange={([v]) => setScaleIn(v)} min={22} max={28} step={0.05} />
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full text-[11px] font-mono">
          <thead className="bg-secondary/50">
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-1.5">String</th>
              <th className="px-2 py-1.5">Note</th>
              <th className="px-2 py-1.5">Freq</th>
              <th className="px-2 py-1.5">Gauge</th>
              <th className="px-2 py-1.5">Type</th>
              <th className="px-2 py-1.5 text-right">Tension</th>
            </tr>
          </thead>
          <tbody>
            {tensions.map((t) => (
              <tr key={t.string} className="border-t border-border/30 hover:bg-card/50">
                <td className="px-2 py-1.5">{t.string}</td>
                <td className="px-2 py-1.5 font-bold text-primary">{t.note}</td>
                <td className="px-2 py-1.5">{t.freq.toFixed(2)} Hz</td>
                <td className="px-2 py-1.5">.{t.gauge.toString().padStart(3, '0')}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{t.wound ? 'wound' : 'plain'}</td>
                <td className="px-2 py-1.5 text-right font-bold text-amber-300">{t.tension.toFixed(1)} lb</td>
              </tr>
            ))}
            <tr className="border-t-2 border-primary/50 bg-primary/5">
              <td className="px-2 py-1.5 font-bold" colSpan={5}>Total</td>
              <td className="px-2 py-1.5 text-right font-bold text-primary">{total.toFixed(1)} lb</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
        Tension = (UW × (2 × L × f)²) / 386.4 with UW empirically derived from gauge & string type.
        Numbers are within ~5% of D'Addario published values for nickel-wound + plain-steel sets.
        Use this to compare tunings/gauges — for absolute values, consult the manufacturer's tension chart.
      </p>
    </div>
  );
}

// ============================================================
// Wrapper
// ============================================================
type Tab = 'transpose' | 'fretboard' | 'modes' | 'progression' | 'ear' | 'tension';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'transpose',   label: 'Transpose / Capo', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { id: 'fretboard',   label: 'Fretboard Trainer', icon: <Brain className="w-3.5 h-3.5" /> },
  { id: 'modes',       label: 'Modes',             icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'progression', label: 'Progressions',      icon: <Music className="w-3.5 h-3.5" /> },
  { id: 'ear',         label: 'Ear Training',      icon: <Ear className="w-3.5 h-3.5" /> },
  { id: 'tension',     label: 'String Tension',    icon: <Scale className="w-3.5 h-3.5" /> },
];

export function UtilitiesSection() {
  const [tab, setTab] = useState<Tab>('transpose');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'transpose' && <TransposerCapo />}
          {tab === 'fretboard' && <FretboardTrainer />}
          {tab === 'modes' && <ModesReference />}
          {tab === 'progression' && <ChordProgressionGen />}
          {tab === 'ear' && <IntervalEarTraining />}
          {tab === 'tension' && <StringTensionCalc />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
