import { create } from 'zustand';

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

function makeTubeDistortionCurve(amount: number): Float32Array {
  const samples = 8192;
  const curve = new Float32Array(samples);
  if (amount < 0.05) {
    for (let i = 0; i < samples; i++) curve[i] = (i * 2) / samples - 1;
    return curve;
  }
  const drive = 1 + amount * 6;
  const bias = amount * 0.15;
  const mix = Math.min(amount * 1.5, 1);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    const biased = x + bias;
    const stage1 = Math.tanh(biased * drive);
    const stage2 = Math.tanh(stage1 * (1 + amount * 2)) * 0.95;
    const processed = stage2 * mix + x * (1 - mix);
    curve[i] = processed * 0.85;
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
      const earlyDecay = Math.exp(-t * decay * 3.5) * 0.5;
      const lateDecay = Math.exp(-t * decay * 1.0) * 0.5;
      const envelope = earlyDecay + lateDecay;
      const noise = Math.random() * 2 - 1;
      d[i] = noise * envelope;
    }
    const reflections = [0.008, 0.013, 0.019, 0.023, 0.029, 0.037, 0.043, 0.051];
    for (const r of reflections) {
      const idx = preDelaySamples + Math.floor(sr * r);
      if (idx < totalLen) d[idx] += (Math.random() > 0.5 ? 1 : -1) * 0.25 * Math.exp(-r * 8);
    }
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
    const lowCutSamples = Math.floor(sr / 200);
    let runSum = 0;
    for (let i = preDelaySamples; i < totalLen; i++) {
      runSum += d[i];
      if (i >= preDelaySamples + lowCutSamples) runSum -= d[i - lowCutSamples];
      const avg = runSum / Math.min(i - preDelaySamples + 1, lowCutSamples);
      d[i] = d[i] - avg * 0.7;
    }
  }
  return impulse;
}

export type CabinetType = '1x12' | '2x12' | '4x12';

export const CABINET_TYPES: { id: CabinetType; label: string; description: string }[] = [
  { id: '1x12', label: '1x12 Combo', description: 'Open-back combo — bright, airy, scooped mids' },
  { id: '2x12', label: '2x12 Open', description: 'Open-back 2x12 — balanced, warm presence' },
  { id: '4x12', label: '4x12 Closed', description: 'Closed-back 4x12 — tight lows, aggressive mids' },
];

const CAB_PARAMS: Record<CabinetType, { hp: number; hpQ: number; presFreq: number; presQ: number; presGain: number; lp: number; lpQ: number }> = {
  '1x12': { hp: 120, hpQ: 0.7, presFreq: 2500, presQ: 1.0, presGain: 2, lp: 5500, lpQ: 0.5 },
  '2x12': { hp: 80, hpQ: 0.5, presFreq: 2000, presQ: 1.5, presGain: 3, lp: 4500, lpQ: 0.6 },
  '4x12': { hp: 60, hpQ: 0.6, presFreq: 1600, presQ: 2.0, presGain: 4, lp: 3800, lpQ: 0.7 },
};

interface EffectsState {
  isActive: boolean;
  settings: EffectSettings;
  cabinetType: CabinetType;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  updateSetting: (key: keyof EffectSettings, value: number) => void;
  updateSettingsBulk: (patch: Partial<EffectSettings>) => void;
  resetSettings: () => void;
  setCabinetType: (c: CabinetType) => void;
}

// === Module-scoped audio engine state — exactly one instance app-wide ===
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let nodes: Record<string, AudioNode> = {};
let noiseGateRaf = 0;
let isTransitioning = false;

const MASTER_FADE_SEC = 0.06;
const MASTER_FADE_MS = 80;
const PARAM_TC = 0.05; // 50ms exponential time constant for parameter ramps

function ramp(param: AudioParam, value: number, tc = PARAM_TC) {
  const ctx = audioContext;
  if (!ctx) return;
  try {
    param.setTargetAtTime(value, ctx.currentTime, tc);
  } catch { /* AudioParam might be from a closed context */ }
}

