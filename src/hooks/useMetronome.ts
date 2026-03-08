import { useState, useRef, useCallback, useEffect } from 'react';
import { useBpmSync } from './useBpmSync';

export function useMetronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { bpm, setBpm } = useBpmSync();
  const [beat, setBeat] = useState(0);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  const scheduleNote = useCallback((time: number, beatNum: number) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    osc.frequency.value = beatNum === 0 ? 1000 : 800;
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    const scheduleAheadTime = 0.1;
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + scheduleAheadTime) {
      scheduleNote(nextNoteTimeRef.current, currentBeatRef.current);
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTimeRef.current += secondsPerBeat;
      currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerMeasure;
      setBeat(currentBeatRef.current);
    }
    timerIdRef.current = window.setTimeout(scheduler, 25);
  }, [bpm, beatsPerMeasure, scheduleNote]);

  const start = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    currentBeatRef.current = 0;
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
    setBeat(0);
  }, []);

  const tapTempo = useCallback(() => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const last = tapTimesRef.current[tapTimesRef.current.length - 2];
      if (now - last > 2000) {
        tapTimesRef.current = [now];
        return;
      }
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avg);
      if (newBpm >= 30 && newBpm <= 300) setBpm(newBpm);
    }
  }, [setBpm]);

  useEffect(() => {
    return () => { if (timerIdRef.current) clearTimeout(timerIdRef.current); };
  }, []);

  return { isPlaying, bpm, beat, beatsPerMeasure, setBpm, setBeatsPerMeasure, start, stop, tapTempo };
}
