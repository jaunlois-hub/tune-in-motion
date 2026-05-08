import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Music2, BarChart3, Repeat, ChevronDown, ChevronUp, Clock, Target, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useChordDetection, type ChordData } from '@/hooks/useChordDetection';
import { ChordDiagram } from './ChordDiagram';
import { ChordProgressionBuilder } from './ChordProgressionBuilder';

// Simple curated chord progressions for popular songs
interface SongChords {
  title: string;
  artist: string;
  bpm: number;
  chords: { chord: string; beats: number }[];
}

const SONG_LIBRARY: SongChords[] = [
  { title: 'Wonderwall', artist: 'Oasis', bpm: 87, chords: [
    { chord: 'Em', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'A7', beats: 4 },
  ]},
  { title: 'Let It Be', artist: 'The Beatles', bpm: 71, chords: [
    { chord: 'C', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'Am', beats: 4 }, { chord: 'F', beats: 4 },
  ]},
  { title: 'Horse With No Name', artist: 'America', bpm: 120, chords: [
    { chord: 'Em', beats: 8 }, { chord: 'D', beats: 8 },
  ]},
  { title: 'Knockin\' On Heaven\'s Door', artist: 'Bob Dylan', bpm: 69, chords: [
    { chord: 'G', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'Am', beats: 4 }, { chord: 'Am', beats: 4 },
    { chord: 'G', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'C', beats: 4 }, { chord: 'C', beats: 4 },
  ]},
  { title: 'Wish You Were Here', artist: 'Pink Floyd', bpm: 120, chords: [
    { chord: 'Em', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'Em', beats: 4 }, { chord: 'G', beats: 4 },
    { chord: 'Em', beats: 4 }, { chord: 'A7', beats: 4 }, { chord: 'Em', beats: 4 }, { chord: 'A7', beats: 4 },
    { chord: 'G', beats: 8 },
  ]},
  { title: 'House of The Rising Sun', artist: 'The Animals', bpm: 78, chords: [
    { chord: 'Am', beats: 3 }, { chord: 'C', beats: 3 }, { chord: 'D', beats: 3 }, { chord: 'F', beats: 3 },
    { chord: 'Am', beats: 3 }, { chord: 'C', beats: 3 }, { chord: 'E', beats: 6 },
  ]},
  { title: 'Nothing Else Matters', artist: 'Metallica', bpm: 69, chords: [
    { chord: 'Em', beats: 8 }, { chord: 'D', beats: 4 }, { chord: 'C', beats: 4 },
    { chord: 'Em', beats: 4 }, { chord: 'Am', beats: 4 }, { chord: 'C', beats: 4 }, { chord: 'D', beats: 4 },
  ]},
  { title: 'Zombie', artist: 'The Cranberries', bpm: 85, chords: [
    { chord: 'Em', beats: 4 }, { chord: 'C', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'D', beats: 4 },
  ]},
  { title: 'Stand By Me', artist: 'Ben E. King', bpm: 120, chords: [
    { chord: 'A', beats: 4 }, { chord: 'F#m', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'E', beats: 4 },
  ]},
  { title: 'Hallelujah', artist: 'Leonard Cohen', bpm: 56, chords: [
    { chord: 'C', beats: 6 }, { chord: 'Am', beats: 6 }, { chord: 'C', beats: 6 }, { chord: 'Am', beats: 6 },
    { chord: 'F', beats: 6 }, { chord: 'G', beats: 6 }, { chord: 'C', beats: 3 }, { chord: 'G', beats: 3 },
  ]},
  // NEW SONGS
  { title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', bpm: 128, chords: [
    { chord: 'D', beats: 8 }, { chord: 'C', beats: 8 }, { chord: 'G', beats: 8 }, { chord: 'D', beats: 8 },
  ]},
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin', bpm: 72, chords: [
    { chord: 'Am', beats: 4 }, { chord: 'E', beats: 2 }, { chord: 'C', beats: 2 },
    { chord: 'D', beats: 4 }, { chord: 'F', beats: 2 }, { chord: 'G', beats: 2 },
    { chord: 'Am', beats: 4 },
  ]},
  { title: 'Hotel California', artist: 'Eagles', bpm: 75, chords: [
    { chord: 'Bm', beats: 4 }, { chord: 'F#', beats: 4 }, { chord: 'A', beats: 4 }, { chord: 'E', beats: 4 },
    { chord: 'G', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'Em', beats: 4 }, { chord: 'F#', beats: 4 },
  ]},
  { title: 'Creep', artist: 'Radiohead', bpm: 92, chords: [
    { chord: 'G', beats: 4 }, { chord: 'B', beats: 4 }, { chord: 'C', beats: 4 }, { chord: 'Cm', beats: 4 },
  ]},
  { title: 'No Woman No Cry', artist: 'Bob Marley', bpm: 80, chords: [
    { chord: 'C', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'Am', beats: 4 }, { chord: 'F', beats: 4 },
  ]},
  { title: 'Hey Joe', artist: 'Jimi Hendrix', bpm: 80, chords: [
    { chord: 'C', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'A', beats: 4 }, { chord: 'E', beats: 8 },
  ]},
  { title: 'Redemption Song', artist: 'Bob Marley', bpm: 96, chords: [
    { chord: 'G', beats: 4 }, { chord: 'Em', beats: 4 }, { chord: 'C', beats: 2 }, { chord: 'G', beats: 2 },
    { chord: 'Am', beats: 4 }, { chord: 'D', beats: 4 },
  ]},
  { title: 'Blackbird', artist: 'The Beatles', bpm: 96, chords: [
    { chord: 'G', beats: 4 }, { chord: 'Am', beats: 4 }, { chord: 'G', beats: 4 },
    { chord: 'C', beats: 2 }, { chord: 'Cm', beats: 2 }, { chord: 'G', beats: 4 },
  ]},
  { title: 'Every Breath You Take', artist: 'The Police', bpm: 117, chords: [
    { chord: 'A', beats: 4 }, { chord: 'F#m', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'E', beats: 4 },
  ]},
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', bpm: 117, chords: [
    { chord: 'F', beats: 4 }, { chord: 'A#', beats: 4 }, { chord: 'G#', beats: 4 }, { chord: 'C#', beats: 4 },
  ]},
  { title: 'Brown Eyed Girl', artist: 'Van Morrison', bpm: 147, chords: [
    { chord: 'G', beats: 4 }, { chord: 'C', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'D', beats: 4 },
  ]},
  { title: 'Free Fallin\'', artist: 'Tom Petty', bpm: 84, chords: [
    { chord: 'F', beats: 4 }, { chord: 'A#', beats: 2 }, { chord: 'F', beats: 2 },
    { chord: 'C', beats: 4 }, { chord: 'A#', beats: 2 }, { chord: 'F', beats: 2 },
  ]},
  { title: 'Hurt', artist: 'Johnny Cash', bpm: 68, chords: [
    { chord: 'Am', beats: 4 }, { chord: 'C', beats: 4 }, { chord: 'D', beats: 4 }, { chord: 'Am', beats: 4 },
  ]},
  { title: 'Riptide', artist: 'Vance Joy', bpm: 102, chords: [
    { chord: 'Am', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'C', beats: 8 },
  ]},
  { title: 'Come As You Are', artist: 'Nirvana', bpm: 120, chords: [
    { chord: 'Em', beats: 8 }, { chord: 'D', beats: 8 },
  ]},
];

