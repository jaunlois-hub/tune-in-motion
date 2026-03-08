import { useState, useRef, useCallback, useEffect } from 'react';

export interface EffectSettings {
  reverb: number;
  delay: number;
  delayTime: number;
  distortion: number;
  gain: number;
}

const defaultSettings: EffectSettings = { reverb: 0, delay: 0, delayTime: 0.3, distortion: 0, gain: 0.8 };

export function useGuitarEffects() {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<EffectSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const distortionNodeRef = useRef<WaveShaperNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);

  const makeDistortionCurve = useCallback((amount: number) => {
    const k = amount * 100;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }, []);

  const createImpulseResponse = useCallback((duration: number, decay: number) => {
    if (!audioContextRef.current) return null;
    const sr = audioContextRef.current.sampleRate;
    const len = sr * duration;
    const impulse = audioContextRef.current.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return impulse;
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } });
      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      const source = ctx.createMediaStreamSource(stream);
      gainNodeRef.current = ctx.createGain();
      distortionNodeRef.current = ctx.createWaveShaper();
      delayNodeRef.current = ctx.createDelay(2);
      delayGainRef.current = ctx.createGain();
      convolverNodeRef.current = ctx.createConvolver();
      reverbGainRef.current = ctx.createGain();
      dryGainRef.current = ctx.createGain();
      distortionNodeRef.current.curve = makeDistortionCurve(settings.distortion);
      distortionNodeRef.current.oversample = '4x';
      delayNodeRef.current.delayTime.value = settings.delayTime;
      delayGainRef.current.gain.value = settings.delay;
      const impulse = createImpulseResponse(2, 2);
      if (impulse) convolverNodeRef.current.buffer = impulse;
      reverbGainRef.current.gain.value = settings.reverb;
      dryGainRef.current.gain.value = 1 - settings.reverb * 0.5;
      gainNodeRef.current.gain.value = settings.gain;
      source.connect(distortionNodeRef.current);
      distortionNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(delayGainRef.current);
      delayGainRef.current.connect(delayNodeRef.current);
      delayGainRef.current.connect(dryGainRef.current);
      gainNodeRef.current.connect(dryGainRef.current);
      dryGainRef.current.connect(convolverNodeRef.current);
      convolverNodeRef.current.connect(reverbGainRef.current);
      dryGainRef.current.connect(ctx.destination);
      reverbGainRef.current.connect(ctx.destination);
      setIsActive(true);
      setError(null);
    } catch { setError('Could not access microphone for effects processing'); }
  }, [settings, makeDistortionCurve, createImpulseResponse]);

  const stop = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (distortionNodeRef.current) distortionNodeRef.current.curve = makeDistortionCurve(settings.distortion);
    if (delayNodeRef.current) delayNodeRef.current.delayTime.value = settings.delayTime;
    if (delayGainRef.current) delayGainRef.current.gain.value = settings.delay;
    if (reverbGainRef.current) reverbGainRef.current.gain.value = settings.reverb;
    if (dryGainRef.current) dryGainRef.current.gain.value = 1 - settings.reverb * 0.5;
    if (gainNodeRef.current) gainNodeRef.current.gain.value = settings.gain;
  }, [settings, isActive, makeDistortionCurve]);

  const updateSetting = useCallback((key: keyof EffectSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => { setSettings(defaultSettings); }, []);

  useEffect(() => { return () => { stop(); }; }, [stop]);

  return { isActive, settings, error, start, stop, updateSetting, resetSettings };
}
