interface NoteDisplayProps {
  note: string | null;
  octave: number | null;
  frequency: number | null;
  isActive: boolean;
  cents: number;
}

export function NoteDisplay({ note, octave, frequency, isActive, cents }: NoteDisplayProps) {
  const isPerfect = Math.abs(cents) < 2;
  const isFlat = cents < -2;

  return (
    <div className="text-center space-y-2">
      {/* Note name */}
      <div className="relative">
        <span
          className={`font-display text-8xl md:text-9xl font-black tracking-tight transition-all duration-200 ${
            !isActive
              ? 'text-muted-foreground/50'
              : isPerfect
              ? 'text-tuner-perfect text-glow-perfect'
              : isFlat
              ? 'text-tuner-flat text-glow-flat'
              : 'text-tuner-sharp text-glow-sharp'
          }`}
        >
          {note || '-'}
        </span>
        {octave !== null && isActive && (
          <span
            className={`absolute -top-2 -right-4 font-display text-3xl font-bold ${
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
      
      {/* Frequency */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl font-mono text-muted-foreground">
          {isActive && frequency ? frequency.toFixed(2) : '---'}
        </span>
        <span className="text-sm text-muted-foreground/60">Hz</span>
      </div>
    </div>
  );
}
