import { motion } from 'framer-motion';
import { Ear, EarOff, Lock, Unlock, Volume2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useSmartDrummer, type DrumGenre } from '@/hooks/useSmartDrummer';
import { useDrumMachine, DRUM_PATTERNS } from '@/hooks/useDrumMachine';
import { useBpmSync } from '@/hooks/useBpmSync';

const GENRE_LABELS: Record<DrumGenre, { label: string; emoji: string }> = {
  ballad: { label: 'Ballad', emoji: '🌙' },
  blues: { label: 'Blues', emoji: '🎷' },
  rock: { label: 'Rock', emoji: '🎸' },
  punk: { label: 'Punk', emoji: '⚡' },
  metal: { label: 'Metal', emoji: '🤘' },
  blast: { label: 'Blast', emoji: '💀' },
};

interface SmartDrummerProps {
  compact?: boolean;
}

export function SmartDrummer({ compact = false }: SmartDrummerProps) {
  const {
    isFollowing, detectedBpm, detectedGenre, suggestedPattern,
    sensitivity, bpmLocked, beatPulse,
    setSensitivity, setBpmLocked, startFollowing, stopFollowing,
  } = useSmartDrummer();

  const { isPlaying, currentPattern, setCurrentPattern, volume, setVolume, start: startDrums, stop: stopDrums } = useDrumMachine();
  const { bpm } = useBpmSync();

  const handleToggleFollow = () => {
    if (isFollowing) {
      stopFollowing();
    } else {
      startFollowing();
    }
  };

  const handleApplyPattern = () => {
    setCurrentPattern(suggestedPattern);
    if (!isPlaying) startDrums();
  };

  if (compact) {
    return (
      <div className="bg-card/50 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="font-display text-sm font-bold">Smart Drummer</span>
          </div>
          <motion.button
            onClick={handleToggleFollow}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              isFollowing
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
            whileTap={{ scale: 0.95 }}
          >
            {isFollowing ? <><EarOff className="w-3 h-3" /> Stop</> : <><Ear className="w-3 h-3" /> Follow</>}
          </motion.button>
        </div>

        <div className="flex items-center gap-4">
          {/* Beat pulse + BPM */}
          <div className="flex items-center gap-2">
            <motion.div
              className={cn(
                "w-3 h-3 rounded-full transition-colors",
                isFollowing
                  ? detectedBpm > 0 ? "bg-tuner-perfect" : "bg-primary animate-pulse"
                  : "bg-muted"
              )}
              animate={beatPulse ? { scale: [1, 1.8, 1] } : {}}
              transition={{ duration: 0.15 }}
            />
            <div className="text-center">
              <span className="font-display text-xl font-bold text-primary">
                {detectedBpm > 0 ? detectedBpm : bpm}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">BPM</span>
            </div>
          </div>

          {/* Genre badge */}
          {detectedBpm > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium border border-primary/20"
            >
              {GENRE_LABELS[detectedGenre].emoji} {GENRE_LABELS[detectedGenre].label}
            </motion.span>
          )}

          {/* Lock BPM */}
          <button
            onClick={() => setBpmLocked(!bpmLocked)}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              bpmLocked ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title={bpmLocked ? "BPM locked" : "Lock BPM"}
          >
            {bpmLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Play drums with suggested pattern */}
          {detectedBpm > 0 && !isPlaying && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleApplyPattern}>
              ▶ {DRUM_PATTERNS[suggestedPattern]?.name}
            </Button>
          )}
          {isPlaying && (
            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={stopDrums}>
              ■ Stop
            </Button>
          )}
        </div>

        {/* Sensitivity + Volume (inline) */}
        {isFollowing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-4 mt-3 pt-3 border-t border-border"
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">Sensitivity</span>
              <Slider value={[sensitivity * 100]} onValueChange={([v]) => setSensitivity(v / 100)} min={0} max={100} className="flex-1" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
              <Slider value={[volume * 100]} onValueChange={([v]) => setVolume(v / 100)} min={0} max={100} className="flex-1" />
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Full mode (Studio tab)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className={cn(
              "w-4 h-4 rounded-full",
              isFollowing
                ? detectedBpm > 0 ? "bg-tuner-perfect shadow-[0_0_10px_hsl(var(--tuner-perfect))]" : "bg-primary animate-pulse"
                : "bg-muted"
            )}
            animate={beatPulse ? { scale: [1, 2, 1] } : {}}
            transition={{ duration: 0.15 }}
          />
          <div>
            <span className="font-display text-3xl font-bold text-primary">
              {detectedBpm > 0 ? detectedBpm : '—'}
            </span>
            <span className="text-sm text-muted-foreground ml-2">BPM detected</span>
          </div>
          {detectedBpm > 0 && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/20"
            >
              {GENRE_LABELS[detectedGenre].emoji} {GENRE_LABELS[detectedGenre].label}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBpmLocked(!bpmLocked)}
            className={cn(
              "p-2 rounded-lg transition-all",
              bpmLocked ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
            title={bpmLocked ? "BPM locked — won't change" : "Lock current BPM"}
          >
            {bpmLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          <motion.button
            onClick={handleToggleFollow}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
              isFollowing
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            {isFollowing ? <><EarOff className="w-4 h-4" /> Stop Following</> : <><Ear className="w-4 h-4" /> Start Following</>}
          </motion.button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Onset Sensitivity</label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground">Soft</span>
            <Slider value={[sensitivity * 100]} onValueChange={([v]) => setSensitivity(v / 100)} min={0} max={100} className="flex-1" />
            <span className="text-[10px] text-muted-foreground">Hard</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Drum Volume</label>
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider value={[volume * 100]} onValueChange={([v]) => setVolume(v / 100)} min={0} max={100} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Auto-pattern suggestion */}
      {detectedBpm > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">Suggested pattern:</span>
            <span className="font-bold text-primary">{DRUM_PATTERNS[suggestedPattern]?.name}</span>
            <span className="text-xs text-muted-foreground">({detectedBpm} BPM → {GENRE_LABELS[detectedGenre].label})</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleApplyPattern}>
              {isPlaying ? 'Switch' : '▶ Play'}
            </Button>
            {isPlaying && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={stopDrums}>Stop</Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Pattern override */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">Override Pattern</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
          {Object.entries(DRUM_PATTERNS).map(([key, pat]) => (
            <button
              key={key}
              onClick={() => { setCurrentPattern(key); if (!isPlaying) startDrums(); }}
              className={cn(
                "p-2 rounded-lg text-xs font-medium transition-all",
                currentPattern === key
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : key === suggestedPattern && detectedBpm > 0
                    ? "bg-accent/30 text-accent-foreground border border-accent/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              {pat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