function applyParamsToNodes(settings: EffectSettings, cabinetType: CabinetType) {
  const ctx = audioContext;
  const n = nodes;
  if (!ctx || !n.limiter) return; // not yet built

  // Distortion curve is discrete — swap it directly. The masterGain dip in transitions
  // hides on/off pops; mid-session sweeps may have minor artefacts at very large jumps.
  if (n.distortion) (n.distortion as WaveShaperNode).curve = makeTubeDistortionCurve(settings.distortion);
  if (n.preGain) ramp((n.preGain as GainNode).gain, settings.distortion < 0.05 ? 1 : 1 + settings.distortion * 6);
  if (n.postDistTone) ramp((n.postDistTone as BiquadFilterNode).frequency, settings.distortion < 0.05 ? 12000 : 6000 - settings.distortion * 1500);

  if (n.delay) ramp((n.delay as DelayNode).delayTime, settings.delayTime);
  if (n.delayGain) ramp((n.delayGain as GainNode).gain, settings.delay * 0.6);
  if (n.reverbGain) ramp((n.reverbGain as GainNode).gain, settings.reverb * 0.7);
  if (n.gain) ramp((n.gain as GainNode).gain, settings.gain);

  if (n.compressor) {
    ramp((n.compressor as DynamicsCompressorNode).threshold, -50 + settings.compressor * 40);
    ramp((n.compressor as DynamicsCompressorNode).ratio, 2 + settings.compressor * 10);
  }

  if (n.eqBass) ramp((n.eqBass as BiquadFilterNode).gain, (settings.eqBass - 0.5) * 12);
  if (n.eqMid) ramp((n.eqMid as BiquadFilterNode).gain, (settings.eqMid - 0.5) * 12);
  if (n.eqTreble) ramp((n.eqTreble as BiquadFilterNode).gain, (settings.eqTreble - 0.5) * 12);

  if (n.wah) {
    ramp((n.wah as BiquadFilterNode).frequency, 200 + settings.wahFreq * 3800);
    ramp((n.wah as BiquadFilterNode).Q, 2 + settings.wah * 10);
  }
  if (n.wahWet) ramp((n.wahWet as GainNode).gain, settings.wah);
  if (n.wahDry) ramp((n.wahDry as GainNode).gain, 1 - settings.wah);

  if (n.chorusWet) ramp((n.chorusWet as GainNode).gain, settings.chorus * 0.5);
  if (n.chorusLfo) ramp((n.chorusLfo as OscillatorNode).frequency, settings.chorusRate);

  if (n.flangerWet) ramp((n.flangerWet as GainNode).gain, settings.flanger);
  if (n.flangerLfo) ramp((n.flangerLfo as OscillatorNode).frequency, settings.flangerRate);

  if (n.phaserWet) ramp((n.phaserWet as GainNode).gain, settings.phaser);
  if (n.phaserLfo) ramp((n.phaserLfo as OscillatorNode).frequency, settings.phaserRate);

  if (n.tremoloLfoGain) ramp((n.tremoloLfoGain as GainNode).gain, settings.tremolo * 0.5);
  if (n.tremoloLfo) ramp((n.tremoloLfo as OscillatorNode).frequency, settings.tremoloRate);

  const cab = CAB_PARAMS[cabinetType];
  if (n.cabHigh) {
    ramp((n.cabHigh as BiquadFilterNode).frequency, cab.hp);
    ramp((n.cabHigh as BiquadFilterNode).Q, cab.hpQ);
  }
  if (n.cabPresence) {
    ramp((n.cabPresence as BiquadFilterNode).frequency, cab.presFreq);
    ramp((n.cabPresence as BiquadFilterNode).Q, cab.presQ);
    ramp((n.cabPresence as BiquadFilterNode).gain, cab.presGain);
  }
  if (n.cabLow) {
    ramp((n.cabLow as BiquadFilterNode).frequency, cab.lp);
    ramp((n.cabLow as BiquadFilterNode).Q, cab.lpQ);
  }
}

