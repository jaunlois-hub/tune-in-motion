import { useState, useRef, useCallback, useEffect } from 'react';
import { getSharedAudioContextSync } from '@/lib/sharedAudioContext';
import { Play, Square, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RHYTHM_PATTERNS, type RhythmPattern } from '@/lib/musicTheory';
import { createMasterGain } from '@/hooks/useMasterVolume';

function synthDrum(ctx: AudioContext, dest: AudioNode, type: 'kick' | 'snare' | 'hihat' | 'hihatOpen', time: number) {
  if (type === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.3);
  } else if (type === 'snare') {
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(time);
    noise.stop(time + 0.15);
    // Body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.1);
  } else {
    // Hi-hat
    const bufferSize = ctx.sampleRate * (type === 'hihatOpen' ? 0.2 : 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    const dur = type === 'hihatOpen' ? 0.2 : 0.05;
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    noise.start(time);
    noise.stop(time + dur + 0.01);
  }
}

export function RhythmPatterns() {
  const [selectedPattern, setSelectedPattern] = useState<RhythmPattern>(RHYTHM_PATTERNS[0]);
  const [bpm, setBpm] = useState(RHYTHM_PATTERNS[0].bpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextLoopStartRef = useRef(0);
  const loopIdxRef = useRef(0);

  const stopPlaying = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  const startPlaying = useCallback(async () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = getSharedAudioContextSync();
      ctxRef.current = ctx;
      const { master, release } = createMasterGain(ctx);
      masterRef.current = master;
      releaseMasterRef.current = release;
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch((err) => console.warn('AudioContext resume failed', err));
    }

    stopPlaying();
    setIsPlaying(true);

    const beatDuration = 60 / bpm;
    const pattern = selectedPattern;
    const fullPatternDur = pattern.beats * beatDuration;
    const dest = masterRef.current ?? ctx.destination;

    // Lookahead scheduler: schedule one full pattern at a time, ~0.25s ahead
    // of the audio clock, and advance the visual beat based on ctx.currentTime
    // (not setInterval drift). This was previously broken — the old impl
    // computed `elapsed` as `ctx.currentTime - (ctx.currentTime - ...)` which
    // is always a constant, so the loop never re-scheduled correctly.
    nextLoopStartRef.current = ctx.currentTime + 0.1;
    loopIdxRef.current = 0;
    const startBaseline = nextLoopStartRef.current;

    const scheduleLoopAt = (startTime: number) => {
      pattern.hits.forEach((hit) => {
        synthDrum(ctx, dest, hit.type, startTime + hit.time * beatDuration);
      });
    };

    // Always have at least one loop scheduled in advance.
    scheduleLoopAt(nextLoopStartRef.current);
    nextLoopStartRef.current += fullPatternDur;
    loopIdxRef.current++;

    timerRef.current = window.setInterval(() => {
      const now = ctx.currentTime;
      // Schedule another loop if the next one starts within 0.25s.
      if (now > nextLoopStartRef.current - 0.25) {
        scheduleLoopAt(nextLoopStartRef.current);
        nextLoopStartRef.current += fullPatternDur;
        loopIdxRef.current++;
      }
      // Visual beat from audio clock so it never drifts.
      const elapsed = now - startBaseline;
      if (elapsed >= 0) {
        const beatInPattern = Math.floor(elapsed / beatDuration) % pattern.beats;
        setCurrentBeat(beatInPattern);
      }
    }, 25);
  }, [bpm, selectedPattern, stopPlaying]);

  useEffect(() => {
    return () => {
      stopPlaying();
      releaseMasterRef.current?.();
      releaseMasterRef.current = null;
      masterRef.current = null;
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch((err) => console.warn('AudioContext close failed', err));
      }
      ctxRef.current = null;
    };
  }, [stopPlaying]);

  const handlePatternChange = (p: RhythmPattern) => {
    setSelectedPattern(p);
    setBpm(p.bpm);
    if (isPlaying) stopPlaying();
  };

  // Visual beat grid
  const gridCols = selectedPattern.beats * 4; // 16th note resolution
  const hitGrid: Record<string, boolean[]> = { kick: [], snare: [], hihat: [] };
  ['kick', 'snare', 'hihat'].forEach(type => {
    for (let i = 0; i < gridCols; i++) {
      const beatPos = i / 4;
      hitGrid[type].push(selectedPattern.hits.some(h => h.type.startsWith(type) && Math.abs(h.time - beatPos) < 0.02));
    }
  });

  return (
    <div className="space-y-5">
      {/* Pattern selector */}
      <div className="flex flex-wrap gap-1.5">
        {RHYTHM_PATTERNS.map((p) => (
          <button
            key={p.name}
            onClick={() => handlePatternChange(p)}
            className={`px-2.5 py-1.5 rounded-full text-xs font-display transition-all ${
              selectedPattern.name === p.name
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* BPM control */}
      <div className="flex items-center gap-4 bg-secondary/30 rounded-xl border border-border p-3">
        <button onClick={() => setBpm(b => Math.max(30, b - 5))} className="text-muted-foreground hover:text-foreground">
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={30} max={300} />
        </div>
        <button onClick={() => setBpm(b => Math.min(300, b + 5))} className="text-muted-foreground hover:text-foreground">
          <Plus className="w-4 h-4" />
        </button>
        <span className="text-lg font-mono font-bold text-primary w-16 text-right">{bpm}</span>
        <span className="text-xs text-muted-foreground">BPM</span>
      </div>

      {/* Beat grid */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2 overflow-x-auto">
        <div className="min-w-[300px]">
          {(['kick', 'snare', 'hihat'] as const).map((type) => (
            <div key={type} className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-muted-foreground w-10 text-right font-mono">
                {type === 'kick' ? 'KCK' : type === 'snare' ? 'SNR' : 'HH'}
              </span>
              <div className="flex gap-0.5 flex-1">
                {hitGrid[type].map((active, i) => {
                  const beatNum = Math.floor(i / 4);
                  const isBeatStart = i % 4 === 0;
                  return (
                    <div
                      key={i}
                      className={`h-6 flex-1 rounded-sm transition-all ${
                        active
                          ? currentBeat === beatNum
                            ? 'bg-primary shadow-md shadow-primary/30'
                            : 'bg-primary/60'
                          : isBeatStart
                          ? 'bg-secondary/80'
                          : 'bg-secondary/30'
                      } ${currentBeat === beatNum ? 'ring-1 ring-primary/30' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Beat numbers */}
        <div className="flex items-center gap-1 min-w-[300px]">
          <span className="w-10" />
          <div className="flex gap-0.5 flex-1">
            {Array.from({ length: gridCols }).map((_, i) => (
              <div key={i} className="flex-1 text-center">
                {i % 4 === 0 && (
                  <span className="text-[9px] text-muted-foreground">{Math.floor(i / 4) + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Play/Stop */}
      <div className="flex justify-center">
        <Button
          onClick={isPlaying ? stopPlaying : startPlaying}
          size="lg"
          variant={isPlaying ? 'destructive' : 'default'}
          className="gap-2 px-8"
        >
          {isPlaying ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isPlaying ? 'Stop' : 'Play Pattern'}
        </Button>
      </div>

      {/* Pattern info */}
      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        <span>Time: {selectedPattern.timeSignature}</span>
        <span>Default: {selectedPattern.bpm} BPM</span>
      </div>
    </div>
  );
}
