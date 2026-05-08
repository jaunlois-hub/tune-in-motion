import { useEffect, useRef, useState, useCallback } from 'react';
import { applyOutputSink, buildAudioConstraints, useAudioDevicesStore } from './useAudioDevices';
import { useAudioDucking } from './useAudioDucking';
import { useTunerPrefs } from './useTunerPrefs';

export function useAudioMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitorVolume = useTunerPrefs((s) => s.monitorVolume);
  const setStoredVolume = useTunerPrefs((s) => s.setMonitorVolume);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const muteFactorRef = useRef(1);
  const monitorVolumeRef = useRef(monitorVolume);

  // Keep latest volume in a ref so duck/unduck and start can reach it without re-creating callbacks.
  useEffect(() => {
    monitorVolumeRef.current = monitorVolume;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = monitorVolume * muteFactorRef.current;
    }
  }, [monitorVolume]);

  const startMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints());
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      applyOutputSink(ctx);

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const gain = ctx.createGain();
      gain.gain.value = monitorVolumeRef.current * muteFactorRef.current;
      gainNodeRef.current = gain;

      source.connect(gain);
      gain.connect(ctx.destination);

      setIsMonitoring(true);
    } catch (err) {
      console.error('Failed to start audio monitoring', err);
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    sourceRef.current?.disconnect();
    gainNodeRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close().catch((err) => console.warn('AudioContext close failed', err));
    sourceRef.current = null;
    gainNodeRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
    setIsMonitoring(false);
  }, []);

  const updateVolume = useCallback(
    (vol: number) => {
      setStoredVolume(vol);
      // useEffect above will sync the gain node.
    },
    [setStoredVolume],
  );

  /**
   * Temporarily reduce monitor output (used to avoid feedback while a reference tone plays).
   */
  const setDuck = useCallback((duckedFactor: number) => {
    muteFactorRef.current = duckedFactor;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = monitorVolumeRef.current * duckedFactor;
    }
  }, []);

  // Duck the monitor while a reference tone (or other shared output source) is playing,
  // so feedback through the speakers doesn't fool the YIN detector.
  const duckActive = useAudioDucking((s) => s.active);
  useEffect(() => {
    setDuck(duckActive > 0 ? 0 : 1);
  }, [duckActive, setDuck]);

  // Auto-restart on input device change while running.
  const inputDeviceId = useAudioDevicesStore((s) => s.inputDeviceId);
  const lastDeviceRef = useRef(inputDeviceId);
  useEffect(() => {
    if (!isMonitoring) {
      lastDeviceRef.current = inputDeviceId;
      return;
    }
    if (lastDeviceRef.current === inputDeviceId) return;
    lastDeviceRef.current = inputDeviceId;
    stopMonitoring();
    // Wait one tick for refs to clear, then restart.
    const t = setTimeout(() => startMonitoring(), 50);
    return () => clearTimeout(t);
  }, [inputDeviceId, isMonitoring, startMonitoring, stopMonitoring]);

  return { isMonitoring, monitorVolume, startMonitoring, stopMonitoring, updateVolume, setDuck };
}
