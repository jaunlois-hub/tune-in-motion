import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Play, RotateCcw, Eye, EyeOff, Flame, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensurePluckBuffer, playPluckedNote } from '@/lib/pluckedSynth';

// ============================================================
// Intervals
// ============================================================
interface Interval {
  semis: number;
  short: string;
  name: string;
  category: 'easy' | 'normal' | 'hard';
}

const INTERVALS: Interval[] = [
  { semis: 1,  short: 'm2', name: 'Minor 2nd',   category: 'normal' },
  { semis: 2,  short: 'M2', name: 'Major 2nd',   category: 'normal' },
  { semis: 3,  short: 'm3', name: 'Minor 3rd',   category: 'easy'   },
  { semis: 4,  short: 'M3', name: 'Major 3rd',   category: 'easy'   },
  { semis: 5,  short: 'P4', name: 'Perfect 4th', category: 'easy'   },
  { semis: 6,  short: 'TT', name: 'Tritone',     category: 'hard'   },
  { semis: 7,  short: 'P5', name: 'Perfect 5th', category: 'easy'   },
  { semis: 8,  short: 'm6', name: 'Minor 6th',   category: 'normal' },
  { semis: 9,  short: 'M6', name: 'Major 6th',   category: 'normal' },
  { semis: 10, short: 'm7', name: 'Minor 7th',   category: 'normal' },
  { semis: 11, short: 'M7', name: 'Major 7th',   category: 'hard'   },
  { semis: 12, short: 'P8', name: 'Octave',      category: 'easy'   },
];

type Difficulty = 'easy' | 'normal' | 'hard';
type Mode = 'visual' | 'audio' | 'mixed';
type Direction = 'asc' | 'desc' | 'harm';

// Standard tuning open frequencies, low-E (string 5) → high-e (string 0)
const STRING_FREQS = [329.63, 246.94, 196.00, 146.83, 110.00, 82.41]; // e, B, G, D, A, E
const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

interface FretPos {
  string: number; // 0=high e, 5=low E
  fret: number;
  freq: number;
}

const STORAGE_KEY = 'bleedout.intervalTrainer.bestStreak';

// Pick a fret position whose frequency is within range
function fretFreq(stringIdx: number, fret: number): number {
  return STRING_FREQS[stringIdx] * Math.pow(2, fret / 12);
}

function pickRandomPosition(maxFret = 12): FretPos {
  const string = Math.floor(Math.random() * 6);
  const fret = Math.floor(Math.random() * (maxFret + 1));
  return { string, fret, freq: fretFreq(string, fret) };
}

// Find a second position whose pitch is exactly `semis` above the first.
// Tries up to N times; falls back to same-string offset.
function pickIntervalPartner(start: FretPos, semis: number, maxFret = 12): FretPos {
  for (let i = 0; i < 40; i++) {
    const string = Math.floor(Math.random() * 6);
    // higher target pitch, locate fret that makes it work
    const targetFreq = start.freq * Math.pow(2, semis / 12);
    const fret = Math.round(12 * Math.log2(targetFreq / STRING_FREQS[string]));
    if (fret >= 0 && fret <= maxFret) {
      const freq = fretFreq(string, fret);
      // accept if freq matches within a cent
      if (Math.abs(1200 * Math.log2(freq / targetFreq)) < 1) {
        return { string, fret, freq };
      }
    }
  }
  // Fallback: same string offset
  const fallbackFret = Math.min(maxFret, start.fret + semis);
  return { string: start.string, fret: fallbackFret, freq: fretFreq(start.string, fallbackFret) };
}

