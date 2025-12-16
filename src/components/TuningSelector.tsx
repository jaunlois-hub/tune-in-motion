import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TUNINGS, type Tuning } from '@/lib/tunings';

interface TuningSelectorProps {
  selectedTuning: Tuning;
  onTuningChange: (tuning: Tuning) => void;
}

export function TuningSelector({ selectedTuning, onTuningChange }: TuningSelectorProps) {
  return (
    <div className="w-full max-w-xs mx-auto">
      <label className="block text-xs text-muted-foreground mb-2 text-center uppercase tracking-wider">
        Tuning
      </label>
      <Select
        value={selectedTuning.id}
        onValueChange={(value) => {
          const tuning = TUNINGS.find((t) => t.id === value);
          if (tuning) onTuningChange(tuning);
        }}
      >
        <SelectTrigger className="w-full bg-secondary/50 border-border hover:bg-secondary/70 transition-colors">
          <SelectValue>
            <div className="flex flex-col items-start">
              <span className="font-display font-semibold">{selectedTuning.name}</span>
              <span className="text-xs text-muted-foreground">{selectedTuning.description}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          {TUNINGS.map((tuning) => (
            <SelectItem
              key={tuning.id}
              value={tuning.id}
              className="cursor-pointer hover:bg-secondary/50 focus:bg-secondary/50"
            >
              <div className="flex flex-col items-start py-1">
                <span className="font-display font-semibold">{tuning.name}</span>
                <span className="text-xs text-muted-foreground">{tuning.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
