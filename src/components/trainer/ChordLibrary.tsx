import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { getSharedAudioContextSync } from '@/lib/sharedAudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, RotateCcw, Flame, Trophy, BookOpen, GraduationCap, Eye, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChordDiagram } from '@/components/studio/ChordDiagram';
import { CHORD_DIAGRAMS } from '@/hooks/useChordDetection';
import { ensurePluckBuffer, playPluckedNote, type PluckedNoteHandle } from '@/lib/pluckedSynth';
import { createMasterGain } from '@/hooks/useMasterVolume';

// ============================================================
// Chord families
// ============================================================
type Family = 'all' | 'major' | 'minor' | '7' | 'm7' | 'maj7';

const FAMILIES: { id: Family; label: string }[] = [
  { id: 'all',   label: 'All' },
  { id: 'major', label: 'Major' },
  { id: 'minor', label: 'Minor' },
  { id: '7',     label: '7th' },
  { id: 'm7',    label: 'Min 7' },
  { id: 'maj7',  label: 'Maj 7' },
];

function familyOf(name: string): Family {
  if (name.endsWith('maj7')) return 'maj7';
  if (name.endsWith('m7')) return 'm7';
  if (name.endsWith('7')) return '7';
  if (name.endsWith('m')) return 'minor';
  return 'major';
}

// String open frequencies — low E first (matches diagram order [E A D G B e])
const STRING_OPEN_FREQS = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

function frequenciesForChord(name: string): number[] {
  const diagram = CHORD_DIAGRAMS[name];
  if (!diagram) return [];
  const freqs: number[] = [];
  diagram.frets.forEach((fret, idx) => {
    if (fret === -1) return; // muted
    freqs.push(STRING_OPEN_FREQS[idx] * Math.pow(2, fret / 12));
  });
  return freqs;
}

