interface CentsMeterProps {
  cents: number;
  isActive: boolean;
}

export function CentsMeter({ cents, isActive }: CentsMeterProps) {
  const normalizedCents = Math.max(-50, Math.min(50, cents));
  const percentage = ((normalizedCents + 50) / 100) * 100;

  const isPerfect = Math.abs(cents) < 2;
  const isFlat = cents < -2;
  const isSharp = cents > 2;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Labels */}
      <div className="flex justify-between text-[10px] font-display uppercase tracking-widest text-muted-foreground/60 mb-1.5 px-1">
        <span className={isFlat && isActive ? 'text-tuner-flat' : ''}>♭ Flat</span>
        <span className={isPerfect && isActive ? 'text-tuner-perfect font-bold' : ''}>● In Tune</span>
        <span className={isSharp && isActive ? 'text-tuner-sharp' : ''}>♯ Sharp</span>
      </div>

      {/* Meter track */}
      <div className="relative h-6 bg-secondary/40 rounded-full overflow-hidden border border-border/50">
        {/* Gradient zones */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-tuner-flat/30 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-[40%] bg-gradient-to-l from-tuner-sharp/30 to-transparent" />
          <div className="absolute inset-y-0 left-[45%] w-[10%] bg-tuner-perfect/20" />
        </div>

        {/* Fine tick marks */}
        <div className="absolute inset-0 flex justify-between items-center px-1">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full ${
                i === 10
                  ? 'w-[2px] h-4 bg-tuner-perfect/50'
                  : i % 5 === 0
                  ? 'w-[1px] h-3 bg-muted-foreground/25'
                  : 'w-[1px] h-2 bg-muted-foreground/15'
              }`}
            />
          ))}
        </div>

        {/* Indicator dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full transition-all duration-100 ease-out"
          style={{
            left: `calc(${percentage}% - 7px)`,
            backgroundColor: !isActive
              ? 'hsl(var(--muted-foreground))'
              : isPerfect
              ? 'hsl(var(--tuner-perfect))'
              : isFlat
              ? 'hsl(var(--tuner-flat))'
              : 'hsl(var(--tuner-sharp))',
            boxShadow: isActive
              ? isPerfect
                ? '0 0 12px 2px hsl(var(--tuner-perfect) / 0.6)'
                : isFlat
                ? '0 0 10px 1px hsl(var(--tuner-flat) / 0.4)'
                : '0 0 10px 1px hsl(var(--tuner-sharp) / 0.4)'
              : 'none',
          }}
        />
      </div>

      {/* Cents readout */}
      <div className="text-center mt-2">
        <span
          className={`font-display text-xl font-bold tabular-nums transition-colors ${
            !isActive
              ? 'text-muted-foreground/40'
              : isPerfect
              ? 'text-tuner-perfect text-glow-perfect'
              : isFlat
              ? 'text-tuner-flat'
              : 'text-tuner-sharp'
          }`}
        >
          {isActive ? (cents > 0 ? '+' : '') + cents.toFixed(1) : '—'}
        </span>
        <span className="text-[10px] text-muted-foreground/50 ml-1 font-display">¢</span>
      </div>
    </div>
  );
}
