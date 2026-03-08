import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TUNINGS, type Tuning } from '@/lib/tunings';

interface TuningSelectorProps {
  selectedTuning: Tuning;
  onTuningChange: (tuning: Tuning) => void;
}

const CATEGORY_LABELS = {
  guitar: '🎸 Guitar',
  '7string': '🎸 7-String Guitar',
  '12string': '🎸 12-String Guitar',
  bass: '🎸 Bass Guitar',
  ukulele: '🪕 Ukulele',
  banjo: '🪕 Banjo',
  mandolin: '🪕 Mandolin',
  violin: '🎻 Violin / Strings',
} as const;

type Category = keyof typeof CATEGORY_LABELS;
const CATEGORY_ORDER: Category[] = ['guitar', '7string', '12string', 'bass', 'ukulele', 'banjo', 'mandolin', 'violin'];

export function TuningSelector({ selectedTuning, onTuningChange }: TuningSelectorProps) {
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = TUNINGS.filter((t) => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Partial<Record<Category, typeof TUNINGS>>);

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
        <SelectContent className="bg-popover border-border max-h-72">
          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((category) => (
            <SelectGroup key={category}>
              <SelectLabel className="font-display text-xs tracking-wider text-primary/70 px-2 py-1.5">
                {CATEGORY_LABELS[category]}
              </SelectLabel>
              {grouped[category].map((tuning) => (
                <SelectItem
                  key={tuning.id}
                  value={tuning.id}
                  className="cursor-pointer hover:bg-secondary/50 focus:bg-secondary/50"
                >
                  <div className="flex flex-col items-start py-0.5">
                    <span className="font-display font-semibold text-sm">{tuning.name}</span>
                    <span className="text-xs text-muted-foreground">{tuning.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
