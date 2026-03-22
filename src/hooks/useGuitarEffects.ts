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

/**
 * Attempt tube-style soft-clip distortion curve (warmer than generic waveshaper)
 */
function makeTubeDistortionCurve(amount: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 8; // Softer drive range for musicality

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // Soft-clip using tanh for warm tube-like saturation
    curve[i] = Math.tanh(x * drive) * 0.9;
  }
  return curve;
}

function createRealisticReverb(ctx: AudioContext, duration: number, decay: number, preDelay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const totalLen = sr * (duration + preDelay);
  const impulse = ctx.createBuffer(2, totalLen, sr);
  const preDelaySamples = Math.floor(sr * preDelay);

  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    for (let i = preDelaySamples; i < totalLen; i++) {
      const t = (i - preDelaySamples) / (totalLen - preDelaySamples);
      // Multi-exponential decay for realistic room reverb
      const earlyDecay = Math.exp(-t * decay * 3) * 0.6;
      const lateDecay = Math.exp(-t * decay * 1.2) * 0.4;
      const envelope = earlyDecay + lateDecay;
      // Add slight diffusion via filtered noise
      const noise = Math.random() * 2 - 1;
      d[i] = noise * envelope;
    }
    // Add a few early reflections
    const reflections = [0.012, 0.019, 0.028, 0.037, 0.048];
    for (const r of reflections) {
      const idx = preDelaySamples + Math.floor(sr * r);
      if (idx < totalLen) {
        d[idx] += (Math.random() > 0.5 ? 1 : -1) * 0.3 * Math.exp(-r * 10);
      }
    }
  }
  return impulse;
}

