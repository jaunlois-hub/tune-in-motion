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
        <span
          className={`font-display text-7xl md:text-8xl font-black tracking-tight transition-all duration-300 ${
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
        </span>
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
