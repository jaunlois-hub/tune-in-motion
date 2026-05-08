interface SignalStrengthProps {
  clarity: number;
  isActive: boolean;
}

export function SignalStrength({ clarity, isActive }: SignalStrengthProps) {
  const bars = 5;
  const activeBars = isActive ? Math.round(clarity * bars) : 0;

  const getBarColor = (index: number) => {
    if (!isActive || index >= activeBars) return 'bg-muted/40';
    if (clarity > 0.8) return 'bg-tuner-perfect shadow-[0_0_6px_hsl(var(--tuner-perfect)/0.5)]';
    if (clarity > 0.6) return 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]';
    return 'bg-tuner-flat shadow-[0_0_6px_hsl(var(--tuner-flat)/0.5)]';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
        Signal
      </span>
      <div className="flex items-end gap-0.5 h-4">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-sm transition-all duration-150 ${getBarColor(i)}`}
            style={{ height: `${((i + 1) / bars) * 100}%` }}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8">
        {isActive ? `${Math.round(clarity * 100)}%` : '—'}
      </span>
    </div>
  );
}
