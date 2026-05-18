import { useState, useRef, useCallback, useEffect } from 'react';
import { getSharedAudioContextSync } from '@/lib/sharedAudioContext';
import { useAudioDucking } from './useAudioDucking';
import { createMasterGain } from './useMasterVolume';
import { withAudioFeature } from '@/lib/audioDiagnostics';

export function useReferenceTone() {
  const [playingFrequency, setPlayingFrequency] = useState<number | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);
  const durationTimeoutRef = useRef<number | null>(null);
  const duckActiveRef = useRef(false);

  const pushDuck = useCallback(() => {
    if (duckActiveRef.current) return;
    duckActiveRef.current = true;
    useAudioDucking.getState().push();
  }, []);

  const popDuck = useCallback(() => {
    if (!duckActiveRef.current) return;
    duckActiveRef.current = false;
    useAudioDucking.getState().pop();
  }, []);

  const getContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const ctx = getSharedAudioContextSync();
      audioContextRef.current = ctx;
      const { master, release } = createMasterGain(ctx);
      masterGainRef.current = master;
      releaseMasterRef.current = release;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch((err) => console.warn('AudioContext resume failed', err));
    }
    return audioContextRef.current;
  }, []);

  const stopOscillator = useCallback(() => {
    if (durationTimeoutRef.current) {
      clearTimeout(durationTimeoutRef.current);
      durationTimeoutRef.current = null;
    }
    if (gainNodeRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
        gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioContextRef.current.currentTime);
        gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.03);
      } catch (err) {
        console.warn('Reference tone gain ramp failed', err);
      }
    }
    const osc = oscillatorRef.current;
    oscillatorRef.current = null;
    gainNodeRef.current = null;
    if (osc) {
      setTimeout(() => {
        try { osc.stop(); } catch (err) { console.warn('Oscillator stop failed', err); }
      }, 40);
    }
  }, []);

  const play = useCallback((frequency: number) => {
    stopOscillator();

    const ctx = getContext();
    withAudioFeature('reference-tone', () => {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.connect(masterGainRef.current ?? ctx.destination);
      gainNodeRef.current = gain;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      oscillatorRef.current = osc;
    });

    setPlayingFrequency(frequency);
    pushDuck();
  }, [stopOscillator, getContext, pushDuck]);

  const stop = useCallback(() => {
    stopOscillator();
    setPlayingFrequency(null);
    popDuck();
  }, [stopOscillator, popDuck]);

  const playForDuration = useCallback((frequency: number, ms: number) => {
    stopOscillator();

    const ctx = getContext();
    const gain = ctx.createGain();
    const durSec = ms / 1000;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + durSec - 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durSec);
    gain.connect(masterGainRef.current ?? ctx.destination);
    gainNodeRef.current = gain;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + durSec + 0.05);
    oscillatorRef.current = osc;

    setPlayingFrequency(frequency);
    pushDuck();

    durationTimeoutRef.current = window.setTimeout(() => {
      oscillatorRef.current = null;
      gainNodeRef.current = null;
      setPlayingFrequency(null);
      popDuck();
    }, ms + 50);
  }, [stopOscillator, getContext, pushDuck, popDuck]);

  const toggle = useCallback((frequency: number) => {
    if (playingFrequency === frequency) {
      stop();
    } else {
      play(frequency);
    }
  }, [playingFrequency, play, stop]);

  // If unmounted while ducking, release the ducking handle.
  // Also tear down the AudioContext so we don't leak one per session
  // (browsers cap concurrent contexts and silently fail past the limit).
  useEffect(() => () => {
    popDuck();
    if (durationTimeoutRef.current) {
      clearTimeout(durationTimeoutRef.current);
      durationTimeoutRef.current = null;
    }
    try { oscillatorRef.current?.stop(); } catch { /* already stopped */ }
    oscillatorRef.current = null;
    gainNodeRef.current = null;
    releaseMasterRef.current?.();
    releaseMasterRef.current = null;
    masterGainRef.current = null;
    audioContextRef.current = null;
  }, [popDuck]);

  return { playingFrequency, toggle, stop, playForDuration };
}
