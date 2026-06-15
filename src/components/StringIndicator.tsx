import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Tuning, type TuningNote } from '@/lib/tunings';

interface StringIndicatorProps {
  tuning: Tuning;
  currentNote: string | null;
  currentOctave: number | null;
  isActive: boolean;
  lockedString?: TuningNote | null;
  onToggleLock?: (note: TuningNote) => void;
}

export function StringIndicator({
  tuning, currentNote, currentOctave, isActive, lockedString, onToggleLock,
}: StringIndicatorProps) {
  const clickable = !!onToggleLock;
  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
        {tuning.notes.map((note) => {
          const isCurrentString = isActive && currentNote === note.note && currentOctave === note.octave;
          const isLocked = !!(lockedString && lockedString.string === note.string && lockedString.note === note.note && lockedString.octave === note.octave);

          return (
            <motion.button
              key={note.string}
              onClick={clickable ? () => onToggleLock!(note) : undefined}
              whileHover={clickable ? { y: -2 } : undefined}
              whileTap={clickable ? { scale: 0.95 } : undefined}
              disabled={!clickable}
              aria-label={clickable ? (isLocked ? `Unlock ${note.note}${note.octave}` : `Lock to ${note.note}${note.octave}`) : undefined}
              className={`flex flex-col items-center transition-all duration-200 ${
                clickable ? 'cursor-pointer' : 'cursor-default'
              } ${isCurrentString || isLocked ? 'scale-110' : ''}`}
            >
              <div
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-display font-bold text-sm md:text-base border-2 transition-all duration-200 ${
                  isLocked
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
                    : isCurrentString
                      ? 'bg-primary/20 border-primary text-primary shadow-lg box-glow'
                      : 'bg-secondary/30 border-border text-muted-foreground hover:border-foreground/40'
                }`}
              >
                {note.note}
                <span className="text-[10px] opacity-70">{note.octave}</span>
                {isLocked && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-black rounded-full p-0.5 shadow-md">
                    <Lock className="w-2.5 h-2.5" strokeWidth={3} />
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-mono transition-colors ${
                  isLocked ? 'text-amber-300 font-bold' : isCurrentString ? 'text-primary' : 'text-muted-foreground/60'
                }`}
              >
                {note.frequency.toFixed(2)}Hz
              </span>
            </motion.button>
          );
        })}
      </div>
      {clickable && (
        <p className="text-center text-[10px] text-muted-foreground/70 font-mono">
          {lockedString
            ? `Locked to ${lockedString.note}${lockedString.octave} · click again to unlock`
            : 'Tap a string to lock the tuner to it (intonation mode)'}
        </p>
      )}
    </div>
  );
}
