import { useState, useRef, useCallback, useEffect } from 'react';
import { useMasterVolume } from './useMasterVolume';
import { useBpmSync } from './useBpmSync';

export interface DrumPattern {
  name: string;
  pattern: boolean[][];
}

export const DRUM_PATTERNS: Record<string, DrumPattern> = {
  rock: { name: 'Rock', pattern: [[true,false,true,false,true,false,true,false],[false,false,true,false,false,false,true,false],[true,true,true,true,true,true,true,true]] },
  blues: { name: 'Blues', pattern: [[true,false,false,true,false,false,true,false],[false,false,true,false,false,true,false,false],[true,false,true,true,false,true,true,false]] },
  funk: { name: 'Funk', pattern: [[true,false,false,true,false,true,false,false],[false,false,true,false,false,false,true,false],[true,true,true,true,true,true,true,true]] },
  jazz: { name: 'Jazz', pattern: [[true,false,false,false,true,false,false,false],[false,false,true,false,false,false,true,false],[true,false,true,true,false,true,true,false]] },
  metal: { name: 'Metal', pattern: [[true,true,true,true,true,true,true,true],[false,false,true,false,false,false,true,false],[true,true,true,true,true,true,true,true]] },
  reggae: { name: 'Reggae', pattern: [[false,false,true,false,false,false,true,false],[false,false,false,true,false,false,false,true],[true,true,true,true,true,true,true,true]] },
};

function playKick(ctx: AudioContext, time: number, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(160, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
  gain.gain.setValueAtTime(vol * 1.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc.start(time); osc.stop(time + 0.3);
  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.connect(clickGain); clickGain.connect(ctx.destination);
  click.frequency.setValueAtTime(800, time);
  click.frequency.exponentialRampToValueAtTime(100, time + 0.02);
  clickGain.gain.setValueAtTime(vol * 0.6, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  click.start(time); click.stop(time + 0.03);
}

function playSnare(ctx: AudioContext, time: number, vol: number) {
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  const hp = ctx.createBiquadFilter();
  noise.buffer = buffer; bp.type = 'bandpass'; bp.frequency.value = 3500; bp.Q.value = 0.8;
  hp.type = 'highpass'; hp.frequency.value = 1500;
  noise.connect(bp); bp.connect(hp); hp.connect(noiseGain); noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(vol * 0.7, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  noise.start(time); noise.stop(time + 0.15);
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain); oscGain.connect(ctx.destination);
  osc.frequency.setValueAtTime(250, time);
  osc.frequency.exponentialRampToValueAtTime(120, time + 0.04);
  oscGain.gain.setValueAtTime(vol * 0.5, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.start(time); osc.stop(time + 0.08);
}

function playHihat(ctx: AudioContext, time: number, vol: number) {
  const bufferSize = ctx.sampleRate * 0.06;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  const noise = ctx.createBufferSource();
  const gain = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  const bp = ctx.createBiquadFilter();
  noise.buffer = buffer; hp.type = 'highpass'; hp.frequency.value = 8000;
  bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 1;
  noise.connect(hp); hp.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(vol * 0.35, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  noise.start(time); noise.stop(time + 0.06);
}

export function useDrumMachine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPattern, setCurrentPattern] = useState('rock');
  const [currentStep, setCurrentStep] = useState(0);
  const [localVolume, setLocalVolume] = useState(0.7);
  const { masterVolume } = useMasterVolume();
  const { bpm } = useBpmSync();
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const currentStepRef = useRef(0);
  const effectiveVolume = localVolume * masterVolume;

  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const pattern = DRUM_PATTERNS[currentPattern];
    const secondsPerBeat = 60.0 / bpm / 2;
    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      const step = currentStepRef.current % 8;
      if (pattern.pattern[0][step]) playKick(ctx, nextNoteTimeRef.current, effectiveVolume);
      if (pattern.pattern[1][step]) playSnare(ctx, nextNoteTimeRef.current, effectiveVolume);
      if (pattern.pattern[2][step]) playHihat(ctx, nextNoteTimeRef.current, effectiveVolume);
      nextNoteTimeRef.current += secondsPerBeat;
      currentStepRef.current = (currentStepRef.current + 1) % 8;
      setCurrentStep(currentStepRef.current);
    }
    timerIdRef.current = window.setTimeout(scheduler, 25);
  }, [currentPattern, bpm, effectiveVolume]);

  const start = useCallback(() => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    currentStepRef.current = 0;
    nextNoteTimeRef.current = audioContextRef.current.currentTime;
    setIsPlaying(true);
    scheduler();
  }, [scheduler]);

  const stop = useCallback(() => {
    if (timerIdRef.current) { clearTimeout(timerIdRef.current); timerIdRef.current = null; }
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  useEffect(() => { return () => { if (timerIdRef.current) clearTimeout(timerIdRef.current); }; }, []);

  return { isPlaying, currentPattern, currentStep, volume: localVolume, bpm, patterns: DRUM_PATTERNS, setCurrentPattern, setVolume: setLocalVolume, start, stop };
}
