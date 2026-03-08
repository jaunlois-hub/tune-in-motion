import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface A4CalibrationProps {
  a4: number;
  onChange: (value: number) => void;
}

export function A4Calibration({ a4, onChange }: A4CalibrationProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">A4</span>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 text-muted-foreground hover:text-primary"
        onClick={() => onChange(a4 - 1)}
      >
        <Minus className="w-3 h-3" />
      </Button>
      <span className="font-display text-sm text-primary w-14 text-center">{a4} Hz</span>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 text-muted-foreground hover:text-primary"
        onClick={() => onChange(a4 + 1)}
      >
        <Plus className="w-3 h-3" />
      </Button>
      {a4 !== 440 && (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-primary"
          onClick={() => onChange(440)}
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
