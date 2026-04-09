import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RHYTHM_PATTERNS, type RhythmPattern } from '@/lib/musicTheory';

function synthDrum(ctx: AudioContext, type: 'kick' | 'snare' | 'hihat' | 'hihatOpen', time: number) {
  if (type === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
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
    noiseGain.connect(ctx.destination);
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
    oscGain.connect(ctx.destination);
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
    gain.connect(ctx.destination);
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
  const timerRef = useRef<number | null>(null);
  const nextBeatTimeRef = useRef(0);
  const beatIdxRef = useRef(0);

  const stopPlaying = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  const startPlaying = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    stopPlaying();
    setIsPlaying(true);
    beatIdxRef.current = 0;

    const beatDuration = 60 / bpm;
    const pattern = selectedPattern;

    // Schedule ahead approach
    const scheduleAhead = 0.1;
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    let loopStart = nextBeatTimeRef.current;

    const scheduler = () => {
      while (nextBeatTimeRef.current < ctx.currentTime + scheduleAhead) {
        const beatPos = beatIdxRef.current;
        const beatInPattern = beatPos % pattern.beats;

        // Find hits at this subdivision
        // We quantize to 16th notes (0.25 beat resolution)
        const subDiv = 16; // check 16 subdivisions per beat
        for (let s = 0; s < subDiv; s++) {
          const subBeatTime = s / subDiv;
          const absTime = beatInPattern + subBeatTime;
          pattern.hits.forEach(hit => {
            if (Math.abs(hit.time - absTime) < 0.01) {
              synthDrum(ctx, hit.type, loopStart + absTime * beatDuration);
            }
          });
        }

        // Only advance whole beats for the visual
        setCurrentBeat(beatInPattern);
        nextBeatTimeRef.current += beatDuration;
        beatIdxRef.current++;

        // Reset loop
        if (beatIdxRef.current % pattern.beats === 0) {
          loopStart = nextBeatTimeRef.current;
        }
      }
    };

    // Initial schedule of full pattern
    const fullPatternDur = pattern.beats * beatDuration;
    const scheduleFullPattern = (startTime: number) => {
      pattern.hits.forEach(hit => {
        synthDrum(ctx, hit.type, startTime + hit.time * beatDuration);
      });
    };

    // Use a simpler loop-based approach
    let loopCount = 0;
    const scheduleLoop = () => {
      const startTime = ctx.currentTime + 0.05 + loopCount * fullPatternDur;
      scheduleFullPattern(startTime);
      loopCount++;
    };

    scheduleLoop();

    let beatTracker = 0;
    timerRef.current = window.setInterval(() => {
      const elapsed = ctx.currentTime - (ctx.currentTime - (loopCount - 1) * fullPatternDur);
      setCurrentBeat(beatTracker % pattern.beats);
      beatTracker++;

      // Schedule next loop when we're near the end
      const nextLoopTime = 0.05 + loopCount * fullPatternDur;
      if (ctx.currentTime > nextLoopTime - fullPatternDur * 0.5) {
        scheduleLoop();
      }
    }, beatDuration * 1000);
  }, [bpm, selectedPattern, stopPlaying]);

  useEffect(() => () => stopPlaying(), [stopPlaying]);

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