// ============================================================
// Mini fretboard renderer
// ============================================================
function MiniFretboard({
  notes,
  reveal,
}: {
  notes: { pos: FretPos; label: string; color: string }[];
  reveal: boolean;
}) {
  const FRETS = 12;
  const FRET_W = 32;
  const STR_H = 18;
  const LEFT = 22;
  const TOP = 12;
  const W = LEFT + (FRETS + 1) * FRET_W + 12;
  const H = TOP + 6 * STR_H + 22;

  return (
    <div className="overflow-x-auto rounded-lg bg-gradient-to-br from-amber-900/15 to-card/30 border border-border/50 p-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="min-w-[460px]">
        {/* Nut */}
        <rect x={LEFT - 3} y={TOP - 4} width={4} height={6 * STR_H + 8} fill="hsl(var(--foreground))" rx={1} />
        {/* Frets */}
        {Array.from({ length: FRETS + 1 }).map((_, f) => (
          <line
            key={f}
            x1={LEFT + f * FRET_W}
            y1={TOP - 4}
            x2={LEFT + f * FRET_W}
            y2={TOP + 6 * STR_H + 4}
            stroke="hsl(var(--border))"
            strokeWidth={f === 0 ? 1.2 : 0.7}
          />
        ))}
        {/* Strings */}
        {STRING_LABELS.map((lbl, i) => (
          <g key={lbl}>
            <line
              x1={LEFT}
              y1={TOP + i * STR_H}
              x2={LEFT + (FRETS + 1) * FRET_W}
              y2={TOP + i * STR_H}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={i > 2 ? 1.4 : 1}
              opacity={0.5}
            />
            <text x={LEFT - 12} y={TOP + i * STR_H + 4} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">
              {lbl}
            </text>
          </g>
        ))}
        {/* Inlays */}
        {[3, 5, 7, 9].map((f) => (
          <circle key={f} cx={LEFT + (f - 0.5) * FRET_W} cy={TOP + 2.5 * STR_H} r={3} fill="hsl(var(--muted-foreground))" opacity={0.18} />
        ))}
        {[-0.5, 0.5].map((dy) => (
          <circle key={dy} cx={LEFT + 11.5 * FRET_W} cy={TOP + (2.5 + dy * 2) * STR_H} r={3} fill="hsl(var(--muted-foreground))" opacity={0.18} />
        ))}
        {/* Fret numbers */}
        {Array.from({ length: FRETS + 1 }).map((_, f) =>
          f > 0 ? (
            <text
              key={f}
              x={LEFT + (f - 0.5) * FRET_W}
              y={TOP + 6 * STR_H + 16}
              fontSize={8}
              fill="hsl(var(--muted-foreground))"
              textAnchor="middle"
            >
              {f}
            </text>
          ) : null
        )}
        {/* Note markers */}
        {notes.map((n, idx) => {
          const cx = n.pos.fret === 0 ? LEFT - 12 : LEFT + (n.pos.fret - 0.5) * FRET_W;
          const cy = TOP + n.pos.string * STR_H;
          return (
            <g key={`${idx}-${n.pos.string}-${n.pos.fret}`}>
              <motion.circle
                cx={cx}
                cy={cy}
                r={11}
                fill={n.color}
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.08 }}
              />
              {reveal && (
                <text
                  x={cx}
                  y={cy + 3}
                  fontSize={9}
                  fill="white"
                  textAnchor="middle"
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================
export function IntervalTrainer() {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [mode, setMode] = useState<Mode>('mixed');
  const [direction, setDirection] = useState<Direction>('asc');
  const [target, setTarget] = useState<{ interval: Interval; a: FretPos; b: FretPos; dir: Direction } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);

  // Restore best streak
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setBestStreak(Number(stored) || 0);
  }, []);

  const intervalPool = useMemo(() => {
    if (difficulty === 'easy') return INTERVALS.filter((i) => i.category === 'easy');
    if (difficulty === 'normal') return INTERVALS.filter((i) => i.category !== 'hard');
    return INTERVALS;
  }, [difficulty]);

  const playInterval = useCallback(
    async (a: FretPos, b: FretPos, dir: Direction) => {
      if (!ctxRef.current || ctxRef.current.state === 'closed') ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      if (!bufRef.current) bufRef.current = await ensurePluckBuffer(ctx);
      const buf = bufRef.current;
      const t0 = ctx.currentTime + 0.05;
      if (dir === 'harm') {
        playPluckedNote(ctx, buf, a.freq, t0, 1.2, 0.65);
        playPluckedNote(ctx, buf, b.freq, t0, 1.2, 0.65);
      } else if (dir === 'asc') {
        playPluckedNote(ctx, buf, a.freq, t0, 0.6, 0.7);
        playPluckedNote(ctx, buf, b.freq, t0 + 0.6, 1.0, 0.7);
      } else {
        playPluckedNote(ctx, buf, b.freq, t0, 0.6, 0.7);
        playPluckedNote(ctx, buf, a.freq, t0 + 0.6, 1.0, 0.7);
      }
    },
    [],
  );

  const newQuestion = useCallback(() => {
    const interval = intervalPool[Math.floor(Math.random() * intervalPool.length)];
    // Pick first position low enough that interval fits
    let a: FretPos = pickRandomPosition(12 - Math.min(interval.semis, 7));
    let b = pickIntervalPartner(a, interval.semis);
    if (b.fret > 12) {
      // Try once more from a low fret
      a = { string: 5, fret: Math.floor(Math.random() * 5), freq: fretFreq(5, 0) };
      a.freq = fretFreq(a.string, a.fret);
      b = pickIntervalPartner(a, interval.semis);
    }
    const dir: Direction = direction;
    setTarget({ interval, a, b, dir });
    setFeedback(null);
    if (mode !== 'visual') {
      setTimeout(() => playInterval(a, b, dir), 250);
    }
  }, [intervalPool, direction, mode, playInterval]);

  useEffect(() => {
    if (!target) newQuestion();
  }, [target, newQuestion]);

  // Re-roll when difficulty changes (so the interval pool reshuffles)
  useEffect(() => {
    setTarget(null);
  }, [difficulty]);

  const guess = useCallback(
    (semis: number) => {
      if (!target || feedback) return;
      if (semis === target.interval.semis) {
        setFeedback('correct');
        setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
        setStreak((s) => {
          const next = s + 1;
          if (next > bestStreak) {
            setBestStreak(next);
            localStorage.setItem(STORAGE_KEY, String(next));
          }
          return next;
        });
        setTimeout(newQuestion, 700);
      } else {
        setFeedback('wrong');
        setScore((s) => ({ correct: s.correct, total: s.total + 1 }));
        setStreak(0);
        setTimeout(newQuestion, 1500);
      }
    },
    [target, feedback, newQuestion, bestStreak],
  );

  const accuracy = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);

  const showVisual = mode === 'visual' || mode === 'mixed';
  const fretboardNotes = target
    ? [
        { pos: target.a, label: '1', color: 'hsl(var(--primary))' },
        { pos: target.b, label: '2', color: 'hsl(25 95% 55%)' },
      ]
    : [];

  return (
    <div className="space-y-3">
      {/* Stats row */}
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
          <div className="text-[9px] text-muted-foreground uppercase flex items-center justify-center gap-1">
            <Flame className="w-3 h-3" /> Streak
          </div>
          <div className="font-bold text-amber-300">{streak}</div>
        </div>
        <div className="px-2 py-1.5 rounded bg-card/40 border border-border/40 text-center">
          <div className="text-[9px] text-muted-foreground uppercase flex items-center justify-center gap-1">
            <Trophy className="w-3 h-3" /> Best
          </div>
          <div className="font-bold text-foreground">{bestStreak}</div>
        </div>
      </div>

      {/* Mode + difficulty + direction */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border">
          {(['visual', 'audio', 'mixed'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
                mode === m ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'visual' ? <Eye className="w-3 h-3" /> : m === 'audio' ? <EyeOff className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border">
          {(['easy', 'normal', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
                difficulty === d ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {(mode === 'audio' || mode === 'mixed') && (
          <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border">
            {(['asc', 'desc', 'harm'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
                  direction === d ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d === 'asc' ? '↑ Asc' : d === 'desc' ? '↓ Desc' : '⊕ Harm'}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setScore({ correct: 0, total: 0 });
            setStreak(0);
          }}
          className="ml-auto px-2 py-1 rounded bg-secondary/40 border border-border/40 text-foreground hover:bg-secondary/70 flex items-center gap-1 text-[10px]"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Fretboard */}
      {showVisual && target && (
        <MiniFretboard notes={fretboardNotes} reveal={feedback !== null} />
      )}

      {/* Audio replay */}
      {target && (
        <div className="flex justify-center gap-2">
          <Button onClick={() => playInterval(target.a, target.b, target.dir)} size="sm" className="gap-2">
            <Volume2 className="w-4 h-4" /> Replay
          </Button>
          <Button variant="outline" onClick={newQuestion} size="sm" className="gap-2">
            <Play className="w-4 h-4" /> Skip / Next
          </Button>
        </div>
      )}

      {/* Interval choices */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        <AnimatePresence>
          {INTERVALS.map((iv) => {
            const inPool = intervalPool.some((p) => p.semis === iv.semis);
            const wasCorrect = feedback === 'correct' && target?.interval.semis === iv.semis;
            const wasRevealed = feedback === 'wrong' && target?.interval.semis === iv.semis;
            return (
              <button
                key={iv.semis}
                onClick={() => guess(iv.semis)}
                disabled={!!feedback || !inPool}
                className={`px-2 py-2 rounded-md text-xs font-display transition-all ${
                  wasCorrect
                    ? 'bg-green-500 text-white shadow-lg'
                    : wasRevealed
                      ? 'bg-green-500/40 text-white animate-pulse'
                      : inPool
                        ? 'bg-secondary/50 hover:bg-primary/30 text-foreground border border-border/50 hover:border-primary/40'
                        : 'bg-secondary/20 text-muted-foreground/40 border border-border/30'
                } disabled:opacity-60`}
              >
                <div className="font-bold">{iv.short}</div>
                <div className="text-[9px] opacity-75">{iv.name}</div>
              </button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
