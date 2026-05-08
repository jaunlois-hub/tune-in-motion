import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Play, Pause, Repeat, Save, Trash2, GripVertical, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ChordDiagram } from './ChordDiagram';
import { CHORD_DIAGRAMS } from '@/hooks/useChordDetection';

const AVAILABLE_CHORDS = Object.keys(CHORD_DIAGRAMS);

const CHORD_CATEGORIES: Record<string, string[]> = {
  'Major': ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'D#', 'F#', 'G#', 'A#'],
  'Minor': ['Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'F#m', 'G#m', 'A#m', 'C#m', 'D#m', 'Gm'],
  '7th': ['C7', 'D7', 'E7', 'G7', 'A7', 'B7'],
  'Minor 7th': ['Am7', 'Em7', 'Dm7', 'Bm7'],
  'Maj7': ['Cmaj7', 'Fmaj7', 'Gmaj7'],
  'Sus': ['Csus4', 'Dsus4', 'Asus4', 'Esus4'],
};

export interface CustomProgression {
  id: string;
  name: string;
  bpm: number;
  chords: { chord: string; beats: number }[];
}

const STORAGE_KEY = 'custom-progressions';

function loadProgressions(): CustomProgression[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveProgressions(progs: CustomProgression[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progs));
}

interface Props {
  onSelectProgression: (prog: { title: string; artist: string; bpm: number; chords: { chord: string; beats: number }[] }) => void;
}

export function ChordProgressionBuilder({ onSelectProgression }: Props) {
  const [progressions, setProgressions] = useState<CustomProgression[]>(loadProgressions);
  const [editingProg, setEditingProg] = useState<CustomProgression | null>(null);
  const [showChordPicker, setShowChordPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Major');
  const [progName, setProgName] = useState('');
  const [progBpm, setProgBpm] = useState(120);

  const startNew = useCallback(() => {
    setEditingProg({ id: crypto.randomUUID(), name: '', bpm: 120, chords: [] });
    setProgName('');
    setProgBpm(120);
  }, []);

  const addChord = useCallback((chord: string) => {
    if (!editingProg) return;
    setEditingProg(prev => prev ? { ...prev, chords: [...prev.chords, { chord, beats: 4 }] } : null);
  }, [editingProg]);

  const removeChord = useCallback((idx: number) => {
    if (!editingProg) return;
    setEditingProg(prev => prev ? { ...prev, chords: prev.chords.filter((_, i) => i !== idx) } : null);
  }, [editingProg]);

  const updateBeats = useCallback((idx: number, beats: number) => {
    if (!editingProg) return;
    setEditingProg(prev => prev ? {
      ...prev,
      chords: prev.chords.map((c, i) => i === idx ? { ...c, beats } : c)
    } : null);
  }, [editingProg]);

  const saveProg = useCallback(() => {
    if (!editingProg || editingProg.chords.length === 0) return;
    const prog = { ...editingProg, name: progName || 'Untitled', bpm: progBpm };
    const updated = progressions.some(p => p.id === prog.id)
      ? progressions.map(p => p.id === prog.id ? prog : p)
      : [...progressions, prog];
    setProgressions(updated);
    saveProgressions(updated);
    setEditingProg(null);
  }, [editingProg, progName, progBpm, progressions]);

  const deleteProg = useCallback((id: string) => {
    const updated = progressions.filter(p => p.id !== id);
    setProgressions(updated);
    saveProgressions(updated);
  }, [progressions]);

  const practiceProgression = useCallback((prog: CustomProgression) => {
    onSelectProgression({
      title: prog.name,
      artist: 'Custom',
      bpm: prog.bpm,
      chords: prog.chords,
    });
  }, [onSelectProgression]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Chord Progression Builder
        </h3>
        {!editingProg && (
          <Button variant="outline" size="sm" onClick={startNew} className="gap-1">
            <Plus className="w-3 h-3" /> New Progression
          </Button>
        )}
      </div>

      {/* Editor */}
      <AnimatePresence>
        {editingProg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-secondary/30 rounded-xl border border-border p-4 space-y-3 overflow-hidden"
          >
            {/* Name & BPM */}
            <div className="flex items-center gap-3">
              <input
                value={progName}
                onChange={e => setProgName(e.target.value)}
                placeholder="Progression name..."
                className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setProgBpm(Math.max(30, progBpm - 5))}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-sm font-mono w-12 text-center text-primary">{progBpm}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setProgBpm(Math.min(300, progBpm + 5))}>
                  <Plus className="w-3 h-3" />
                </Button>
                <span className="text-[10px] text-muted-foreground">BPM</span>
              </div>
            </div>

            {/* Current chords */}
            <div className="flex gap-1.5 flex-wrap min-h-[48px] p-2 bg-background/50 rounded-lg border border-dashed border-border">
              {editingProg.chords.length === 0 && (
                <p className="text-xs text-muted-foreground/50 m-auto">Click chords below to add them</p>
              )}
              {editingProg.chords.map((ch, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1.5 group"
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground/30" />
                  <span className="text-sm font-bold text-foreground">{ch.chord}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => updateBeats(i, Math.max(1, ch.beats - 1))}
                      className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-[10px] text-muted-foreground w-4 text-center">{ch.beats}b</span>
                    <button
                      onClick={() => updateBeats(i, Math.min(16, ch.beats + 1))}
                      className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeChord(i)}
                    className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Chord Picker Toggle */}
            <button
              onClick={() => setShowChordPicker(!showChordPicker)}
              className="text-xs text-primary hover:underline"
            >
              {showChordPicker ? 'Hide chord picker' : 'Show chord picker'}
            </button>

            {/* Chord picker */}
            <AnimatePresence>
              {showChordPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {/* Category tabs */}
                  <div className="flex gap-1 flex-wrap mb-2">
                    {Object.keys(CHORD_CATEGORIES).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded-full transition-all",
                          activeCategory === cat
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Chord buttons */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {(CHORD_CATEGORIES[activeCategory] || [])
                      .filter(c => AVAILABLE_CHORDS.includes(c))
                      .map(chord => (
                        <button
                          key={chord}
                          onClick={() => addChord(chord)}
                          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/40 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                        >
                          <span className="text-sm font-bold">{chord}</span>
                          <ChordDiagram chord={chord} size="xs" />
                        </button>
                      ))
                    }
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveProg} disabled={editingProg.chords.length === 0} className="gap-1">
                <Save className="w-3 h-3" /> Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingProg(null)}>Cancel</Button>
              {editingProg.chords.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => practiceProgression({ ...editingProg, name: progName || 'Untitled', bpm: progBpm })}
                  className="gap-1 ml-auto"
                >
                  <Play className="w-3 h-3" /> Practice Now
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved progressions */}
      {progressions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {progressions.map(prog => (
            <div
              key={prog.id}
              className="p-3 rounded-lg bg-secondary/40 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all group relative"
            >
              <button onClick={() => practiceProgression(prog)} className="w-full text-left">
                <p className="text-sm font-medium">{prog.name}</p>
                <p className="text-[10px] text-muted-foreground">Custom • {prog.bpm} BPM</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {prog.chords.map((ch, i) => (
                    <span key={i} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                      {ch.chord}
                    </span>
                  ))}
                </div>
              </button>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingProg(prog);
                    setProgName(prog.name);
                    setProgBpm(prog.bpm);
                  }}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <GripVertical className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteProg(prog.id)}
                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
