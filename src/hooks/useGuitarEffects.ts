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
 * Asymmetric tube-style soft-clip with even-order harmonics for warmth
 */
function makeTubeDistortionCurve(amount: number): Float32Array {
  const samples = 8192;
  const curve = new Float32Array(samples);

  if (amount < 0.05) {
    // Bypass: linear identity curve
    for (let i = 0; i < samples; i++) {
      curve[i] = (i * 2) / samples - 1;
    }
    return curve;
  }

  const drive = 1 + amount * 6;
  const bias = amount * 0.15; // Asymmetry for even harmonics (warmer)
  const mix = Math.min(amount * 1.5, 1); // Wet/dry blend for low gain

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    const biased = x + bias;
    // Stage 1: soft tanh clipping
    const stage1 = Math.tanh(biased * drive);
    // Stage 2: second harmonic enrichment (asymmetric)
    const stage2 = Math.tanh(stage1 * (1 + amount * 2)) * 0.95;
    // Blend dry/wet for subtle crunch at low settings
    const processed = stage2 * mix + x * (1 - mix);
    curve[i] = processed * 0.85; // Headroom
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

    // Generate diffused noise
    for (let i = preDelaySamples; i < totalLen; i++) {
      const t = (i - preDelaySamples) / (totalLen - preDelaySamples);
      const earlyDecay = Math.exp(-t * decay * 3.5) * 0.5;
      const lateDecay = Math.exp(-t * decay * 1.0) * 0.5;
      const envelope = earlyDecay + lateDecay;
      const noise = Math.random() * 2 - 1;
      d[i] = noise * envelope;
    }

    // Early reflections at realistic room intervals
    const reflections = [0.008, 0.013, 0.019, 0.023, 0.029, 0.037, 0.043, 0.051];
    for (const r of reflections) {
      const idx = preDelaySamples + Math.floor(sr * r);
      if (idx < totalLen) {
        d[idx] += (Math.random() > 0.5 ? 1 : -1) * 0.25 * Math.exp(-r * 8);
      }
    }

    // Diffusion: smear short segments for smoother tail
    for (let pass = 0; pass < 3; pass++) {
      const segLen = Math.floor(sr * 0.004 * (pass + 1));
      for (let i = preDelaySamples + segLen; i < totalLen - segLen; i += segLen) {
        const swap = i + Math.floor(Math.random() * segLen);
        if (swap < totalLen) {
          const tmp = d[i];
          d[i] = (d[i] + d[swap]) * 0.5;
          d[swap] = (d[swap] + tmp) * 0.5;
        }
      }
    }

    // Bandpass the impulse: cut <200Hz and >8kHz
    // Simple FIR approximation via running average for low-cut
    const lowCutSamples = Math.floor(sr / 200);
    let runSum = 0;
    for (let i = preDelaySamples; i < totalLen; i++) {
      runSum += d[i];
      if (i >= preDelaySamples + lowCutSamples) {
        runSum -= d[i - lowCutSamples];
      }
      const avg = runSum / Math.min(i - preDelaySamples + 1, lowCutSamples);
      d[i] = d[i] - avg * 0.7; // Subtract low-frequency content
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
  const noiseGateRafRef = useRef<number>(0);

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

      // Noise gate gain node + analyser for real gating
      n.noiseGateGain = ctx.createGain();
      (n.noiseGateGain as GainNode).gain.value = 1;
      n.noiseGateAnalyser = ctx.createAnalyser();
      (n.noiseGateAnalyser as AnalyserNode).fftSize = 256;
      (n.noiseGateAnalyser as AnalyserNode).smoothingTimeConstant = 0.8;

      // Compressor
      n.compressor = ctx.createDynamicsCompressor();
      const comp = n.compressor as DynamicsCompressorNode;
      const compThresh = -50 + settings.compressor * 40;
      comp.threshold.value = compThresh;
      comp.knee.value = 12;
      comp.ratio.value = 2 + settings.compressor * 10;
      comp.attack.value = 0.005;
      comp.release.value = 0.15;

      // === TONE SHAPING ===

      // Pre-distortion highpass (cut mud)
      n.preDistFilter = ctx.createBiquadFilter();
      (n.preDistFilter as BiquadFilterNode).type = 'highpass';
      (n.preDistFilter as BiquadFilterNode).frequency.value = 80;
      (n.preDistFilter as BiquadFilterNode).Q.value = 0.7;

      // EQ — 3-band (placed before distortion for tone shaping)
      n.eqBass = ctx.createBiquadFilter();
      (n.eqBass as BiquadFilterNode).type = 'lowshelf';
      (n.eqBass as BiquadFilterNode).frequency.value = 300;
      (n.eqBass as BiquadFilterNode).gain.value = (settings.eqBass - 0.5) * 12;

      n.eqMid = ctx.createBiquadFilter();
      (n.eqMid as BiquadFilterNode).type = 'peaking';
      (n.eqMid as BiquadFilterNode).frequency.value = 800;
      (n.eqMid as BiquadFilterNode).Q.value = 1.2;
      (n.eqMid as BiquadFilterNode).gain.value = (settings.eqMid - 0.5) * 12;

      n.eqTreble = ctx.createBiquadFilter();
      (n.eqTreble as BiquadFilterNode).type = 'highshelf';
      (n.eqTreble as BiquadFilterNode).frequency.value = 3000;
      (n.eqTreble as BiquadFilterNode).gain.value = (settings.eqTreble - 0.5) * 12;

      // === DISTORTION ===
      n.preGain = ctx.createGain();
      (n.preGain as GainNode).gain.value = settings.distortion < 0.05 ? 1 : 1 + settings.distortion * 6;

      n.distortion = ctx.createWaveShaper();
      (n.distortion as WaveShaperNode).curve = makeTubeDistortionCurve(settings.distortion) as Float32Array<ArrayBuffer>;
      (n.distortion as WaveShaperNode).oversample = '4x';

      // Post-distortion tone control
      n.postDistTone = ctx.createBiquadFilter();
      (n.postDistTone as BiquadFilterNode).type = 'lowpass';
      const toneFreq = settings.distortion < 0.05 ? 12000 : 6000 - settings.distortion * 1500;
      (n.postDistTone as BiquadFilterNode).frequency.value = toneFreq;
      (n.postDistTone as BiquadFilterNode).Q.value = 0.8;

      // === CABINET SIMULATION (3 cascaded filters) ===
      n.cabHigh = ctx.createBiquadFilter();
      (n.cabHigh as BiquadFilterNode).type = 'highpass';
      (n.cabHigh as BiquadFilterNode).frequency.value = 80;
      (n.cabHigh as BiquadFilterNode).Q.value = 0.5;

      n.cabPresence = ctx.createBiquadFilter();
      (n.cabPresence as BiquadFilterNode).type = 'peaking';
      (n.cabPresence as BiquadFilterNode).frequency.value = 2000;
      (n.cabPresence as BiquadFilterNode).Q.value = 1.5;
      (n.cabPresence as BiquadFilterNode).gain.value = 3;

      n.cabLow = ctx.createBiquadFilter();
      (n.cabLow as BiquadFilterNode).type = 'lowpass';
      (n.cabLow as BiquadFilterNode).frequency.value = 4500;
      (n.cabLow as BiquadFilterNode).Q.value = 0.6;

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

      // === CHORUS — dual voice ===
      const chorusDelay = ctx.createDelay(0.05);
      chorusDelay.delayTime.value = 0.012;
      n.chorusDelay = chorusDelay;
      n.chorusLfo = ctx.createOscillator();
      (n.chorusLfo as OscillatorNode).type = 'sine';
      (n.chorusLfo as OscillatorNode).frequency.value = settings.chorusRate;
      n.chorusLfoGain = ctx.createGain();
      (n.chorusLfoGain as GainNode).gain.value = 0.004;
      (n.chorusLfo as OscillatorNode).connect(n.chorusLfoGain as GainNode);
      (n.chorusLfoGain as GainNode).connect(chorusDelay.delayTime);
      (n.chorusLfo as OscillatorNode).start();

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
      (n.flangerLfo as OscillatorNode).type = 'triangle';
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

      // === PHASER — 6-stage ===
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

      // === DELAY with filtered feedback ===
      n.delay = ctx.createDelay(2);
      (n.delay as DelayNode).delayTime.value = settings.delayTime;
      n.delayGain = ctx.createGain();
      (n.delayGain as GainNode).gain.value = settings.delay * 0.6;
      n.delayFilter = ctx.createBiquadFilter();
      (n.delayFilter as BiquadFilterNode).type = 'highpass';
      (n.delayFilter as BiquadFilterNode).frequency.value = 200;
      n.delayDamping = ctx.createBiquadFilter();
      (n.delayDamping as BiquadFilterNode).type = 'lowpass';
      (n.delayDamping as BiquadFilterNode).frequency.value = 3500;

      // === REVERB ===
      n.convolver = ctx.createConvolver();
      (n.convolver as ConvolverNode).buffer = createRealisticReverb(ctx, 2.5, 2.5, 0.02);
      n.reverbGain = ctx.createGain();
      (n.reverbGain as GainNode).gain.value = settings.reverb * 0.7;
      n.dryGain = ctx.createGain();
      (n.dryGain as GainNode).gain.value = 1;

      // === Output limiter ===
      n.limiter = ctx.createDynamicsCompressor();
      const limiter = n.limiter as DynamicsCompressorNode;
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;

      // === SIGNAL CHAIN ===
      // source → noiseGateAnalyser (tap) → noiseGateGain → compressor → preDistFilter → EQ
      source.connect(n.noiseGateAnalyser);
      source.connect(n.noiseGateGain);
      (n.noiseGateGain as GainNode).connect(n.compressor);
      (n.compressor as DynamicsCompressorNode).connect(n.preDistFilter);
      (n.preDistFilter as BiquadFilterNode).connect(n.eqBass);
      (n.eqBass as BiquadFilterNode).connect(n.eqMid);
      (n.eqMid as BiquadFilterNode).connect(n.eqTreble);

      // → preGain → distortion → postDistTone → cabinet sim
      (n.eqTreble as BiquadFilterNode).connect(n.preGain);
      (n.preGain as GainNode).connect(n.distortion);
      (n.distortion as WaveShaperNode).connect(n.postDistTone);
      (n.postDistTone as BiquadFilterNode).connect(n.cabHigh);
      (n.cabHigh as BiquadFilterNode).connect(n.cabPresence);
      (n.cabPresence as BiquadFilterNode).connect(n.cabLow);

      // → wah split/merge
      const postCab = n.cabLow;
      postCab.connect(n.wahWet as GainNode);
      (n.wahWet as GainNode).connect(n.wah);
      postCab.connect(n.wahDry as GainNode);
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
      (n.delayGain as GainNode).connect(n.delay as DelayNode);
      (n.delayGain as GainNode).connect(n.dryGain as GainNode);
      (n.tremoloGain as GainNode).connect(n.dryGain as GainNode);

      // → reverb → limiter → output
      (n.dryGain as GainNode).connect(n.convolver as ConvolverNode);
      (n.convolver as ConvolverNode).connect(n.reverbGain as GainNode);
      (n.dryGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.reverbGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.limiter as DynamicsCompressorNode).connect(ctx.destination);

      (nodesRef.current as any)._phaserStages = phaserStages;

      // === NOISE GATE: rAF-based level monitoring ===
      const analyserData = new Uint8Array((n.noiseGateAnalyser as AnalyserNode).frequencyBinCount);
      let gateOpen = true;

      const pollGate = () => {
        if (!audioContextRef.current) return;
        const analyser = nodesRef.current.noiseGateAnalyser as AnalyserNode | undefined;
        const gateGain = nodesRef.current.noiseGateGain as GainNode | undefined;
        if (!analyser || !gateGain) return;

        analyser.getByteFrequencyData(analyserData);
        let sum = 0;
        for (let i = 0; i < analyserData.length; i++) sum += analyserData[i];
        const avg = sum / analyserData.length / 255; // 0-1

        // Threshold scales with noiseGate setting: 0 = disabled, 1 = aggressive
        const currentSettings = settingsRef.current;
        const threshold = currentSettings.noiseGate * 0.15; // max threshold ~0.15

        if (currentSettings.noiseGate < 0.05) {
          // Gate disabled
          if (!gateOpen) {
            gateGain.gain.setTargetAtTime(1, audioContextRef.current!.currentTime, 0.005);
            gateOpen = true;
          }
        } else if (avg > threshold) {
          if (!gateOpen) {
            gateGain.gain.setTargetAtTime(1, audioContextRef.current!.currentTime, 0.005); // 5ms attack
            gateOpen = true;
          }
        } else {
          if (gateOpen) {
            gateGain.gain.setTargetAtTime(0, audioContextRef.current!.currentTime, 0.05); // 50ms release
            gateOpen = false;
          }
        }

        noiseGateRafRef.current = requestAnimationFrame(pollGate);
      };
      noiseGateRafRef.current = requestAnimationFrame(pollGate);

      setIsActive(true);
      setError(null);
    } catch { setError('Could not access microphone for effects processing'); }
  }, [settings]);

  // Keep a ref to settings for the noise gate rAF callback
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const stop = useCallback(() => {
    if (noiseGateRafRef.current) cancelAnimationFrame(noiseGateRafRef.current);
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
    if (n.distortion) (n.distortion as WaveShaperNode).curve = makeTubeDistortionCurve(settings.distortion) as Float32Array<ArrayBuffer>;
    if (n.preGain) (n.preGain as GainNode).gain.value = settings.distortion < 0.05 ? 1 : 1 + settings.distortion * 6;
    if (n.postDistTone) (n.postDistTone as BiquadFilterNode).frequency.value = settings.distortion < 0.05 ? 12000 : 6000 - settings.distortion * 1500;
    // Delay
    if (n.delay) (n.delay as DelayNode).delayTime.value = settings.delayTime;
    if (n.delayGain) (n.delayGain as GainNode).gain.value = settings.delay * 0.6;
    // Reverb
    if (n.reverbGain) (n.reverbGain as GainNode).gain.value = settings.reverb * 0.7;
    // Gain
    if (n.gain) (n.gain as GainNode).gain.value = settings.gain;
    // Compressor
    if (n.compressor) {
      const thresh = -50 + settings.compressor * 40;
      (n.compressor as DynamicsCompressorNode).threshold.value = thresh;
      (n.compressor as DynamicsCompressorNode).ratio.value = 2 + settings.compressor * 10;
    }
    // EQ (reduced range: ±6dB instead of ±10dB)
    if (n.eqBass) (n.eqBass as BiquadFilterNode).gain.value = (settings.eqBass - 0.5) * 12;
    if (n.eqMid) (n.eqMid as BiquadFilterNode).gain.value = (settings.eqMid - 0.5) * 12;
    if (n.eqTreble) (n.eqTreble as BiquadFilterNode).gain.value = (settings.eqTreble - 0.5) * 12;
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