// ============================================================
// Browse mode
// ============================================================
function BrowseMode({
  onPlay,
  onSelect,
  selected,
}: {
  onPlay: (name: string) => void;
  onSelect: (name: string) => void;
  selected: string | null;
}) {
  const [family, setFamily] = useState<Family>('all');
  const [query, setQuery] = useState('');

  const allChords = useMemo(() => Object.keys(CHORD_DIAGRAMS).sort(), []);

  const filtered = useMemo(() => {
    return allChords.filter((c) => {
      if (family !== 'all' && familyOf(c) !== family) return false;
      if (query && !c.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [allChords, family, query]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chord (e.g. Am, F#)"
          className="px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-xs font-mono w-40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex flex-wrap gap-1.5">
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFamily(f.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
                family === f.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground/70 ml-auto font-mono">
          {filtered.length} chord{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">No chords match.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filtered.map((name) => (
            <motion.button
              key={name}
              onClick={() => onSelect(name)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`relative p-2 rounded-lg border bg-card/40 hover:bg-card/70 transition-all flex flex-col items-center gap-1 ${
                selected === name ? 'border-primary/60 bg-card/70' : 'border-border/60'
              }`}
            >
              <ChordDiagram chord={name} size="sm" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(name);
                }}
                className="absolute top-1 right-1 p-1 rounded-md bg-primary/15 hover:bg-primary/30 text-primary transition-colors"
                aria-label={`Play ${name}`}
              >
                <Volume2 className="w-3 h-3" />
              </button>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Quiz mode
// ============================================================
type QuizSubMode = 'diagram' | 'sound';
const QUIZ_STORAGE_KEY = 'bleedout.chordLibrary.bestStreak';

function QuizPanel({
  onPlay,
}: {
  onPlay: (name: string) => Promise<void>;
}) {
  const [quizMode, setQuizMode] = useState<QuizSubMode>('diagram');
  const [family, setFamily] = useState<Family>('all');
  const [target, setTarget] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ chord: string; correct: boolean } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (stored) setBestStreak(Number(stored) || 0);
  }, []);

  const pool = useMemo(() => {
    const all = Object.keys(CHORD_DIAGRAMS);
    return family === 'all' ? all : all.filter((c) => familyOf(c) === family);
  }, [family]);

  const newQuestion = useCallback(() => {
    if (pool.length < 4) return;
    const chord = pool[Math.floor(Math.random() * pool.length)];
    // Pick 3 distractors with similar family for harder quiz
    const distractors: string[] = [];
    const sameFamilyPool = pool.filter((c) => c !== chord);
    while (distractors.length < 3 && sameFamilyPool.length > 0) {
      const pick = sameFamilyPool[Math.floor(Math.random() * sameFamilyPool.length)];
      if (!distractors.includes(pick) && pick !== chord) distractors.push(pick);
      else if (sameFamilyPool.length <= 3) break;
    }
    const opts = [chord, ...distractors].sort(() => Math.random() - 0.5);
    setTarget(chord);
    setOptions(opts);
    setFeedback(null);
  }, [pool]);

  useEffect(() => {
    if (!target) newQuestion();
  }, [target, newQuestion]);

  // Re-roll when filters change
  useEffect(() => {
    setTarget(null);
    setFeedback(null);
  }, [quizMode, family]);

  const guess = useCallback(
    (chord: string) => {
      if (!target || feedback) return;
      const correct = chord === target;
      setFeedback({ chord, correct });
      if (correct) {
        setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
        setStreak((s) => {
          const next = s + 1;
          if (next > bestStreak) {
            setBestStreak(next);
            localStorage.setItem(QUIZ_STORAGE_KEY, String(next));
          }
          return next;
        });
        setTimeout(newQuestion, 700);
      } else {
        setScore((s) => ({ correct: s.correct, total: s.total + 1 }));
        setStreak(0);
        setTimeout(newQuestion, 1500);
      }
    },
    [target, feedback, newQuestion, bestStreak],
  );

  const accuracy = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);

  return (
    <div className="space-y-3">
      {/* Stats */}
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

      {/* Mode + family */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border">
          {([
            { id: 'diagram' as QuizSubMode, label: 'Diagram', icon: Eye },
            { id: 'sound' as QuizSubMode, label: 'Sound', icon: Headphones },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setQuizMode(id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
                quizMode === id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFamily(f.id)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-all ${
                family === f.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

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

      {pool.length < 4 ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          Pick a family with at least 4 chords to quiz.
        </p>
      ) : (
        <>
          {/* Question */}
          <div className="flex flex-col items-center justify-center py-3">
            {quizMode === 'diagram' && target && (
              <ChordDiagram chord={target} size="lg" />
            )}
            {quizMode === 'sound' && target && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 flex items-center justify-center">
                  <Headphones className="w-12 h-12 text-primary/80" />
                </div>
                <Button onClick={() => onPlay(target)} size="sm" className="gap-2">
                  <Volume2 className="w-4 h-4" /> Replay
                </Button>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {options.map((opt) => {
              const isPick = feedback?.chord === opt;
              const isAnswer = target === opt;
              const reveal = !!feedback;
              return (
                <button
                  key={opt}
                  onClick={() => guess(opt)}
                  disabled={!!feedback}
                  className={`px-3 py-3 rounded-lg text-sm font-display font-bold transition-all ${
                    reveal
                      ? isAnswer
                        ? 'bg-green-500 text-white shadow-lg'
                        : isPick
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-secondary/30 text-muted-foreground'
                      : 'bg-secondary/50 hover:bg-primary/30 text-foreground border border-border/50 hover:border-primary/40'
                  } disabled:opacity-80`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Wrapper
// ============================================================
type Tab = 'browse' | 'quiz';

export function ChordLibrary() {
  const [tab, setTab] = useState<Tab>('browse');
  const [selected, setSelected] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);
  const activeNotesRef = useRef<PluckedNoteHandle[]>([]);

  const stopActiveNotes = useCallback(() => {
    activeNotesRef.current.forEach((note) => note.stop());
    activeNotesRef.current = [];
  }, []);

  const playChord = useCallback(async (name: string) => {
    const freqs = frequenciesForChord(name);
    if (freqs.length === 0) return;
    stopActiveNotes();
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = getSharedAudioContextSync();
      const { master, release } = createMasterGain(ctxRef.current);
      masterRef.current = master;
      releaseMasterRef.current = release;
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    if (!bufRef.current) bufRef.current = await ensurePluckBuffer(ctx);
    const buf = bufRef.current;
    const dest = masterRef.current ?? ctx.destination;
    // Strum: ~25ms between strings, low to high
    activeNotesRef.current = withAudioFeature('chord-library', () => freqs.map((f, i) => (
      playPluckedNote(ctx, buf, f, ctx.currentTime + 0.05 + i * 0.025, 0.9, 0.42, dest, 0.5)
    )));
  }, [stopActiveNotes]);

  useEffect(() => () => {
    stopActiveNotes();
    releaseMasterRef.current?.();
    releaseMasterRef.current = null;
    masterRef.current = null;
    ctxRef.current = null;
  }, [stopActiveNotes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border w-fit mx-auto">
        {([
          { id: 'browse' as const, label: 'Browse Library', icon: BookOpen },
          { id: 'quiz' as const, label: 'Accuracy Quiz', icon: GraduationCap },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display transition-all ${
              tab === id ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
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
          {tab === 'browse' ? (
            <BrowseMode onPlay={playChord} onSelect={setSelected} selected={selected} />
          ) : (
            <QuizPanel onPlay={playChord} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
