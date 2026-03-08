import { useState, useRef, useCallback, useEffect } from 'react';
import { useMasterVolume } from './useMasterVolume';
import { useBpmSync } from './useBpmSync';

// 16-step patterns: [kick[], snare[], hihat[], openHat[], tom[], rimshot[]]
// Velocity values: 0 = off, 0.1-1.0 = velocity
export interface DrumPattern {
  name: string;
  steps: number;
  pattern: number[][]; // [instrument][step] — 0 = off, >0 = velocity
}

// Helper: convert boolean-like shorthand to velocity arrays
const v = (arr: (0 | 1 | 2 | 3)[]): number[] =>
  arr.map(x => x === 0 ? 0 : x === 1 ? 0.7 : x === 2 ? 1 : 0.4);

export const DRUM_PATTERNS: Record<string, DrumPattern> = {
  rock: {
    name: 'Rock',
    steps: 16,
    pattern: [
      // kick:    1 . . . . . . . 1 . 1 . . . . .
      v([2,0,0,0,0,0,0,0,2,0,1,0,0,0,0,0]),
      // snare:   . . . . 2 . . . . . . . 2 . . .
      v([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
      // hihat:   1 . 1 . 1 . 1 . 1 . 1 . 1 . 1 .
      v([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]),
      // openHat: . . . . . . . . . . . . . . . 1
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]),
      // tom:     all off
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      // rimshot: all off
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
    ],
  },
  blues: {
    name: 'Blues Shuffle',
    steps: 16,
    pattern: [
      v([2,0,0,0,0,0,1,0,2,0,0,0,0,0,1,0]),
      v([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,3]),
      v([1,0,3,1,0,3,1,0,3,1,0,3,1,0,3,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,3]),
    ],
  },
  funk: {
    name: 'Funk',
    steps: 16,
    pattern: [
      v([2,0,0,1,0,0,0,0,0,0,2,0,0,1,0,0]),
      v([0,0,0,0,2,0,0,1,0,0,0,0,2,0,0,0]),
      v([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,3,0,0,0,3,0,0,0,0,0,3]),
    ],
  },
  jazz: {
    name: 'Jazz Ride',
    steps: 16,
    pattern: [
      v([1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,3]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      // ride pattern (reusing rimshot slot as ride)
      v([2,0,3,1,0,3,2,0,3,1,0,3,2,0,3,1]),
    ],
  },
  metal: {
    name: 'Metal',
    steps: 16,
    pattern: [
      v([2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]),
      v([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
      v([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
    ],
  },
  reggae: {
    name: 'Reggae',
    steps: 16,
    pattern: [
      v([0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,0]),
      v([0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0]),
      v([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1]),
    ],
  },
  hiphop: {
    name: 'Hip-Hop',
    steps: 16,
    pattern: [
      v([2,0,0,0,0,0,0,1,0,0,2,0,0,0,0,0]),
      v([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
      v([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
    ],
  },
  bossanova: {
    name: 'Bossa Nova',
    steps: 16,
    pattern: [
      v([2,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0]),
    ],
  },
  dnb: {
    name: 'Drum & Bass',
    steps: 16,
    pattern: [
      v([2,0,0,0,0,0,0,0,0,0,2,0,0,1,0,0]),
      v([0,0,0,0,2,0,0,1,0,0,0,0,0,0,2,0]),
      v([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
    ],
  },
  latin: {
    name: 'Latin',
    steps: 16,
    pattern: [
      v([2,0,0,1,0,0,2,0,0,1,0,0,2,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1]),
      v([1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0]),
    ],
  },
  country: {
    name: 'Country Train',
    steps: 16,
    pattern: [
      v([2,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0]),
      v([0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]),
      v([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
    ],
  },
  halfTime: {
    name: 'Half-Time',
    steps: 16,
    pattern: [
      v([2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0]),
      v([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
      v([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
    ],
  },
};

// ── Improved Drum Synthesis ────────────────────

function playKick(ctx: AudioContext, dest: AudioNode, time: number, vel: number) {
  // Sub body
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(dest);
  osc.frequency.setValueAtTime(180 * vel + 40, time);
  osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
  gain.gain.setValueAtTime(vel * 1.3, time);
  gain.gain.setValueAtTime(vel * 1.3, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc.start(time);
  osc.stop(time + 0.4);

  // Click transient
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = 'triangle';
  click.connect(clickGain);
  clickGain.connect(dest);
  click.frequency.setValueAtTime(1200, time);
  click.frequency.exponentialRampToValueAtTime(60, time + 0.025);
  clickGain.gain.setValueAtTime(vel * 0.8, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  click.start(time);
  click.stop(time + 0.04);

  // Punch (noise burst)
  const bufSize = Math.floor(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const noise = ctx.createBufferSource();
  const nGain = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  noise.buffer = buf;
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  noise.connect(lp);
  lp.connect(nGain);
  nGain.connect(dest);
  nGain.gain.setValueAtTime(vel * 0.4, time);
  nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  noise.start(time);
  noise.stop(time + 0.03);
}

function playSnare(ctx: AudioContext, dest: AudioNode, time: number, vel: number) {
  // Noise layer
  const bufferSize = Math.floor(ctx.sampleRate * 0.2);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  const hp = ctx.createBiquadFilter();
  noise.buffer = buffer;
  bp.type = 'bandpass';
  bp.frequency.value = 4000;
  bp.Q.value = 0.6;
  hp.type = 'highpass';
  hp.frequency.value = 1200;
  noise.connect(bp);
  bp.connect(hp);
  hp.connect(noiseGain);
  noiseGain.connect(dest);
  noiseGain.gain.setValueAtTime(vel * 0.8, time);
  noiseGain.gain.setValueAtTime(vel * 0.8, time + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  noise.start(time);
  noise.stop(time + 0.2);

  // Body tone
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.frequency.setValueAtTime(280, time);
  osc.frequency.exponentialRampToValueAtTime(130, time + 0.05);
  oscGain.gain.setValueAtTime(vel * 0.6, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
  osc.start(time);
  osc.stop(time + 0.1);

  // Snap transient
  const snap = ctx.createOscillator();
  const snapGain = ctx.createGain();
  snap.type = 'sine';
  snap.connect(snapGain);
  snapGain.connect(dest);
  snap.frequency.setValueAtTime(1800, time);
  snap.frequency.exponentialRampToValueAtTime(600, time + 0.01);
  snapGain.gain.setValueAtTime(vel * 0.3, time);
  snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
  snap.start(time);
  snap.stop(time + 0.02);
}

function playHihat(ctx: AudioContext, dest: AudioNode, time: number, vel: number) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
  const noise = ctx.createBufferSource();
  const gain = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  const bp = ctx.createBiquadFilter();
  noise.buffer = buffer;
  hp.type = 'highpass';
  hp.frequency.value = 9000;
  bp.type = 'bandpass';
  bp.frequency.value = 11000;
  bp.Q.value = 1.2;
  noise.connect(hp);
  hp.connect(bp);
  bp.connect(gain);
  gain.connect(dest);
  gain.gain.setValueAtTime(vel * 0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  noise.start(time);
  noise.stop(time + 0.06);

  // Metallic shimmer
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'square';
  osc.connect(oscGain);
  oscGain.connect(dest);
  osc.frequency.setValueAtTime(6200, time);
  oscGain.gain.setValueAtTime(vel * 0.04, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  osc.start(time);
  osc.stop(time + 0.025);
}

function playOpenHat(ctx: AudioContext, dest: AudioNode, time: number, vel: number) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
  const noise = ctx.createBufferSource();
  const gain = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  noise.buffer = buffer;
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  noise.connect(hp);
  hp.connect(gain);
  gain.connect(dest);
  gain.gain.setValueAtTime(vel * 0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  noise.start(time);
  noise.stop(time + 0.28);
}

function playTom(ctx: AudioContext, dest: AudioNode, time: number, vel: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(dest);
  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);
  gain.gain.setValueAtTime(vel * 1.0, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.start(time);
  osc.stop(time + 0.3);

  // Attack noise
  const bSize = Math.floor(ctx.sampleRate * 0.02);
  const buf = ctx.createBuffer(1, bSize, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bSize);
  const n = ctx.createBufferSource();
  const ng = ctx.createGain();
  n.buffer = buf;
  n.connect(ng);
  ng.connect(dest);
  ng.gain.setValueAtTime(vel * 0.3, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  n.start(time);
  n.stop(time + 0.035);
}

function playRimshot(ctx: AudioContext, dest: AudioNode, time: number, vel: number) {
  // High pitched click
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.connect(gain);
  gain.connect(dest);
  osc.frequency.setValueAtTime(1700, time);
  osc.frequency.exponentialRampToValueAtTime(400, time + 0.01);
  gain.gain.setValueAtTime(vel * 0.6, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  osc.start(time);
  osc.stop(time + 0.065);

  // Stick noise
  const bSize = Math.floor(ctx.sampleRate * 0.015);
  const buf = ctx.createBuffer(1, bSize, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bSize);
  const n = ctx.createBufferSource();
  const ng = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  n.buffer = buf;
  bp.type = 'bandpass';
  bp.frequency.value = 3000;
  bp.Q.value = 2;
  n.connect(bp);
  bp.connect(ng);
  ng.connect(dest);
  ng.gain.setValueAtTime(vel * 0.5, time);
  ng.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
  n.start(time);
  n.stop(time + 0.045);
}

const INSTRUMENTS = [playKick, playSnare, playHihat, playOpenHat, playTom, playRimshot] as const;

export function useDrumMachine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPattern, setCurrentPattern] = useState('rock');
  const [currentStep, setCurrentStep] = useState(0);
  const [swing, setSwing] = useState(0); // 0-1
  const [localVolume, setLocalVolume] = useState(0.7);
  const { masterVolume } = useMasterVolume();
  const { bpm } = useBpmSync();
  const audioContextRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const currentStepRef = useRef(0);
  const swingRef = useRef(swing);
  const effectiveVolume = localVolume * masterVolume;

  // Keep swing ref in sync
  useEffect(() => { swingRef.current = swing; }, [swing]);

  const getDestination = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return null;
    if (!compressorRef.current) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 6;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      comp.connect(ctx.destination);
      compressorRef.current = comp;
    }
    return compressorRef.current;
  }, []);

  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const dest = getDestination();
    if (!dest) return;
    const pattern = DRUM_PATTERNS[currentPattern];
    const stepCount = pattern.steps;
    const sixteenthDuration = 60.0 / bpm / 4;

    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      const step = currentStepRef.current % stepCount;

      // Apply swing to odd 16th notes
      let swingOffset = 0;
      if (step % 2 === 1) {
        swingOffset = swingRef.current * sixteenthDuration * 0.5;
      }
      const noteTime = nextNoteTimeRef.current + swingOffset;

      // Play each instrument at this step
      for (let i = 0; i < pattern.pattern.length; i++) {
        const vel = pattern.pattern[i][step];
        if (vel > 0) {
          INSTRUMENTS[i](ctx, dest, noteTime, vel * effectiveVolume);
        }
      }

      nextNoteTimeRef.current += sixteenthDuration;
      currentStepRef.current = (currentStepRef.current + 1) % stepCount;
      setCurrentStep(currentStepRef.current);
    }
    timerIdRef.current = window.setTimeout(scheduler, 20);
  }, [currentPattern, bpm, effectiveVolume, getDestination]);

  const start = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    currentStepRef.current = 0;
    nextNoteTimeRef.current = audioContextRef.current.currentTime;
    setIsPlaying(true);
    scheduler();
  }, [scheduler]);

  const stop = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
    };
  }, []);

  return {
    isPlaying,
    currentPattern,
    currentStep,
    volume: localVolume,
    bpm,
    swing,
    patterns: DRUM_PATTERNS,
    setCurrentPattern,
    setVolume: setLocalVolume,
    setSwing,
    start,
    stop,
  };
}