export function useGuitarEffects() {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<EffectSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nodesRef = useRef<Record<string, AudioNode>>({});

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false }
      });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const n = nodesRef.current;

      // === INPUT STAGE ===

      // Noise gate via gain
      n.noiseGateGain = ctx.createGain();
      (n.noiseGateGain as GainNode).gain.value = 1;

      // Compressor — musical settings
      n.compressor = ctx.createDynamicsCompressor();
      const comp = n.compressor as DynamicsCompressorNode;
      comp.threshold.value = -24;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.15;

      // === TONE SHAPING ===

      // Pre-distortion EQ (critical for good distortion tone)
      n.preDistFilter = ctx.createBiquadFilter();
      (n.preDistFilter as BiquadFilterNode).type = 'highpass';
      (n.preDistFilter as BiquadFilterNode).frequency.value = 80; // Cut mud below 80Hz
      (n.preDistFilter as BiquadFilterNode).Q.value = 0.7;

      // EQ — 3-band
      n.eqBass = ctx.createBiquadFilter();
      (n.eqBass as BiquadFilterNode).type = 'lowshelf';
      (n.eqBass as BiquadFilterNode).frequency.value = 300;
      (n.eqBass as BiquadFilterNode).gain.value = (settings.eqBass - 0.5) * 20;

      n.eqMid = ctx.createBiquadFilter();
      (n.eqMid as BiquadFilterNode).type = 'peaking';
      (n.eqMid as BiquadFilterNode).frequency.value = 800;
      (n.eqMid as BiquadFilterNode).Q.value = 1.2;
      (n.eqMid as BiquadFilterNode).gain.value = (settings.eqMid - 0.5) * 20;

      n.eqTreble = ctx.createBiquadFilter();
      (n.eqTreble as BiquadFilterNode).type = 'highshelf';
      (n.eqTreble as BiquadFilterNode).frequency.value = 3000;
      (n.eqTreble as BiquadFilterNode).gain.value = (settings.eqTreble - 0.5) * 20;

      // === DISTORTION ===
      // Pre-gain for drive level
      n.preGain = ctx.createGain();
      (n.preGain as GainNode).gain.value = 1 + settings.distortion * 3;

      n.distortion = ctx.createWaveShaper();
      (n.distortion as WaveShaperNode).curve = makeTubeDistortionCurve(settings.distortion) as Float32Array<ArrayBuffer>;
      (n.distortion as WaveShaperNode).oversample = '4x';

      // Post-distortion tone control (tame harsh highs)
      n.postDistTone = ctx.createBiquadFilter();
      (n.postDistTone as BiquadFilterNode).type = 'lowpass';
      (n.postDistTone as BiquadFilterNode).frequency.value = 5000 - settings.distortion * 2000;
      (n.postDistTone as BiquadFilterNode).Q.value = 0.7;

      // === WAH ===
      n.wah = ctx.createBiquadFilter();
      (n.wah as BiquadFilterNode).type = 'bandpass';
      (n.wah as BiquadFilterNode).frequency.value = 200 + settings.wahFreq * 3800;
      (n.wah as BiquadFilterNode).Q.value = 2 + settings.wah * 10;
      n.wahDry = ctx.createGain();
      n.wahWet = ctx.createGain();
      (n.wahDry as GainNode).gain.value = 1 - settings.wah;
      (n.wahWet as GainNode).gain.value = settings.wah;

      // === MAIN GAIN ===
      n.gain = ctx.createGain();
      (n.gain as GainNode).gain.value = settings.gain;

      // === CHORUS — stereo, deeper modulation ===
      const chorusDelay = ctx.createDelay(0.05);
      chorusDelay.delayTime.value = 0.012;
      n.chorusDelay = chorusDelay;
      n.chorusLfo = ctx.createOscillator();
      (n.chorusLfo as OscillatorNode).type = 'sine';
      (n.chorusLfo as OscillatorNode).frequency.value = settings.chorusRate;
      n.chorusLfoGain = ctx.createGain();
      (n.chorusLfoGain as GainNode).gain.value = 0.004; // Moderate depth
      (n.chorusLfo as OscillatorNode).connect(n.chorusLfoGain as GainNode);
      (n.chorusLfoGain as GainNode).connect(chorusDelay.delayTime);
      (n.chorusLfo as OscillatorNode).start();

      // Second voice for richer chorus
      const chorusDelay2 = ctx.createDelay(0.05);
      chorusDelay2.delayTime.value = 0.018;
      n.chorusDelay2 = chorusDelay2;
      const chorusLfo2 = ctx.createOscillator();
      chorusLfo2.type = 'sine';
      chorusLfo2.frequency.value = settings.chorusRate * 0.8;
      const chorusLfo2Gain = ctx.createGain();
      chorusLfo2Gain.gain.value = 0.003;
      chorusLfo2.connect(chorusLfo2Gain);
      chorusLfo2Gain.connect(chorusDelay2.delayTime);
      chorusLfo2.start();
      n.chorusLfo2 = chorusLfo2;
      n.chorusLfo2Gain = chorusLfo2Gain;

      n.chorusWet = ctx.createGain();
      n.chorusDry = ctx.createGain();
      (n.chorusWet as GainNode).gain.value = settings.chorus * 0.5;
      (n.chorusDry as GainNode).gain.value = 1;

      // === FLANGER ===
      const flangerDelay = ctx.createDelay(0.02);
      flangerDelay.delayTime.value = 0.003;
      n.flangerDelay = flangerDelay;
      n.flangerLfo = ctx.createOscillator();
      (n.flangerLfo as OscillatorNode).type = 'triangle'; // Triangle for smoother sweep
      (n.flangerLfo as OscillatorNode).frequency.value = settings.flangerRate;
      n.flangerLfoGain = ctx.createGain();
      (n.flangerLfoGain as GainNode).gain.value = 0.002;
      (n.flangerLfo as OscillatorNode).connect(n.flangerLfoGain as GainNode);
      (n.flangerLfoGain as GainNode).connect(flangerDelay.delayTime);
      (n.flangerLfo as OscillatorNode).start();
      n.flangerFeedback = ctx.createGain();
      (n.flangerFeedback as GainNode).gain.value = 0.6;
      n.flangerWet = ctx.createGain();
      (n.flangerWet as GainNode).gain.value = settings.flanger;
      n.flangerDry = ctx.createGain();
      (n.flangerDry as GainNode).gain.value = 1;

      // === PHASER — 6-stage for deeper effect ===
      const phaserStages: BiquadFilterNode[] = [];
      const phaserFreqs = [200, 400, 800, 1200, 2000, 3200];
      for (let i = 0; i < 6; i++) {
        const f = ctx.createBiquadFilter();
        f.type = 'allpass';
        f.frequency.value = phaserFreqs[i];
        f.Q.value = 3;
        phaserStages.push(f);
      }
      n.phaserStages = phaserStages[0];
      n.phaserLfo = ctx.createOscillator();
      (n.phaserLfo as OscillatorNode).type = 'triangle';
      (n.phaserLfo as OscillatorNode).frequency.value = settings.phaserRate;
      n.phaserLfoGain = ctx.createGain();
      (n.phaserLfoGain as GainNode).gain.value = 800;
      (n.phaserLfo as OscillatorNode).connect(n.phaserLfoGain as GainNode);
      phaserStages.forEach(s => (n.phaserLfoGain as GainNode).connect(s.frequency));
      (n.phaserLfo as OscillatorNode).start();
      n.phaserWet = ctx.createGain();
      (n.phaserWet as GainNode).gain.value = settings.phaser;
      n.phaserDry = ctx.createGain();
      (n.phaserDry as GainNode).gain.value = 1;

      // === TREMOLO ===
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

      // === DELAY — with highpass on feedback for clarity ===
      n.delay = ctx.createDelay(2);
      (n.delay as DelayNode).delayTime.value = settings.delayTime;
      n.delayGain = ctx.createGain();
      (n.delayGain as GainNode).gain.value = settings.delay * 0.7;
      // Feedback filter — cut low rumble from delay repeats
      n.delayFilter = ctx.createBiquadFilter();
      (n.delayFilter as BiquadFilterNode).type = 'highpass';
      (n.delayFilter as BiquadFilterNode).frequency.value = 200;
      // Delay damping — cut highs each repeat
      n.delayDamping = ctx.createBiquadFilter();
      (n.delayDamping as BiquadFilterNode).type = 'lowpass';
      (n.delayDamping as BiquadFilterNode).frequency.value = 4000;

      // === REVERB — realistic impulse ===
      n.convolver = ctx.createConvolver();
      (n.convolver as ConvolverNode).buffer = createRealisticReverb(ctx, 2.5, 2.5, 0.02);
      n.reverbGain = ctx.createGain();
      (n.reverbGain as GainNode).gain.value = settings.reverb * 0.8;
      n.dryGain = ctx.createGain();
      (n.dryGain as GainNode).gain.value = 1;

      // === Output limiter to prevent clipping ===
      n.limiter = ctx.createDynamicsCompressor();
      const limiter = n.limiter as DynamicsCompressorNode;
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;

      // === SIGNAL CHAIN ===
      // source → noiseGate → compressor → preDistFilter → eqBass → eqMid → eqTreble
      source.connect(n.noiseGateGain);
      (n.noiseGateGain as GainNode).connect(n.compressor);
      (n.compressor as DynamicsCompressorNode).connect(n.preDistFilter);
      (n.preDistFilter as BiquadFilterNode).connect(n.eqBass);
      (n.eqBass as BiquadFilterNode).connect(n.eqMid);
      (n.eqMid as BiquadFilterNode).connect(n.eqTreble);

      // → preGain → distortion → postDistTone
      (n.eqTreble as BiquadFilterNode).connect(n.preGain);
      (n.preGain as GainNode).connect(n.distortion);
      (n.distortion as WaveShaperNode).connect(n.postDistTone);

      // → wah split/merge
      const postDist = n.postDistTone;
      postDist.connect(n.wahWet as GainNode);
      (n.wahWet as GainNode).connect(n.wah);
      postDist.connect(n.wahDry as GainNode);
      const wahMerge = ctx.createGain();
      n.wahMerge = wahMerge;
      (n.wah as BiquadFilterNode).connect(wahMerge);
      (n.wahDry as GainNode).connect(wahMerge);

      // → gain
      wahMerge.connect(n.gain);

      // → chorus (dual-voice)
      const postGain = n.gain;
      postGain.connect(n.chorusDelay as DelayNode);
      postGain.connect(chorusDelay2);
      (n.chorusDelay as DelayNode).connect(n.chorusWet as GainNode);
      chorusDelay2.connect(n.chorusWet as GainNode);
      postGain.connect(n.chorusDry as GainNode);

      const chorusMerge = ctx.createGain();
      n.chorusMerge = chorusMerge;
      (n.chorusWet as GainNode).connect(chorusMerge);
      (n.chorusDry as GainNode).connect(chorusMerge);

      // → flanger
      chorusMerge.connect(flangerDelay);
      flangerDelay.connect(n.flangerFeedback as GainNode);
      (n.flangerFeedback as GainNode).connect(flangerDelay);
      flangerDelay.connect(n.flangerWet as GainNode);
      chorusMerge.connect(n.flangerDry as GainNode);

      const flangerMerge = ctx.createGain();
      n.flangerMerge = flangerMerge;
      (n.flangerWet as GainNode).connect(flangerMerge);
      (n.flangerDry as GainNode).connect(flangerMerge);

      // → phaser (6-stage)
      flangerMerge.connect(phaserStages[0]);
      for (let i = 0; i < phaserStages.length - 1; i++) phaserStages[i].connect(phaserStages[i + 1]);
      phaserStages[phaserStages.length - 1].connect(n.phaserWet as GainNode);
      flangerMerge.connect(n.phaserDry as GainNode);

      const phaserMerge = ctx.createGain();
      n.phaserMerge = phaserMerge;
      (n.phaserWet as GainNode).connect(phaserMerge);
      (n.phaserDry as GainNode).connect(phaserMerge);

      // → tremolo
      phaserMerge.connect(n.tremoloGain);

      // → delay (with filtered feedback)
      (n.tremoloGain as GainNode).connect(n.delay as DelayNode);
      (n.delay as DelayNode).connect(n.delayFilter as BiquadFilterNode);
      (n.delayFilter as BiquadFilterNode).connect(n.delayDamping as BiquadFilterNode);
      (n.delayDamping as BiquadFilterNode).connect(n.delayGain as GainNode);
      (n.delayGain as GainNode).connect(n.delay as DelayNode); // feedback loop
      (n.delayGain as GainNode).connect(n.dryGain as GainNode);
      (n.tremoloGain as GainNode).connect(n.dryGain as GainNode);

      // → reverb → limiter → output
      (n.dryGain as GainNode).connect(n.convolver as ConvolverNode);
      (n.convolver as ConvolverNode).connect(n.reverbGain as GainNode);
      (n.dryGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.reverbGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.limiter as DynamicsCompressorNode).connect(ctx.destination);

      (nodesRef.current as any)._phaserStages = phaserStages;

      setIsActive(true);
      setError(null);
    } catch { setError('Could not access microphone for effects processing'); }
  }, [settings]);

  const stop = useCallback(() => {
    ['chorusLfo', 'chorusLfo2', 'flangerLfo', 'phaserLfo', 'tremoloLfo'].forEach(k => {
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
    if (n.distortion) (n.distortion as WaveShaperNode).curve = makeTubeDistortionCurve(settings.distortion);
    if (n.preGain) (n.preGain as GainNode).gain.value = 1 + settings.distortion * 3;
    if (n.postDistTone) (n.postDistTone as BiquadFilterNode).frequency.value = 5000 - settings.distortion * 2000;
    // Delay
    if (n.delay) (n.delay as DelayNode).delayTime.value = settings.delayTime;
    if (n.delayGain) (n.delayGain as GainNode).gain.value = settings.delay * 0.7;
    // Reverb
    if (n.reverbGain) (n.reverbGain as GainNode).gain.value = settings.reverb * 0.8;
    // Gain
    if (n.gain) (n.gain as GainNode).gain.value = settings.gain;
    // Compressor
    if (n.compressor) {
      const thresh = -50 + settings.compressor * 40;
      (n.compressor as DynamicsCompressorNode).threshold.value = thresh;
      (n.compressor as DynamicsCompressorNode).ratio.value = 2 + settings.compressor * 10;
    }
    // EQ
    if (n.eqBass) (n.eqBass as BiquadFilterNode).gain.value = (settings.eqBass - 0.5) * 20;
    if (n.eqMid) (n.eqMid as BiquadFilterNode).gain.value = (settings.eqMid - 0.5) * 20;
    if (n.eqTreble) (n.eqTreble as BiquadFilterNode).gain.value = (settings.eqTreble - 0.5) * 20;
    // Wah
    if (n.wah) {
      (n.wah as BiquadFilterNode).frequency.value = 200 + settings.wahFreq * 3800;
      (n.wah as BiquadFilterNode).Q.value = 2 + settings.wah * 10;
    }
    if (n.wahWet) (n.wahWet as GainNode).gain.value = settings.wah;
    if (n.wahDry) (n.wahDry as GainNode).gain.value = 1 - settings.wah;
    // Chorus
    if (n.chorusWet) (n.chorusWet as GainNode).gain.value = settings.chorus * 0.5;
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
  }, [settings, isActive]);

  const updateSetting = useCallback((key: keyof EffectSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => { setSettings(defaultSettings); }, []);

  useEffect(() => { return () => { stop(); }; }, [stop]);

  return { isActive, settings, error, start, stop, updateSetting, resetSettings };
}