function teardownImmediate() {
  if (noiseGateRaf) cancelAnimationFrame(noiseGateRaf);
  noiseGateRaf = 0;
  ['chorusLfo', 'chorusLfo2', 'flangerLfo', 'phaserLfo', 'tremoloLfo'].forEach((k) => {
    try { (nodes[k] as OscillatorNode | undefined)?.stop(); } catch { /* ignore */ }
  });
  mediaStream?.getTracks().forEach((t) => t.stop());
  mediaStream = null;
  audioContext?.close().catch(() => { /* ignore */ });
  audioContext = null;
  nodes = {};
}

export const useGuitarEffects = create<EffectsState>((set, get) => ({
  isActive: false,
  settings: defaultSettings,
  cabinetType: '2x12',
  error: null,

  updateSetting: (key, value) => {
    set((s) => ({ settings: { ...s.settings, [key]: value } }));
    if (get().isActive) applyParamsToNodes(get().settings, get().cabinetType);
  },

  updateSettingsBulk: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    if (get().isActive) applyParamsToNodes(get().settings, get().cabinetType);
  },

  resetSettings: () => {
    set({ settings: defaultSettings });
    if (get().isActive) applyParamsToNodes(defaultSettings, get().cabinetType);
  },

  setCabinetType: (c) => {
    set({ cabinetType: c });
    if (get().isActive) applyParamsToNodes(get().settings, c);
  },

  start: async () => {
    if (isTransitioning || audioContext) return;
    isTransitioning = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
      mediaStream = stream;
      const ctx = new AudioContext({ sampleRate: 44100 });
      audioContext = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const n: Record<string, AudioNode> = {};
      const settings = get().settings;
      const cabinetType = get().cabinetType;

      // === INPUT STAGE ===
      n.noiseGateGain = ctx.createGain();
      (n.noiseGateGain as GainNode).gain.value = 1;
      n.noiseGateAnalyser = ctx.createAnalyser();
      (n.noiseGateAnalyser as AnalyserNode).fftSize = 256;
      (n.noiseGateAnalyser as AnalyserNode).smoothingTimeConstant = 0.8;

      n.compressor = ctx.createDynamicsCompressor();
      const comp = n.compressor as DynamicsCompressorNode;
      comp.threshold.value = -50 + settings.compressor * 40;
      comp.knee.value = 12;
      comp.ratio.value = 2 + settings.compressor * 10;
      comp.attack.value = 0.005;
      comp.release.value = 0.15;

      // === TONE SHAPING ===
      n.preDistFilter = ctx.createBiquadFilter();
      (n.preDistFilter as BiquadFilterNode).type = 'highpass';
      (n.preDistFilter as BiquadFilterNode).frequency.value = 80;
      (n.preDistFilter as BiquadFilterNode).Q.value = 0.7;

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
      (n.distortion as WaveShaperNode).curve = makeTubeDistortionCurve(settings.distortion);
      (n.distortion as WaveShaperNode).oversample = '4x';

      n.postDistTone = ctx.createBiquadFilter();
      (n.postDistTone as BiquadFilterNode).type = 'lowpass';
      (n.postDistTone as BiquadFilterNode).frequency.value = settings.distortion < 0.05 ? 12000 : 6000 - settings.distortion * 1500;
      (n.postDistTone as BiquadFilterNode).Q.value = 0.8;

      // === CABINET ===
      const cab = CAB_PARAMS[cabinetType];
      n.cabHigh = ctx.createBiquadFilter();
      (n.cabHigh as BiquadFilterNode).type = 'highpass';
      (n.cabHigh as BiquadFilterNode).frequency.value = cab.hp;
      (n.cabHigh as BiquadFilterNode).Q.value = cab.hpQ;

      n.cabPresence = ctx.createBiquadFilter();
      (n.cabPresence as BiquadFilterNode).type = 'peaking';
      (n.cabPresence as BiquadFilterNode).frequency.value = cab.presFreq;
      (n.cabPresence as BiquadFilterNode).Q.value = cab.presQ;
      (n.cabPresence as BiquadFilterNode).gain.value = cab.presGain;

      n.cabLow = ctx.createBiquadFilter();
      (n.cabLow as BiquadFilterNode).type = 'lowpass';
      (n.cabLow as BiquadFilterNode).frequency.value = cab.lp;
      (n.cabLow as BiquadFilterNode).Q.value = cab.lpQ;

      // === WAH ===
      n.wah = ctx.createBiquadFilter();
      (n.wah as BiquadFilterNode).type = 'bandpass';
      (n.wah as BiquadFilterNode).frequency.value = 200 + settings.wahFreq * 3800;
      (n.wah as BiquadFilterNode).Q.value = 2 + settings.wah * 10;
      n.wahDry = ctx.createGain();
      n.wahWet = ctx.createGain();
      (n.wahDry as GainNode).gain.value = 1 - settings.wah;
      (n.wahWet as GainNode).gain.value = settings.wah;

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

      // === PHASER 6-stage ===
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
      phaserStages.forEach((s) => (n.phaserLfoGain as GainNode).connect(s.frequency));
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

      // === DELAY ===
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

      // === Output limiter + master gain (NEW) ===
      n.limiter = ctx.createDynamicsCompressor();
      const limiter = n.limiter as DynamicsCompressorNode;
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;

      n.masterGain = ctx.createGain();
      (n.masterGain as GainNode).gain.value = 0; // start muted; ramp up after wiring

      // === SIGNAL CHAIN ===
      source.connect(n.noiseGateAnalyser);
      source.connect(n.noiseGateGain);
      (n.noiseGateGain as GainNode).connect(n.compressor);
      (n.compressor as DynamicsCompressorNode).connect(n.preDistFilter);
      (n.preDistFilter as BiquadFilterNode).connect(n.eqBass);
      (n.eqBass as BiquadFilterNode).connect(n.eqMid);
      (n.eqMid as BiquadFilterNode).connect(n.eqTreble);

      (n.eqTreble as BiquadFilterNode).connect(n.preGain);
      (n.preGain as GainNode).connect(n.distortion);
      (n.distortion as WaveShaperNode).connect(n.postDistTone);
      (n.postDistTone as BiquadFilterNode).connect(n.cabHigh);
      (n.cabHigh as BiquadFilterNode).connect(n.cabPresence);
      (n.cabPresence as BiquadFilterNode).connect(n.cabLow);

      const postCab = n.cabLow;
      postCab.connect(n.wahWet as GainNode);
      (n.wahWet as GainNode).connect(n.wah);
      postCab.connect(n.wahDry as GainNode);
      const wahMerge = ctx.createGain();
      n.wahMerge = wahMerge;
      (n.wah as BiquadFilterNode).connect(wahMerge);
      (n.wahDry as GainNode).connect(wahMerge);

      wahMerge.connect(n.gain);

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

      chorusMerge.connect(flangerDelay);
      flangerDelay.connect(n.flangerFeedback as GainNode);
      (n.flangerFeedback as GainNode).connect(flangerDelay);
      flangerDelay.connect(n.flangerWet as GainNode);
      chorusMerge.connect(n.flangerDry as GainNode);

      const flangerMerge = ctx.createGain();
      n.flangerMerge = flangerMerge;
      (n.flangerWet as GainNode).connect(flangerMerge);
      (n.flangerDry as GainNode).connect(flangerMerge);

      flangerMerge.connect(phaserStages[0]);
      for (let i = 0; i < phaserStages.length - 1; i++) phaserStages[i].connect(phaserStages[i + 1]);
      phaserStages[phaserStages.length - 1].connect(n.phaserWet as GainNode);
      flangerMerge.connect(n.phaserDry as GainNode);

      const phaserMerge = ctx.createGain();
      n.phaserMerge = phaserMerge;
      (n.phaserWet as GainNode).connect(phaserMerge);
      (n.phaserDry as GainNode).connect(phaserMerge);

      phaserMerge.connect(n.tremoloGain);

      (n.tremoloGain as GainNode).connect(n.delay as DelayNode);
      (n.delay as DelayNode).connect(n.delayFilter as BiquadFilterNode);
      (n.delayFilter as BiquadFilterNode).connect(n.delayDamping as BiquadFilterNode);
      (n.delayDamping as BiquadFilterNode).connect(n.delayGain as GainNode);
      (n.delayGain as GainNode).connect(n.delay as DelayNode);
      (n.delayGain as GainNode).connect(n.dryGain as GainNode);
      (n.tremoloGain as GainNode).connect(n.dryGain as GainNode);

      (n.dryGain as GainNode).connect(n.convolver as ConvolverNode);
      (n.convolver as ConvolverNode).connect(n.reverbGain as GainNode);
      (n.dryGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.reverbGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.limiter as DynamicsCompressorNode).connect(n.masterGain);
      (n.masterGain as GainNode).connect(ctx.destination);

      (n as Record<string, unknown>)._phaserStages = phaserStages;
      nodes = n;

      // === NOISE GATE rAF poll ===
      const analyserData = new Uint8Array((n.noiseGateAnalyser as AnalyserNode).frequencyBinCount);
      let gateOpen = true;
      const pollGate = () => {
        if (!audioContext) return;
        const analyser = nodes.noiseGateAnalyser as AnalyserNode | undefined;
        const gateGain = nodes.noiseGateGain as GainNode | undefined;
        if (!analyser || !gateGain) return;
        analyser.getByteFrequencyData(analyserData);
        let sum = 0;
        for (let i = 0; i < analyserData.length; i++) sum += analyserData[i];
        const avg = sum / analyserData.length / 255;
        const currentSettings = useGuitarEffects.getState().settings;
        const threshold = currentSettings.noiseGate * 0.15;
        if (currentSettings.noiseGate < 0.05) {
          if (!gateOpen) {
            gateGain.gain.setTargetAtTime(1, audioContext.currentTime, 0.005);
            gateOpen = true;
          }
        } else if (avg > threshold) {
          if (!gateOpen) {
            gateGain.gain.setTargetAtTime(1, audioContext.currentTime, 0.005);
            gateOpen = true;
          }
        } else {
          if (gateOpen) {
            gateGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
            gateOpen = false;
          }
        }
        noiseGateRaf = requestAnimationFrame(pollGate);
      };
      noiseGateRaf = requestAnimationFrame(pollGate);

      // === Master gain fade-in ===
      const t = ctx.currentTime;
      (n.masterGain as GainNode).gain.cancelScheduledValues(t);
      (n.masterGain as GainNode).gain.setValueAtTime(0, t);
      (n.masterGain as GainNode).gain.linearRampToValueAtTime(1, t + MASTER_FADE_SEC);

      set({ isActive: true, error: null });
    } catch {
      set({ error: 'Could not access microphone for effects processing' });
      teardownImmediate();
    } finally {
      isTransitioning = false;
    }
  },

  stop: () => {
    if (isTransitioning) return;
    const ctx = audioContext;
    const masterGain = nodes.masterGain as GainNode | undefined;
    if (!ctx || !masterGain) {
      teardownImmediate();
      set({ isActive: false });
      return;
    }
    isTransitioning = true;
    const t = ctx.currentTime;
    const cur = masterGain.gain.value;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setValueAtTime(cur, t);
    masterGain.gain.linearRampToValueAtTime(0, t + MASTER_FADE_SEC);
    setTimeout(() => {
      teardownImmediate();
      set({ isActive: false });
      isTransitioning = false;
    }, MASTER_FADE_MS);
  },
}));

// HMR cleanup — close the live engine when this module hot-reloads in dev
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownImmediate();
    isTransitioning = false;
  });
}
