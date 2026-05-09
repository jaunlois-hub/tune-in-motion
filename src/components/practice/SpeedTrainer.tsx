import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, TrendingUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { RIFFS, fretToFrequency, type Riff } from '@/lib/musicTheory';
import { ensurePluckBuffer, playPluckedNote, type PluckedNoteHandle } from '@/lib/pluckedSynth';
import { registerAudioContext } from '@/hooks/useAudioDevices';
import { createMasterGain } from '@/hooks/useMasterVolume';

export function SpeedTrainer() {
  const [selectedRiff, setSelectedRiff] = useState<Riff>(RIFFS[0]);
  const [startBpm, setStartBpm] = useState(60);
  const [targetBpm, setTargetBpm] = useState(120);
  const [bpmStep, setBpmStep] = useState(5);
  const [repsPerStep, setRepsPerStep] = useState(2);
  const [currentBpm, setCurrentBpm] = useState(60);
  const [currentRep, setCurrentRep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscsRef = useRef<OscillatorNode[]>([]);
  const notesRef = useRef<PluckedNoteHandle[]>([]);
  const pluckBufferRef = useRef<AudioBuffer | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const bpmRef = useRef(startBpm);
  const repRef = useRef(0);
  const releaseCtxRef = useRef<(() => void) | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);

  const progress = targetBpm > startBpm
    ? Math.min(100, ((currentBpm - startBpm) / (targetBpm - startBpm)) * 100)
    : 0;

  const stop = useCallback(() => {
    runningRef.current = false;
    oscsRef.current.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
    oscsRef.current = [];
    notesRef.current.forEach(n => n.stop());
    notesRef.current = [];
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsRunning(false);
  }, []);

  const scheduleRiff = useCallback((ctx: AudioContext) => {
    if (!runningRef.current) return;

    const bpm = bpmRef.current;
    const beatDur = 60 / bpm;
    let time = ctx.currentTime + 0.05;

    // Click on beat 1
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(1500, time);
    clickGain.gain.setValueAtTime(0.3, time);
    clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
    click.connect(clickGain); clickGain.connect(masterRef.current ?? ctx.destination);
    click.start(time); click.stop(time + 0.04);

    const buffer = pluckBufferRef.current;
    if (buffer) {
      selectedRiff.notes.forEach((note, idx) => {
        const freq = fretToFrequency(note.string, note.fret);
        const dur = note.duration * beatDur;
        const isAccent = idx === 0 || idx % 4 === 0;
        const velocity = isAccent ? 0.74 : 0.6;
        const handle = playPluckedNote(ctx, buffer, freq, time, dur, velocity);
        notesRef.current.push(handle);
        time += dur;
      });
    }

    const totalMs = (time - ctx.currentTime) * 1000 + 200; // small gap between reps

    const t = window.setTimeout(() => {
      if (!runningRef.current) return;

      repRef.current++;
      const rep = repRef.current;
      setCurrentRep(rep);

      if (rep >= repsPerStep) {
        // Advance BPM
        repRef.current = 0;
        setCurrentRep(0);
        const nextBpm = bpmRef.current + bpmStep;
        if (nextBpm > targetBpm) {
          // Done!
          setCompleted(true);
          stop();
          // Victory sound
          const victoryOsc = ctx.createOscillator();
          const vGain = ctx.createGain();
          victoryOsc.type = 'sine';
          victoryOsc.frequency.setValueAtTime(523, ctx.currentTime);
          victoryOsc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
          victoryOsc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
          vGain.gain.setValueAtTime(0.3, ctx.currentTime);
          vGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          victoryOsc.connect(vGain); vGain.connect(masterRef.current ?? ctx.destination);
          victoryOsc.start(ctx.currentTime); victoryOsc.stop(ctx.currentTime + 0.5);
          return;
        }
        bpmRef.current = nextBpm;
        setCurrentBpm(nextBpm);

        // BPM-up chime
        const chime = ctx.createOscillator();
        const cGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(880, ctx.currentTime);
        cGain.gain.setValueAtTime(0.2, ctx.currentTime);
        cGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        chime.connect(cGain); cGain.connect(masterRef.current ?? ctx.destination);
        chime.start(ctx.currentTime); chime.stop(ctx.currentTime + 0.15);
      }

      scheduleRiff(ctx);
    }, totalMs);
    timeoutsRef.current.push(t);
  }, [selectedRiff, bpmStep, repsPerStep, targetBpm, stop]);

  const start = useCallback(async () => {
    stop();
    setCompleted(false);
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
      releaseCtxRef.current = registerAudioContext(ctxRef.current);
      const { master, release } = createMasterGain(ctxRef.current);
      masterRef.current = master;
      releaseMasterRef.current = release;
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    if (!pluckBufferRef.current) {
      pluckBufferRef.current = await ensurePluckBuffer(ctx);
    }

    bpmRef.current = startBpm;
    repRef.current = 0;
    setCurrentBpm(startBpm);
    setCurrentRep(0);
    runningRef.current = true;
    setIsRunning(true);

    // 4-beat count-in
    const beatDur = 60 / startBpm;
    for (let i = 0; i < 4; i++) {
      const t = ctx.currentTime + i * beatDur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 1500 : 1000, t);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
      osc.connect(gain); gain.connect(masterRef.current ?? ctx.destination);
      osc.start(t); osc.stop(t + 0.06);
    }

    const tt = window.setTimeout(() => {
      if (runningRef.current) scheduleRiff(ctx);
    }, 4 * beatDur * 1000);
    timeoutsRef.current.push(tt);
  }, [startBpm, stop, scheduleRiff]);

  const reset = useCallback(() => {
    stop();
    setCurrentBpm(startBpm);
    setCurrentRep(0);
    setCompleted(false);
  }, [stop, startBpm]);

  useEffect(() => () => {
    stop();
    releaseMasterRef.current?.();
    releaseCtxRef.current?.();
    masterRef.current = null;
    releaseMasterRef.current = null;
    releaseCtxRef.current = null;
    ctxRef.current?.close().catch(() => { /* ignore */ });
    ctxRef.current = null;
  }, [stop]);

  return (
    <div className="space-y-5">
      {/* Riff selector */}
      <div>
        <span className="text-xs text-muted-foreground mb-1 block font-display uppercase tracking-wider">Practice Riff</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {RIFFS.map((riff) => {
            const selected = selectedRiff.name === riff.name;
            return (
              <motion.button
                key={riff.name}
                onClick={() => { setSelectedRiff(riff); if (isRunning) stop(); }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`relative text-left px-3 py-2.5 rounded-lg text-xs overflow-hidden transition-all ${
                  selected
                    ? 'bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-[0_4px_18px_rgba(45,212,191,0.35)] border border-primary'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 hover:bg-secondary/70'
                }`}
              >
                <div className="font-display font-semibold truncate">{riff.name}</div>
                <div className="text-[10px] opacity-70">{riff.artist} · {riff.bpm} BPM</div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Start BPM</label>
            <div className="flex items-center gap-2">
              <Slider value={[startBpm]} onValueChange={([v]) => { setStartBpm(v); if (!isRunning) setCurrentBpm(v); }} min={30} max={200} className="flex-1" />
              <span className="text-sm font-mono font-bold text-primary w-10 text-right">{startBpm}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Target BPM</label>
            <div className="flex items-center gap-2">
              <Slider value={[targetBpm]} onValueChange={([v]) => setTargetBpm(v)} min={60} max={300} className="flex-1" />
              <span className="text-sm font-mono font-bold text-accent w-10 text-right">{targetBpm}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">BPM Increase</label>
            <div className="flex items-center gap-2">
              <Slider value={[bpmStep]} onValueChange={([v]) => setBpmStep(v)} min={1} max={20} className="flex-1" />
              <span className="text-sm font-mono text-muted-foreground w-10 text-right">+{bpmStep}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Reps per Step</label>
            <div className="flex items-center gap-2">
              <Slider value={[repsPerStep]} onValueChange={([v]) => setRepsPerStep(v)} min={1} max={8} className="flex-1" />
              <span className="text-sm font-mono text-muted-foreground w-10 text-right">×{repsPerStep}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress display */}
      <div className="bg-gradient-to-br from-card to-card/60 rounded-xl border border-border/80 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 transition-colors ${isRunning ? 'text-primary' : 'text-muted-foreground'}`} />
            <motion.span
              key={currentBpm}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className="text-2xl font-display font-black text-foreground tabular-nums"
            >
              {currentBpm}
              <span className="text-xs text-muted-foreground font-normal ml-1">BPM</span>
            </motion.span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Rep <span className="text-foreground font-bold">{currentRep + (isRunning ? 1 : 0)}/{repsPerStep}</span> → {targetBpm} BPM
          </span>
        </div>

        {/* Custom animated progress bar — gradient with shimmer */}
        <div className="relative h-3 bg-secondary/40 rounded-full overflow-hidden border border-border/40">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-cyan-400 to-accent rounded-full shadow-[0_0_12px_hsl(var(--primary))]"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          />
          {/* Shimmer overlay */}
          {isRunning && (
            <motion.div
              className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-50%', '500%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>{startBpm} BPM</span>
          <span className="text-primary font-bold">{Math.round(progress)}%</span>
          <span>{targetBpm} BPM</span>
        </div>

        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="text-center py-2"
            >
              <span className="text-xl font-display font-black bg-gradient-to-r from-primary via-amber-400 to-accent bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]">
                🎉 TARGET REACHED!
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        <Button onClick={reset} variant="outline" size="sm" className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
        <Button
          onClick={isRunning ? stop : start}
          variant={isRunning ? 'destructive' : 'default'}
          size="lg"
          className="gap-2 px-8"
        >
          {isRunning ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isRunning ? 'Stop' : 'Start Training'}
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        4-beat count-in • Riff repeats {repsPerStep}× then speeds up by {bpmStep} BPM • Chime on each speed increase
      </p>
    </div>
  );
}
