import { useState, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Ear, ListMusic } from 'lucide-react';
import { type Tuning, type TuningNote } from '@/lib/tunings';

interface StringIndicatorProps {
  tuning: Tuning;
  currentNote: string | null;
  currentOctave: number | null;
  isActive: boolean;
  playingFrequency: number | null;
  onPlayTone: (frequency: number) => void;
  onPlayForDuration?: (frequency: number, ms: number) => void;
}

export function StringIndicator({ tuning, currentNote, currentOctave, isActive, playingFrequency, onPlayTone, onPlayForDuration }: StringIndicatorProps) {
  const [byEarMode, setByEarMode] = useState(false);
  const [playingAll, setPlayingAll] = useState(false);
  const playAllRef = useRef<number[]>([]);

  const handleTone = useCallback((frequency: number) => {
    if (byEarMode && onPlayForDuration) {
      onPlayForDuration(frequency, 2000);
    } else {
      onPlayTone(frequency);
    }
  }, [byEarMode, onPlayTone, onPlayForDuration]);

  const playAll = useCallback(() => {
    if (playingAll || !onPlayForDuration) return;
    setPlayingAll(true);
    playAllRef.current.forEach(clearTimeout);
    playAllRef.current = [];

    // Play strings from low to high (reversed array since notes are high-to-low)
    const notes = [...tuning.notes].reverse();
    notes.forEach((note, i) => {
      const t = window.setTimeout(() => {
        onPlayForDuration(note.frequency, 2500);
      }, i * 3000);
      playAllRef.current.push(t);
    });

    const endT = window.setTimeout(() => setPlayingAll(false), notes.length * 3000);
    playAllRef.current.push(endT);
  }, [tuning.notes, onPlayForDuration, playingAll]);

  return (
    <div className="space-y-3">
      {/* Mode toggles */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setByEarMode(!byEarMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display transition-all border ${
            byEarMode
              ? 'bg-accent/20 border-accent text-accent'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ear className="w-3 h-3" />
          By Ear
        </button>
        {byEarMode && (
          <button
            onClick={playAll}
            disabled={playingAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display transition-all border ${
              playingAll
                ? 'bg-primary/20 border-primary text-primary animate-pulse'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListMusic className="w-3 h-3" />
            {playingAll ? 'Playing...' : 'Play All'}
          </button>
        )}
      </div>

      {byEarMode && (
        <p className="text-center text-[10px] text-muted-foreground">
          Tap a string — hear it for 2 seconds, then tune by memory
        </p>
      )}

      {/* Strings */}
      <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
        {tuning.notes.map((note) => {
          const isCurrentString = isActive && currentNote === note.note && currentOctave === note.octave;
          const isPlaying = playingFrequency === note.frequency;

          return (
            <button
              key={note.string}
              onClick={() => handleTone(note.frequency)}
              className={`flex flex-col items-center transition-all duration-200 group cursor-pointer ${
                isCurrentString ? 'scale-110' : 'hover:scale-105'
              }`}
            >
              <div
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-display font-bold text-sm md:text-base border-2 transition-all duration-200 ${
                  isPlaying
                    ? 'bg-accent/30 border-accent text-accent shadow-lg animate-pulse-glow'
                    : isCurrentString
                    ? 'bg-primary/20 border-primary text-primary shadow-lg box-glow'
                    : 'bg-secondary/30 border-border text-muted-foreground group-hover:border-primary/50'
                }`}
              >
                {note.note}
                <span className="text-[10px] opacity-70">{note.octave}</span>
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                  isPlaying ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground opacity-0 group-hover:opacity-100'
                } transition-opacity`}>
                  {isPlaying ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                </div>
              </div>
              <span
                className={`text-[10px] mt-1 font-mono transition-colors ${
                  isPlaying ? 'text-accent' : isCurrentString ? 'text-primary' : 'text-muted-foreground/60'
                }`}
              >
                {note.frequency.toFixed(0)}Hz
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
