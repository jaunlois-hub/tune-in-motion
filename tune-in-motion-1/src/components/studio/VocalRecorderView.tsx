import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Trash2, Download, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVocalRecorder, VOICE_EFFECTS, type VoiceEffect } from '@/hooks/useVocalRecorder';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
}

function EffectCard({ effect, isActive, onClick }: { effect: VoiceEffect; isActive: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center min-w-[80px]",
        isActive
          ? "bg-primary/20 border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
          : "bg-secondary/40 border-transparent hover:bg-secondary/70 hover:border-border"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-2xl">{effect.icon}</span>
      <span className={cn("text-xs font-medium", isActive ? "text-primary" : "text-foreground")}>{effect.name}</span>
      <span className="text-[9px] text-muted-foreground leading-tight">{effect.description}</span>
    </motion.button>
  );
}

export function VocalRecorderView() {
  const {
    isRecording, activeEffect, setActiveEffect, recordings, playingId,
    recordingDuration, isMonitoring, setIsMonitoring,
    startRecording, stopRecording, playRecording, stopPlayback,
    deleteRecording, exportRecording,
  } = useVocalRecorder();

  const categories = [
    { id: 'popular', label: '🔥 Popular' },
    { id: 'creative', label: '🎨 Creative' },
    { id: 'studio', label: '🎙️ Studio' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Voice Effects Selector */}
      {categories.map(cat => {
        const effects = VOICE_EFFECTS.filter(e => e.category === cat.id);
        return (
          <div key={cat.id}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{cat.label}</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {effects.map(effect => (
                <EffectCard
                  key={effect.id}
                  effect={effect}
                  isActive={activeEffect === effect.id}
                  onClick={() => setActiveEffect(effect.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Recording Controls */}
      <div className="flex items-center gap-6 pt-2">
        <motion.button
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
            isRecording
              ? "bg-destructive text-destructive-foreground shadow-[0_0_30px_hsl(var(--destructive)/0.5)]"
              : "bg-primary text-primary-foreground hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5, repeat: isRecording ? Infinity : 0 }}
        >
          {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-8 h-8" />}
        </motion.button>

        <div className="flex-1">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <motion.div className="w-3 h-3 rounded-full bg-destructive" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
              <span className="font-display text-2xl font-bold text-destructive">{formatTime(recordingDuration)}</span>
              <span className="text-xs text-muted-foreground">
                Effect: {VOICE_EFFECTS.find(e => e.id === activeEffect)?.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Ready — {VOICE_EFFECTS.find(e => e.id === activeEffect)?.icon}{' '}
                {VOICE_EFFECTS.find(e => e.id === activeEffect)?.name}
              </span>
            </div>
          )}
        </div>

        <Button
          variant={isMonitoring ? "default" : "outline"}
          size="sm"
          onClick={() => setIsMonitoring(!isMonitoring)}
          className="gap-1.5"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span className="text-xs">Monitor</span>
        </Button>
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Recordings ({recordings.length})
          </p>
          <AnimatePresence>
            {recordings.map((rec, i) => {
              const effect = VOICE_EFFECTS.find(e => e.id === rec.effectId);
              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all",
                    playingId === rec.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary/50"
                  )}
                >
                  <span className="text-xs text-muted-foreground w-6">#{i + 1}</span>
                  <span className="text-lg">{effect?.icon || '🎤'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{effect?.name || 'Clean'}</p>
                    <p className="text-[10px] text-muted-foreground">{formatTime(rec.duration)}</p>
                  </div>

                  {/* Mini waveform */}
                  <div className="flex items-end gap-0.5 h-6">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <motion.div
                        key={j}
                        className="w-0.5 bg-primary rounded-full"
                        style={{ height: `${20 + Math.random() * 80}%` }}
                        animate={playingId === rec.id ? { height: ['20%', `${20 + Math.random() * 80}%`, '20%'] } : {}}
                        transition={{ duration: 0.3, repeat: Infinity, delay: j * 0.03 }}
                      />
                    ))}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => playingId === rec.id ? stopPlayback(rec.id) : playRecording(rec.id)}
                    >
                      {playingId === rec.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportRecording(rec.id)}>
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteRecording(rec.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
