import { motion } from 'framer-motion';

interface NoteDisplayProps {
  note: string | null;
  octave: number | null;
  frequency: number | null;
  isActive: boolean;
  cents: number;
}

export function NoteDisplay({ note, octave, isActive, cents }: NoteDisplayProps) {
  const isPerfect = Math.abs(cents) < 2;
  const isFlat = cents < -2;

  return (
    <div className="text-center">
      <div className="relative inline-block">
        <motion.span
          // Signature interaction: a one-shot green "bloom" when the note locks to pitch.
          animate={isPerfect && isActive ? {
            textShadow: [
              '0 0 0px hsl(140 90% 48% / 0)',
              '0 0 40px hsl(140 90% 48% / 1)',
              '0 0 20px hsl(140 90% 48% / 0.8)',
            ],
            scale: [1, 1.04, 1],
          } : { scale: 1 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
          className={`block font-display text-7xl md:text-8xl font-black tracking-tight transition-colors duration-300 ${
            !isActive
              ? 'text-muted-foreground/30'
              : isPerfect
              ? 'text-tuner-perfect text-glow-perfect'
              : isFlat
              ? 'text-tuner-flat text-glow-flat'
              : 'text-tuner-sharp text-glow-sharp'
          }`}
        >
          {note || '—'}
        </motion.span>
        {octave !== null && isActive && (
          <span
            className={`absolute -top-1 -right-5 font-display text-2xl font-bold opacity-80 ${
              isPerfect
                ? 'text-tuner-perfect'
                : isFlat
                ? 'text-tuner-flat'
                : 'text-tuner-sharp'
            }`}
          >
            {octave}
          </span>
        )}
      </div>
    </div>
  );
}
