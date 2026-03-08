import { Volume2, VolumeX } from 'lucide-react';
import { type Tuning, type TuningNote } from '@/lib/tunings';

interface StringIndicatorProps {
  tuning: Tuning;
  currentNote: string | null;
  currentOctave: number | null;
  isActive: boolean;
  playingFrequency: number | null;
  onPlayTone: (frequency: number) => void;
}

export function StringIndicator({ tuning, currentNote, currentOctave, isActive, playingFrequency, onPlayTone }: StringIndicatorProps) {
  return (
    <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
      {tuning.notes.map((note) => {
        const isCurrentString =
          isActive &&
          currentNote === note.note &&
          currentOctave === note.octave;
        const isPlaying = playingFrequency === note.frequency;

        return (
          <button
            key={note.string}
            onClick={() => onPlayTone(note.frequency)}
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
              {/* Speaker icon */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                isPlaying ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground opacity-0 group-hover:opacity-100'
              } transition-opacity`}>
                {isPlaying ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
              </div>
            </div>
            <span
              className={`text-[10px] mt-1 font-mono transition-colors ${
                isPlaying
                  ? 'text-accent'
                  : isCurrentString ? 'text-primary' : 'text-muted-foreground/60'
              }`}
            >
              {note.frequency.toFixed(0)}Hz
            </span>
          </button>
        );
      })}
    </div>
  );
}