export function ChordRecognitionView() {
  const { isListening, chordData, error, startListening, stopListening } = useChordDetection();
  const [selectedSong, setSelectedSong] = useState<SongChords | null>(null);
  const [currentChordIdx, setCurrentChordIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [chordHistory, setChordHistory] = useState<{ chord: string; time: number }[]>([]);
  const [score, setScore] = useState(0);
  const [showSongList, setShowSongList] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track chord history
  useEffect(() => {
    if (chordData && isListening) {
      setChordHistory(prev => {
        const last = prev[prev.length - 1];
        if (last?.chord === chordData.chord) return prev;
        return [...prev.slice(-19), { chord: chordData.chord, time: Date.now() }];
      });
    }
  }, [chordData, isListening]);

  // Song playback timer
  const advanceChord = useCallback(() => {
    if (!selectedSong) return;
    setCurrentChordIdx(prev => {
      const next = prev + 1;
      if (next >= selectedSong.chords.length) {
        if (loopEnabled) return 0;
        setIsPlaying(false);
        return prev;
      }
      return next;
    });
  }, [selectedSong, loopEnabled]);

  useEffect(() => {
    if (!isPlaying || !selectedSong) return;
    const currentChord = selectedSong.chords[currentChordIdx];
    const beatDuration = (60 / selectedSong.bpm) * 1000;
    const chordDuration = (currentChord.beats * beatDuration) / playbackSpeed;

    timerRef.current = setTimeout(advanceChord, chordDuration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, currentChordIdx, selectedSong, playbackSpeed, advanceChord]);

  // Score matching
  useEffect(() => {
    if (!isPlaying || !selectedSong || !chordData) return;
    const target = selectedSong.chords[currentChordIdx].chord;
    if (chordData.chord === target) {
      setScore(prev => prev + 10);
    } else if (chordData.chord.replace(/m|7|maj7|sus4/g, '') === target.replace(/m|7|maj7|sus4/g, '')) {
      setScore(prev => prev + 3);
    }
  }, [chordData, currentChordIdx, isPlaying, selectedSong]);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentChordIdx(0);
      setScore(0);
      setIsPlaying(true);
    }
  };

  const selectSong = (song: SongChords) => {
    setSelectedSong(song);
    setCurrentChordIdx(0);
    setIsPlaying(false);
    setScore(0);
    setShowSongList(false);
  };

  const handleCustomProgression = useCallback((prog: { title: string; artist: string; bpm: number; chords: { chord: string; beats: number }[] }) => {
    selectSong(prog);
    setShowBuilder(false);
  }, []);

  const targetChord = selectedSong ? selectedSong.chords[currentChordIdx]?.chord : null;
  const isMatch = chordData && targetChord && chordData.chord === targetChord;

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">{error}</p>
      )}

      {/* Mic toggle */}
      <div className="flex items-center justify-between">
        <Button
          onClick={isListening ? stopListening : startListening}
          variant={isListening ? 'destructive' : 'default'}
          className="gap-2"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isListening ? 'Stop Listening' : 'Start Chord Detection'}
        </Button>

        {chordData && (
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <div className="text-sm font-mono text-primary">{Math.round(chordData.confidence * 100)}%</div>
          </div>
        )}
      </div>

      {/* Main display: side-by-side when song selected */}
      <div className={cn("grid gap-4", selectedSong ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
        {/* Your chord */}
        <div className="bg-secondary/30 rounded-xl border border-border p-4 flex flex-col items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Mic className="w-3 h-3" /> Your Chord
          </h3>
          <AnimatePresence mode="wait">
            {chordData ? (
              <motion.div
                key={chordData.chord}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                <div className={cn(
                  "text-5xl font-display font-black transition-colors",
                  isMatch ? "text-tuner-perfect" : targetChord ? "text-destructive" : "text-primary"
                )}>
                  {chordData.chord}
                </div>
                <ChordDiagram chord={chordData.chord} size="md" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Music2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isListening ? 'Play a chord...' : 'Start listening to detect chords'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chroma visualization */}
          {chordData && (
            <div className="flex items-end gap-1 h-8 w-full max-w-[200px]">
              {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map((note, i) => (
                <div key={note} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div
                    className="w-full rounded-t bg-primary/60"
                    style={{ height: `${(chordData.chroma[i] || 0) * 100}%` }}
                    animate={{ height: `${(chordData.chroma[i] || 0) * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                  <span className="text-[7px] text-muted-foreground">{note}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Song chord (right side) */}
        {selectedSong && (
          <div className="bg-secondary/30 rounded-xl border border-border p-4 flex flex-col items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3 h-3" /> Target Chord
            </h3>
            <AnimatePresence mode="wait">
              {targetChord && (
                <motion.div
                  key={`${currentChordIdx}-${targetChord}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={cn(
                    "text-5xl font-display font-black transition-colors",
                    isMatch ? "text-tuner-perfect" : "text-foreground"
                  )}>
                    {targetChord}
                  </div>
                  <ChordDiagram chord={targetChord} size="md" />
                  {isMatch && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-bold text-tuner-perfect bg-tuner-perfect/10 px-3 py-1 rounded-full"
                    >
                      ✓ Match!
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Chord Timeline */}
      {selectedSong && (
        <div className="bg-secondary/20 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Chord Timeline
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Score:</span>
              <span className="text-sm font-bold text-primary">{score}</span>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {selectedSong.chords.map((ch, i) => (
              <motion.div
                key={i}
                className={cn(
                  "flex-shrink-0 px-3 py-2 rounded-lg text-sm font-bold transition-all border",
                  i === currentChordIdx
                    ? isMatch
                      ? "bg-tuner-perfect/20 border-tuner-perfect text-tuner-perfect scale-110"
                      : "bg-primary/20 border-primary text-primary scale-110"
                    : i < currentChordIdx
                      ? "bg-secondary/50 border-border text-muted-foreground"
                      : "bg-secondary/30 border-transparent text-muted-foreground/60"
                )}
                style={{ minWidth: `${Math.max(ch.beats * 12, 40)}px` }}
              >
                {ch.chord}
                <span className="text-[8px] block text-center opacity-60">{ch.beats}b</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Controls */}
      {selectedSong && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={togglePlayback} variant={isPlaying ? 'destructive' : 'default'} size="sm">
            {isPlaying ? 'Stop' : 'Play Along'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPlaybackSpeed(Math.max(0.25, playbackSpeed - 0.25))}>
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-xs font-mono w-12 text-center">{playbackSpeed}x</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPlaybackSpeed(Math.min(2, playbackSpeed + 0.25))}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <Button
            variant={loopEnabled ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setLoopEnabled(!loopEnabled)}
            className="gap-1"
          >
            <Repeat className="w-3 h-3" />
            Loop
          </Button>
          <span className="text-xs text-muted-foreground">
            {selectedSong.title} — {selectedSong.artist} ({selectedSong.bpm} BPM)
          </span>
        </div>
      )}

      {/* Chord Progression Builder */}
      <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Progression Builder</span>
            <span className="text-[10px] text-muted-foreground">Create custom chord sequences</span>
          </div>
          {showBuilder ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence>
          {showBuilder && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0">
                <ChordProgressionBuilder onSelectProgression={handleCustomProgression} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Song Library */}
      <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowSongList(!showSongList)}
          className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Practice Songs</span>
            <span className="text-[10px] text-muted-foreground">{SONG_LIBRARY.length} songs</span>
          </div>
          {showSongList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showSongList && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-3 pt-0">
                {SONG_LIBRARY.map((song) => (
                  <button
                    key={song.title}
                    onClick={() => selectSong(song)}
                    className={cn(
                      "text-left p-3 rounded-lg transition-all",
                      selectedSong?.title === song.title
                        ? "bg-primary/15 border border-primary/30"
                        : "bg-secondary/40 hover:bg-secondary border border-transparent"
                    )}
                  >
                    <p className="text-sm font-medium">{song.title}</p>
                    <p className="text-[10px] text-muted-foreground">{song.artist} • {song.bpm} BPM</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {song.chords.map((ch, i) => (
                        <span key={i} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          {ch.chord}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chord History */}
      {chordHistory.length > 0 && (
        <div className="bg-secondary/20 rounded-xl border border-border p-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Recent Chords
          </h3>
          <div className="flex gap-1 flex-wrap">
            {chordHistory.map((entry, i) => (
              <motion.span
                key={`${entry.time}-${i}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded"
              >
                {entry.chord}
              </motion.span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
