import { type TuningNote } from '@/lib/tunings';

interface FrequencyDisplayProps {
  currentFrequency: number | null;
  targetNote: TuningNote | null;
  isActive: boolean;
}

export function FrequencyDisplay({ currentFrequency, targetNote, isActive }: FrequencyDisplayProps) {
  if (!isActive || !currentFrequency || !targetNote) {
    return (
      <div className="flex items-center justify-center gap-6 text-muted-foreground/40 font-mono text-sm">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider mb-1">Current</div>
          <div className="font-display text-lg">---</div>
        </div>
        <div className="text-muted-foreground/20 font-display text-xl">→</div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider mb-1">Target</div>
          <div className="font-display text-lg">---</div>
        </div>
      </div>
    );
  }

  const diff = currentFrequency - targetNote.frequency;
  const diffColor = Math.abs(diff) < 1 ? 'text-tuner-perfect' : diff < 0 ? 'text-tuner-flat' : 'text-tuner-sharp';

  return (
    <div className="flex items-center justify-center gap-4 md:gap-6 font-mono text-sm">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider mb-1 text-muted-foreground">Current</div>
        <div className={`font-display text-lg md:text-xl ${diffColor}`}>
          {currentFrequency.toFixed(2)}
          <span className="text-xs text-muted-foreground/60 ml-1">Hz</span>
        </div>
      </div>
      <div className={`font-display text-lg ${diffColor}`}>
        {Math.abs(diff) < 1 ? '✓' : diff < 0 ? '↑' : '↓'}
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-wider mb-1 text-muted-foreground">Target</div>
        <div className="font-display text-lg md:text-xl text-primary">
          {targetNote.frequency.toFixed(2)}
          <span className="text-xs text-muted-foreground/60 ml-1">Hz</span>
        </div>
      </div>
    </div>
  );
}
