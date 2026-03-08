import { useState, useRef, useCallback, useEffect } from 'react';

export interface EffectSettings {
  reverb: number;
  delay: number;
  delayTime: number;
  distortion: number;
  gain: number;
  chorus: number;
  chorusRate: number;
  flanger: number;
  flangerRate: number;
  phaser: number;
  phaserRate: number;
  compressor: number;
  noiseGate: number;
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  wah: number;
  wahFreq: number;
  tremolo: number;
  tremoloRate: number;
  octaver: number;
  octaverMix: number;
}

const defaultSettings: EffectSettings = {
  reverb: 0, delay: 0, delayTime: 0.3, distortion: 0, gain: 0.8,
  chorus: 0, chorusRate: 1.5,
  flanger: 0, flangerRate: 0.5,
  phaser: 0, phaserRate: 0.8,
  compressor: 0, noiseGate: 0,
  eqBass: 0.5, eqMid: 0.5, eqTreble: 0.5,
  wah: 0, wahFreq: 0.5,
  tremolo: 0, tremoloRate: 5,
  octaver: 0, octaverMix: 0.5,
};

export function useGuitarEffects() {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<EffectSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nodesRef = useRef<Record<string, AudioNode>>({});

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
      const n = nodesRef.current;

      // Noise Gate (implemented as a gain controlled by threshold)
      n.noiseGateGain = ctx.createGain();
      (n.noiseGateGain as GainNode).gain.value = 1;

      // Compressor
      n.compressor = ctx.createDynamicsCompressor();
      const comp = n.compressor as DynamicsCompressorNode;
      comp.threshold.value = -50 + settings.compressor * 40; // -50 to -10
      comp.ratio.value = 1 + settings.compressor * 19; // 1 to 20
      comp.attack.value = 0.003;
      comp.release.value = 0.25;

      // EQ
      n.eqBass = ctx.createBiquadFilter();
      (n.eqBass as BiquadFilterNode).type = 'lowshelf';
      (n.eqBass as BiquadFilterNode).frequency.value = 320;
      (n.eqBass as BiquadFilterNode).gain.value = (settings.eqBass - 0.5) * 24;

      n.eqMid = ctx.createBiquadFilter();
      (n.eqMid as BiquadFilterNode).type = 'peaking';
      (n.eqMid as BiquadFilterNode).frequency.value = 1000;
      (n.eqMid as BiquadFilterNode).Q.value = 1;
      (n.eqMid as BiquadFilterNode).gain.value = (settings.eqMid - 0.5) * 24;

      n.eqTreble = ctx.createBiquadFilter();
      (n.eqTreble as BiquadFilterNode).type = 'highshelf';
      (n.eqTreble as BiquadFilterNode).frequency.value = 3200;
      (n.eqTreble as BiquadFilterNode).gain.value = (settings.eqTreble - 0.5) * 24;

      // Distortion
      n.distortion = ctx.createWaveShaper();
      (n.distortion as WaveShaperNode).curve = makeDistortionCurve(settings.distortion);
      (n.distortion as WaveShaperNode).oversample = '4x';

      // Wah (bandpass filter)
      n.wah = ctx.createBiquadFilter();
      (n.wah as BiquadFilterNode).type = 'bandpass';
      (n.wah as BiquadFilterNode).frequency.value = 200 + settings.wahFreq * 3800;
      (n.wah as BiquadFilterNode).Q.value = 1 + settings.wah * 14;
      n.wahDry = ctx.createGain();
      n.wahWet = ctx.createGain();
      (n.wahDry as GainNode).gain.value = 1 - settings.wah;
      (n.wahWet as GainNode).gain.value = settings.wah;

      // Main gain
      n.gain = ctx.createGain();
      (n.gain as GainNode).gain.value = settings.gain;

      // Chorus (delay-based LFO modulation)
      const chorusDelay = ctx.createDelay(0.05);
      chorusDelay.delayTime.value = 0.025;
      n.chorusDelay = chorusDelay;
      n.chorusLfo = ctx.createOscillator();
      (n.chorusLfo as OscillatorNode).type = 'sine';
      (n.chorusLfo as OscillatorNode).frequency.value = settings.chorusRate;
      n.chorusLfoGain = ctx.createGain();
      (n.chorusLfoGain as GainNode).gain.value = 0.005;
      (n.chorusLfo as OscillatorNode).connect(n.chorusLfoGain as GainNode);
      (n.chorusLfoGain as GainNode).connect((n.chorusDelay as DelayNode).delayTime);
      (n.chorusLfo as OscillatorNode).start();
      n.chorusWet = ctx.createGain();
      n.chorusDry = ctx.createGain();
      (n.chorusWet as GainNode).gain.value = settings.chorus;
      (n.chorusDry as GainNode).gain.value = 1;

      // Flanger
      const flangerDelay = ctx.createDelay(0.02);
      flangerDelay.delayTime.value = 0.005;
      n.flangerDelay = flangerDelay;
      n.flangerLfo = ctx.createOscillator();
      (n.flangerLfo as OscillatorNode).type = 'sine';
      (n.flangerLfo as OscillatorNode).frequency.value = settings.flangerRate;
      n.flangerLfoGain = ctx.createGain();
      (n.flangerLfoGain as GainNode).gain.value = 0.003;
      (n.flangerLfo as OscillatorNode).connect(n.flangerLfoGain as GainNode);
      (n.flangerLfoGain as GainNode).connect((n.flangerDelay as DelayNode).delayTime);
      (n.flangerLfo as OscillatorNode).start();
      n.flangerFeedback = ctx.createGain();
      (n.flangerFeedback as GainNode).gain.value = 0.7;
      n.flangerWet = ctx.createGain();
      (n.flangerWet as GainNode).gain.value = settings.flanger;
      n.flangerDry = ctx.createGain();
      (n.flangerDry as GainNode).gain.value = 1;

      // Phaser (allpass filters)
      const phaserStages: BiquadFilterNode[] = [];
      for (let i = 0; i < 4; i++) {
        const f = ctx.createBiquadFilter();
        f.type = 'allpass';
        f.frequency.value = 200 + i * 400;
        f.Q.value = 5;
        phaserStages.push(f);
      }
      n.phaserStages = phaserStages[0]; // reference first
      n.phaserLfo = ctx.createOscillator();
      (n.phaserLfo as OscillatorNode).type = 'sine';
      (n.phaserLfo as OscillatorNode).frequency.value = settings.phaserRate;
      n.phaserLfoGain = ctx.createGain();
      (n.phaserLfoGain as GainNode).gain.value = 1000;
      (n.phaserLfo as OscillatorNode).connect(n.phaserLfoGain as GainNode);
      phaserStages.forEach(s => (n.phaserLfoGain as GainNode).connect(s.frequency));
      (n.phaserLfo as OscillatorNode).start();
      n.phaserWet = ctx.createGain();
      (n.phaserWet as GainNode).gain.value = settings.phaser;
      n.phaserDry = ctx.createGain();
      (n.phaserDry as GainNode).gain.value = 1;

      // Tremolo
      n.tremoloGain = ctx.createGain();
      (n.tremoloGain as GainNode).gain.value = 1;
      n.tremoloLfo = ctx.createOscillator();
      (n.tremoloLfo as OscillatorNode).type = 'sine';
      (n.tremoloLfo as OscillatorNode).frequency.value = settings.tremoloRate;
      n.tremoloLfoGain = ctx.createGain();
      (n.tremoloLfoGain as GainNode).gain.value = settings.tremolo * 0.5;
      (n.tremoloLfo as OscillatorNode).connect(n.tremoloLfoGain as GainNode);
      (n.tremoloLfoGain as GainNode).connect((n.tremoloGain as GainNode).gain);
      (n.tremoloLfo as OscillatorNode).start();

      // Delay
      n.delay = ctx.createDelay(2);
      (n.delay as DelayNode).delayTime.value = settings.delayTime;
      n.delayGain = ctx.createGain();
      (n.delayGain as GainNode).gain.value = settings.delay;

      // Reverb
      n.convolver = ctx.createConvolver();
      const impulse = createImpulseResponse(2, 2);
      if (impulse) (n.convolver as ConvolverNode).buffer = impulse;
      n.reverbGain = ctx.createGain();
      (n.reverbGain as GainNode).gain.value = settings.reverb;
      n.dryGain = ctx.createGain();
      (n.dryGain as GainNode).gain.value = 1 - settings.reverb * 0.5;

      // === Signal chain ===
      // source -> noiseGate -> compressor -> eqBass -> eqMid -> eqTreble -> distortion
      source.connect(n.noiseGateGain);
      (n.noiseGateGain as GainNode).connect(n.compressor);
      (n.compressor as DynamicsCompressorNode).connect(n.eqBass);
      (n.eqBass as BiquadFilterNode).connect(n.eqMid);
      (n.eqMid as BiquadFilterNode).connect(n.eqTreble);
      (n.eqTreble as BiquadFilterNode).connect(n.distortion);

      // distortion -> wah split
      const postDistortion = n.distortion;
      postDistortion.connect(n.wahWet as GainNode);
      (n.wahWet as GainNode).connect(n.wah);
      postDistortion.connect(n.wahDry as GainNode);

      // wah merge -> gain
      const wahMerge = ctx.createGain();
      n.wahMerge = wahMerge;
      (n.wah as BiquadFilterNode).connect(wahMerge);
      (n.wahDry as GainNode).connect(wahMerge);
      wahMerge.connect(n.gain);

      // gain -> chorus split
      const postGain = n.gain;
      postGain.connect(n.chorusDelay as DelayNode);
      (n.chorusDelay as DelayNode).connect(n.chorusWet as GainNode);
      postGain.connect(n.chorusDry as GainNode);

      // chorus merge -> flanger split
      const chorusMerge = ctx.createGain();
      n.chorusMerge = chorusMerge;
      (n.chorusWet as GainNode).connect(chorusMerge);
      (n.chorusDry as GainNode).connect(chorusMerge);

      // flanger
      chorusMerge.connect(n.flangerDelay as DelayNode);
      (n.flangerDelay as DelayNode).connect(n.flangerFeedback as GainNode);
      (n.flangerFeedback as GainNode).connect(n.flangerDelay as DelayNode);
      (n.flangerDelay as DelayNode).connect(n.flangerWet as GainNode);
      chorusMerge.connect(n.flangerDry as GainNode);

      const flangerMerge = ctx.createGain();
      n.flangerMerge = flangerMerge;
      (n.flangerWet as GainNode).connect(flangerMerge);
      (n.flangerDry as GainNode).connect(flangerMerge);

      // phaser
      flangerMerge.connect(phaserStages[0]);
      for (let i = 0; i < phaserStages.length - 1; i++) phaserStages[i].connect(phaserStages[i + 1]);
      phaserStages[phaserStages.length - 1].connect(n.phaserWet as GainNode);
      flangerMerge.connect(n.phaserDry as GainNode);

      const phaserMerge = ctx.createGain();
      n.phaserMerge = phaserMerge;
      (n.phaserWet as GainNode).connect(phaserMerge);
      (n.phaserDry as GainNode).connect(phaserMerge);

      // tremolo
      phaserMerge.connect(n.tremoloGain);

      // delay
      (n.tremoloGain as GainNode).connect(n.delay as DelayNode);
      (n.delay as DelayNode).connect(n.delayGain as GainNode);
      (n.delayGain as GainNode).connect(n.delay as DelayNode);
      (n.delayGain as GainNode).connect(n.dryGain as GainNode);
      (n.tremoloGain as GainNode).connect(n.dryGain as GainNode);

      // reverb
      (n.dryGain as GainNode).connect(n.convolver as ConvolverNode);
      (n.convolver as ConvolverNode).connect(n.reverbGain as GainNode);
      (n.dryGain as GainNode).connect(ctx.destination);
      (n.reverbGain as GainNode).connect(ctx.destination);

      // Store phaser stages for updates
      (nodesRef.current as any)._phaserStages = phaserStages;

      setIsActive(true);
      setError(null);
    } catch { setError('Could not access microphone for effects processing'); }
  }, [settings, makeDistortionCurve, createImpulseResponse]);

  const stop = useCallback(() => {
    // Stop oscillators
    ['chorusLfo', 'flangerLfo', 'phaserLfo', 'tremoloLfo'].forEach(k => {
      try { (nodesRef.current[k] as OscillatorNode)?.stop(); } catch {}
    });
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    nodesRef.current = {};
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const n = nodesRef.current;
    // Distortion
    if (n.distortion) (n.distortion as WaveShaperNode).curve = makeDistortionCurve(settings.distortion);
    // Delay
    if (n.delay) (n.delay as DelayNode).delayTime.value = settings.delayTime;
    if (n.delayGain) (n.delayGain as GainNode).gain.value = settings.delay;
    // Reverb
    if (n.reverbGain) (n.reverbGain as GainNode).gain.value = settings.reverb;
    if (n.dryGain) (n.dryGain as GainNode).gain.value = 1 - settings.reverb * 0.5;
    // Gain
    if (n.gain) (n.gain as GainNode).gain.value = settings.gain;
    // Compressor
    if (n.compressor) {
      (n.compressor as DynamicsCompressorNode).threshold.value = -50 + settings.compressor * 40;
      (n.compressor as DynamicsCompressorNode).ratio.value = 1 + settings.compressor * 19;
    }
    // EQ
    if (n.eqBass) (n.eqBass as BiquadFilterNode).gain.value = (settings.eqBass - 0.5) * 24;
    if (n.eqMid) (n.eqMid as BiquadFilterNode).gain.value = (settings.eqMid - 0.5) * 24;
    if (n.eqTreble) (n.eqTreble as BiquadFilterNode).gain.value = (settings.eqTreble - 0.5) * 24;
    // Wah
    if (n.wah) {
      (n.wah as BiquadFilterNode).frequency.value = 200 + settings.wahFreq * 3800;
      (n.wah as BiquadFilterNode).Q.value = 1 + settings.wah * 14;
    }
    if (n.wahWet) (n.wahWet as GainNode).gain.value = settings.wah;
    if (n.wahDry) (n.wahDry as GainNode).gain.value = 1 - settings.wah;
    // Chorus
    if (n.chorusWet) (n.chorusWet as GainNode).gain.value = settings.chorus;
    if (n.chorusLfo) (n.chorusLfo as OscillatorNode).frequency.value = settings.chorusRate;
    // Flanger
    if (n.flangerWet) (n.flangerWet as GainNode).gain.value = settings.flanger;
    if (n.flangerLfo) (n.flangerLfo as OscillatorNode).frequency.value = settings.flangerRate;
    // Phaser
    if (n.phaserWet) (n.phaserWet as GainNode).gain.value = settings.phaser;
    if (n.phaserLfo) (n.phaserLfo as OscillatorNode).frequency.value = settings.phaserRate;
    // Tremolo
    if (n.tremoloLfoGain) (n.tremoloLfoGain as GainNode).gain.value = settings.tremolo * 0.5;
    if (n.tremoloLfo) (n.tremoloLfo as OscillatorNode).frequency.value = settings.tremoloRate;
  }, [settings, isActive, makeDistortionCurve]);

  const updateSetting = useCallback((key: keyof EffectSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => { setSettings(defaultSettings); }, []);

  useEffect(() => { return () => { stop(); }; }, [stop]);

  return { isActive, settings, error, start, stop, updateSetting, resetSettings };
}
