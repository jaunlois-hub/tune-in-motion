import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Mic2, Square, Play, Pause, Trash2, Repeat, Scissors, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useLoopRecorder } from '@/hooks/useLoopRecorder';
import { VocalRecorderView } from '@/components/studio/VocalRecorderView';

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
}

type RecordTab = 'loops' | 'vocals';

export function RecordingSection() {
  const [activeTab, setActiveTab] = useState<RecordTab>('loops');
  const [trimmingLoopId, setTrimmingLoopId] = useState<string | null>(null);
  const { isRecording, loops, playingLoopId, recordingDuration, startRecording, stopRecording, playLoop, stopLoop, deleteLoop, updateLoopTrim, exportLoop } = useLoopRecorder();

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border w-fit mx-auto">
        <button
          onClick={() => setActiveTab('loops')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display transition-all ${
            activeTab === 'loops'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Loop Recorder
        </button>
        <button
          onClick={() => setActiveTab('vocals')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display transition-all ${
            activeTab === 'vocals'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mic2 className="w-3.5 h-3.5" />
          Vocal Recorder
        </button>
      </div>

      {activeTab === 'vocals' ? (
        <VocalRecorderView />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shrink-0",
                isRecording ? "bg-destructive text-destructive-foreground shadow-[0_0_30px_hsl(var(--destructive)/0.5)]" : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
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
                  <span className="font-display text-2xl font-bold text-destructive">{formatDuration(recordingDuration)}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Ready to record</span>
              )}
            </div>
          </div>

          {loops.length > 0 && (
            <div className="space-y-2">
              {loops.map((loop, index) => (
                <div key={loop.id}>
                  <motion.div
                    className={cn("flex items-center gap-3 p-3 rounded-xl transition-all", playingLoopId === loop.id ? "bg-primary/10 border border-primary/30" : "bg-secondary/50")}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                    <div className="flex-1 h-8 rounded bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 flex items-center justify-center overflow-hidden relative">
                      {(loop.trimStart > 0 || loop.trimEnd < loop.duration) && (
                        <>
                          <div className="absolute left-0 top-0 bottom-0 bg-background/70" style={{ width: `${(loop.trimStart / loop.duration) * 100}%` }} />
                          <div className="absolute right-0 top-0 bottom-0 bg-background/70" style={{ width: `${((loop.duration - loop.trimEnd) / loop.duration) * 100}%` }} />
                        </>
                      )}
                      <div className="flex items-end gap-0.5 h-6 relative z-10">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <motion.div key={i} className="w-0.5 bg-primary rounded-full" style={{ height: `${20 + Math.random() * 80}%` }}
                            animate={playingLoopId === loop.id ? { height: ['20%', `${20 + Math.random() * 80}%`, '20%'] } : {}}
                            transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.02 }}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{formatDuration(loop.trimEnd - loop.trimStart)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playingLoopId === loop.id ? stopLoop(loop.id) : playLoop(loop.id, false)}>
                        {playingLoopId === loop.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playLoop(loop.id, true)}><Repeat className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className={cn("h-8 w-8", trimmingLoopId === loop.id && "text-primary")} onClick={() => setTrimmingLoopId(trimmingLoopId === loop.id ? null : loop.id)}>
                        <Scissors className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportLoop(loop.id)}><Download className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteLoop(loop.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </motion.div>
                  {trimmingLoopId === loop.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-2 p-3 bg-secondary/30 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium flex items-center gap-1"><Scissors className="w-3 h-3" />Trim</span>
                        <span className="text-xs text-muted-foreground">{formatDuration(loop.trimStart)} - {formatDuration(loop.trimEnd)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">Start</label>
                          <Slider value={[loop.trimStart]} onValueChange={([v]) => updateLoopTrim(loop.id, Math.min(v, loop.trimEnd - 0.1), loop.trimEnd)} min={0} max={loop.duration} step={0.1} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground mb-1 block">End</label>
                          <Slider value={[loop.trimEnd]} onValueChange={([v]) => updateLoopTrim(loop.id, loop.trimStart, Math.max(v, loop.trimStart + 0.1))} min={0} max={loop.duration} step={0.1} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
