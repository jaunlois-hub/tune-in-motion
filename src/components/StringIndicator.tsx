import { type Tuning } from '@/lib/tunings';

interface StringIndicatorProps {
  tuning: Tuning;
  currentNote: string | null;
  currentOctave: number | null;
  isActive: boolean;
}

export function StringIndicator({ tuning, currentNote, currentOctave, isActive }: StringIndicatorProps) {
  return (
    <div className="flex justify-center gap-3 md:gap-4">
      {tuning.notes.map((note) => {
        const isCurrentString = 
          isActive && 
          currentNote === note.note && 
          currentOctave === note.octave;

        return (
          <div
            key={note.string}
            className={`flex flex-col items-center transition-all duration-200 ${
              isCurrentString ? 'scale-110' : ''
            }`}
          >
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-display font-bold text-lg border-2 transition-all duration-200 ${
                isCurrentString
                  ? 'bg-primary/20 border-primary text-primary shadow-lg box-glow'
                  : 'bg-secondary/30 border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {note.note}
              <span className="text-xs opacity-70">{note.octave}</span>
            </div>
            <span
              className={`text-xs mt-1 transition-colors ${
                isCurrentString ? 'text-primary' : 'text-muted-foreground/60'
              }`}
            >
              {note.string}
            </span>
          </div>
        );
      })}
    </div>
  );
}
