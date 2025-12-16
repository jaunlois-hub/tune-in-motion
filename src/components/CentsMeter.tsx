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
    <div className="w-full max-w-md mx-auto">
      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground mb-2 px-1">
        <span className={isFlat && isActive ? 'text-tuner-flat text-glow-flat' : ''}>FLAT</span>
        <span className={isPerfect && isActive ? 'text-tuner-perfect text-glow-perfect' : ''}>IN TUNE</span>
        <span className={isSharp && isActive ? 'text-tuner-sharp text-glow-sharp' : ''}>SHARP</span>
      </div>
      
      {/* Meter track */}
      <div className="relative h-8 bg-secondary/50 rounded-full overflow-hidden border border-border">
        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between items-center px-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className={`w-0.5 h-3 rounded-full ${
                i === 5 ? 'h-5 bg-primary/60' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        
        {/* Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all duration-75 ease-out shadow-lg"
          style={{
            left: `calc(${percentage}% - 8px)`,
            backgroundColor: !isActive
              ? 'hsl(var(--muted-foreground))'
              : isPerfect
              ? 'hsl(var(--tuner-perfect))'
              : isFlat
              ? 'hsl(var(--tuner-flat))'
              : 'hsl(var(--tuner-sharp))',
            boxShadow: isActive
              ? isPerfect
                ? '0 0 15px hsl(var(--tuner-perfect)), 0 0 30px hsl(var(--tuner-perfect) / 0.5)'
                : isFlat
                ? '0 0 15px hsl(var(--tuner-flat)), 0 0 30px hsl(var(--tuner-flat) / 0.5)'
                : '0 0 15px hsl(var(--tuner-sharp)), 0 0 30px hsl(var(--tuner-sharp) / 0.5)'
              : 'none',
          }}
        />
        
        {/* Center line glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
      </div>
      
      {/* Cents display */}
      <div className="text-center mt-3">
        <span
          className={`font-display text-2xl font-bold transition-colors ${
            !isActive
              ? 'text-muted-foreground'
              : isPerfect
              ? 'text-tuner-perfect text-glow-perfect'
              : isFlat
              ? 'text-tuner-flat text-glow-flat'
              : 'text-tuner-sharp text-glow-sharp'
          }`}
        >
          {isActive ? (cents > 0 ? '+' : '') + cents.toFixed(1) : '0.0'}
        </span>
        <span className="text-xs text-muted-foreground ml-1">cents</span>
      </div>
    </div>
  );
}
