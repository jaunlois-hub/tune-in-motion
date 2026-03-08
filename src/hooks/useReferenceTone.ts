import { useState, useRef, useCallback } from 'react';

export function useReferenceTone() {
  const [playingFrequency, setPlayingFrequency] = useState<number | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const play = useCallback((frequency: number) => {
    stop();

    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.connect(ctx.destination);
    gainNodeRef.current = gain;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.connect(gain);
    osc.start();
    oscillatorRef.current = osc;

    setPlayingFrequency(frequency);
  }, []);

  const stop = useCallback(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      try {
        gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.05);
      } catch {}
    }
    setTimeout(() => {
      oscillatorRef.current?.stop();
      oscillatorRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    }, 60);
    setPlayingFrequency(null);
  }, []);

  const toggle = useCallback((frequency: number) => {
    if (playingFrequency === frequency) {
      stop();
    } else {
      play(frequency);
    }
  }, [playingFrequency, play, stop]);

  return { playingFrequency, toggle, stop };
}
