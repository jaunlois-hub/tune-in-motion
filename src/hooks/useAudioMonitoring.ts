import { useState, useRef, useCallback } from 'react';

export function useAudioMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorVolume, setMonitorVolume] = useState(0.7);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const gain = ctx.createGain();
      gain.gain.value = monitorVolume;
      gainNodeRef.current = gain;

      source.connect(gain);
      gain.connect(ctx.destination);

      setIsMonitoring(true);
    } catch {
      console.error('Failed to start audio monitoring');
    }
  }, [monitorVolume]);

  const stopMonitoring = useCallback(() => {
    sourceRef.current?.disconnect();
    gainNodeRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    sourceRef.current = null;
    gainNodeRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    setIsMonitoring(false);
  }, []);

  const updateVolume = useCallback((vol: number) => {
    setMonitorVolume(vol);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = vol;
    }
  }, []);

  return { isMonitoring, monitorVolume, startMonitoring, stopMonitoring, updateVolume };
}
