import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, TrendingUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { RIFFS, fretToFrequency, type Riff } from '@/lib/musicTheory';

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
  const timeoutsRef = useRef<number[]>([]);
  const runningRef = useRef(false);
  const bpmRef = useRef(startBpm);
  const repRef = useRef(0);

  const progress = targetBpm > startBpm
    ? Math.min(100, ((currentBpm - startBpm) / (targetBpm - startBpm)) * 100)
    : 0;

  const stop = useCallback(() => {
    runningRef.current = false;
    oscsRef.current.forEach(o => { try { o.stop(); } catch {} });
    oscsRef.current = [];
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
    click.connect(clickGain); clickGain.connect(ctx.destination);
    click.start(time); click.stop(time + 0.04);

    selectedRiff.notes.forEach((note) => {
      const freq = fretToFrequency(note.string, note.fret);
      const dur = note.duration * beatDur;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.01);
      gain.gain.setValueAtTime(0.18, time + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, time + dur);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, time);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + dur + 0.05);
      oscsRef.current.push(osc);
      time += dur;
    });

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
          victoryOsc.connect(vGain); vGain.connect(ctx.destination);
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
        chime.connect(cGain); cGain.connect(ctx.destination);
        chime.start(ctx.currentTime); chime.stop(ctx.currentTime + 0.15);
      }

      scheduleRiff(ctx);
    }, totalMs);
    timeoutsRef.current.push(t);
  }, [selectedRiff, bpmStep, repsPerStep, targetBpm, stop]);

  const start = useCallback(() => {
    stop();
    setCompleted(false);
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

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
      osc.connect(gain); gain.connect(ctx.destination);
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

  useEffect(() => () => stop(), [stop]);

  return (
    <div className="space-y-5">
      {/* Riff selector */}
      <div>
        <span className="text-xs text-muted-foreground mb-1 block">Practice Riff</span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {RIFFS.map((riff) => (
            <button
              key={riff.name}
              onClick={() => { setSelectedRiff(riff); if (isRunning) stop(); }}
              className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                selectedRiff.name === riff.name
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              <div className="font-display font-semibold truncate">{riff.name}</div>
              <div className="text-[10px] opacity-70">{riff.artist} • {riff.bpm} BPM</div>
            </button>
          ))}
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
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-display font-bold text-foreground">
              {currentBpm} <span className="text-xs text-muted-foreground font-normal">BPM</span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Rep {currentRep + (isRunning ? 1 : 0)}/{repsPerStep} → {targetBpm} BPM
          </span>
        </div>

        <Progress value={progress} className="h-3" />

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{startBpm} BPM</span>
          <span>{Math.round(progress)}%</span>
          <span>{targetBpm} BPM</span>
        </div>

        {completed && (
          <div className="text-center py-2">
            <span className="text-lg font-display font-black text-primary animate-pulse">
              🎉 TARGET REACHED!
            </span>
          </div>
        )}
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
