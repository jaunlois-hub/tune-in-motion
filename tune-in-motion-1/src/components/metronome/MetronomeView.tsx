import { motion } from 'framer-motion';
import { Play, Pause, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useMetronome } from '@/hooks/useMetronome';

export function MetronomeView() {
  const { isPlaying, bpm, beat, beatsPerMeasure, setBpm, setBeatsPerMeasure, start, stop, tapTempo } = useMetronome();

  return (
    <div className="space-y-8">
      <div className="bg-card/50 border border-border rounded-2xl p-6 sm:p-8">
        {/* BPM Display */}
        <div className="text-center mb-8">
          <motion.div
            className="font-display text-7xl sm:text-8xl font-bold text-primary text-glow"
            animate={{ scale: isPlaying && beat === 0 ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 0.1 }}
          >
            {bpm}
          </motion.div>
          <p className="text-muted-foreground text-lg mt-2">BPM</p>
        </div>

        {/* Beat Indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "w-6 h-6 rounded-full transition-all duration-100",
                beat === i && isPlaying
                  ? i === 0
                    ? "bg-tuner-perfect shadow-[0_0_20px_hsl(var(--tuner-perfect)/0.8)]"
                    : "bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                  : "bg-secondary"
              )}
              animate={beat === i && isPlaying ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>

        {/* BPM Slider */}
        <div className="max-w-md mx-auto mb-8">
          <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={30} max={300} step={1} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>30</span><span>165</span><span>300</span>
          </div>
        </div>

        {/* BPM Adjust Buttons */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => setBpm(Math.max(30, bpm - 5))}><Minus className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setBpm(Math.max(30, bpm - 1))}><Minus className="w-3 h-3" /></Button>
          <Button variant="outline" size="icon" onClick={() => setBpm(Math.min(300, bpm + 1))}><Plus className="w-3 h-3" /></Button>
          <Button variant="outline" size="icon" onClick={() => setBpm(Math.min(300, bpm + 5))}><Plus className="w-4 h-4" /></Button>
        </div>

        {/* Time Signature */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <span className="text-muted-foreground text-sm">Time Signature:</span>
          <div className="flex gap-2">
            {[2, 3, 4, 6].map((beats) => (
              <button
                key={beats}
                onClick={() => setBeatsPerMeasure(beats)}
                className={cn(
                  "w-10 h-10 rounded-lg font-display font-bold transition-all",
                  beatsPerMeasure === beats ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {beats}/4
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" size="lg" onClick={tapTempo} className="font-display">TAP TEMPO</Button>
          <motion.button
            onClick={isPlaying ? stop : start}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
              isPlaying
                ? "bg-tuner-perfect text-primary-foreground shadow-[0_0_40px_hsl(var(--tuner-perfect)/0.5)]"
                : "bg-primary text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </motion.button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="bg-card/50 border border-border rounded-2xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {[60, 80, 100, 120, 140, 160, 180, 200].map((preset) => (
            <button
              key={preset}
              onClick={() => setBpm(preset)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                bpm === preset ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
