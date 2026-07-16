import { useRef } from 'react';
import { Upload, Trash2, Speaker, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { ImpulseResponse } from '@/hooks/useImpulseResponses';

interface Props {
  irs: ImpulseResponse[];
  activeIrId: string | null;
  irWet: number;
  onLoadFile: (file: File) => Promise<ImpulseResponse>;
  onRemove: (id: string) => void;
  onActivate: (ir: ImpulseResponse | null) => void;
  onWetChange: (v: number) => void;
}

export function IRLoader({ irs, activeIrId, irWet, onLoadFile, onRemove, onActivate, onWetChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    let loaded = 0;
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const ir = await onLoadFile(file);
        if (loaded === 0) onActivate(ir); // auto-activate first successful load
        loaded++;
      } catch (err) {
        console.warn('[IR load]', file.name, err);
        failed++;
      }
    }
    toast({
      title: 'IR loaded',
      description: `${loaded} loaded${failed ? ` • ${failed} failed` : ''}`,
      variant: failed && !loaded ? 'destructive' : 'default',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Speaker className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Impulse Response (Tonality)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/wav,audio/x-wav,.wav"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          <Button size="sm" variant="outline" className="h-7" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3 mr-1" /> Load .wav IR
          </Button>
        </div>
      </div>

      {irs.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-8">Wet</span>
            <Slider value={[irWet * 100]} onValueChange={([v]) => onWetChange(v / 100)} min={0} max={100} className="flex-1" />
            <span className="text-[10px] font-mono text-primary w-8 text-right">{Math.round(irWet * 100)}%</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {irs.map((ir) => {
              const active = ir.id === activeIrId;
              return (
                <motion.div
                  key={ir.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border transition-colors',
                    active ? 'bg-primary/10 border-primary/30' : 'bg-secondary/40 border-transparent hover:border-border'
                  )}
                >
                  <button
                    onClick={() => onActivate(active ? null : ir)}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                    )}
                    title={active ? 'Bypass IR' : 'Activate IR'}
                  >
                    <Check className={cn('w-3 h-3 transition-opacity', active ? 'opacity-100' : 'opacity-30')} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{ir.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {ir.duration.toFixed(2)}s • {ir.sampleRate} Hz • {ir.channels}ch • {(ir.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(ir.id)}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {irs.length === 0 && (
        <p className="text-[10px] text-muted-foreground/70 italic">
          Drop a cabinet or reverb .wav impulse response to shape your tone. Buffers live in memory only — re-load after refresh.
        </p>
      )}
    </div>
  );
}
