import { type TuningNote } from '@/lib/tunings';

interface FrequencyDisplayProps {
  currentFrequency: number | null;
  targetNote: TuningNote | null;
  isActive: boolean;
}

export function FrequencyDisplay({ currentFrequency, targetNote, isActive }: FrequencyDisplayProps) {
  if (!isActive || !currentFrequency || !targetNote) {
    return (
      <div className="flex items-center justify-center gap-8 text-muted-foreground/30 font-mono text-sm">
        <div className="text-center">
          <div className="text-[9px] font-display uppercase tracking-[0.2em] mb-1">Detected</div>
          <div className="font-display text-base tabular-nums">—</div>
        </div>
        <div className="text-muted-foreground/15 font-display text-lg">⟶</div>
        <div className="text-center">
          <div className="text-[9px] font-display uppercase tracking-[0.2em] mb-1">Target</div>
          <div className="font-display text-base tabular-nums">—</div>
        </div>
      </div>
    );
  }

  const diff = currentFrequency - targetNote.frequency;
  const absDiff = Math.abs(diff);
  const diffColor = absDiff < 0.5 ? 'text-tuner-perfect' : diff < 0 ? 'text-tuner-flat' : 'text-tuner-sharp';

  return (
    <div className="flex items-center justify-center gap-6 font-mono text-sm">
      <div className="text-center min-w-[80px]">
        <div className="text-[9px] font-display uppercase tracking-[0.2em] mb-1 text-muted-foreground/60">Detected</div>
        <div className={`font-display text-base md:text-lg tabular-nums ${diffColor}`}>
          {currentFrequency.toFixed(1)}
          <span className="text-[10px] text-muted-foreground/40 ml-0.5">Hz</span>
        </div>
      </div>
      <div className={`font-display text-sm ${diffColor} opacity-70`}>
        {absDiff < 0.5 ? '✓' : diff < 0 ? '↑' : '↓'}
      </div>
      <div className="text-center min-w-[80px]">
        <div className="text-[9px] font-display uppercase tracking-[0.2em] mb-1 text-muted-foreground/60">Target</div>
        <div className="font-display text-base md:text-lg tabular-nums text-primary/80">
          {targetNote.frequency.toFixed(1)}
          <span className="text-[10px] text-muted-foreground/40 ml-0.5">Hz</span>
        </div>
      </div>
    </div>
  );
}
