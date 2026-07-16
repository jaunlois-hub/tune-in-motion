import { useState, useRef, useCallback, useEffect } from 'react';
import { buildAudioConstraints, registerAudioContext } from './useAudioDevices';
import { createMasterGain } from './useMasterVolume';

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
  postEqBass: number;
  postEqMid: number;
  postEqTreble: number;
  wah: number;
  wahFreq: number;
  tremolo: number;
  tremoloRate: number;
  octaver: number;
  octaverMix: number;
  // ---- "weird" effects ----
  ringMod: number;        // 0..1 wet mix
  ringModFreq: number;    // 30..2000 Hz carrier
  bitcrush: number;       // 0..1 wet mix
  bitcrushBits: number;   // 2..16 bit depth
  autoWah: number;        // 0..1 wet mix
  autoWahSens: number;    // 0..1 envelope sensitivity
  // ---- "glitch" effects ----
  stutter: number;        // 0..1 wet mix (square-wave gate)
  stutterRate: number;    // 2..32 Hz gate rate
  glitch: number;         // 0..1 wet mix (short high-feedback slice)
  glitchTime: number;     // 0.03..0.3 s slice length
  warble: number;         // 0..1 wet mix (sample-and-hold delayTime modulation)
  warbleRate: number;     // 2..30 Hz random-step rate
  // ---- IR (impulse response) tonality slot ----
  irWet: number;          // 0..1 wet mix for user-loaded convolver
}

const defaultSettings: EffectSettings = {
  reverb: 0, delay: 0, delayTime: 0.3, distortion: 0, gain: 0.8,
  chorus: 0, chorusRate: 1.5,
  flanger: 0, flangerRate: 0.5,
  phaser: 0, phaserRate: 0.8,
  compressor: 0, noiseGate: 0,
  eqBass: 0.5, eqMid: 0.5, eqTreble: 0.5,
  postEqBass: 0.5, postEqMid: 0.5, postEqTreble: 0.5,
  wah: 0, wahFreq: 0.5,
  tremolo: 0, tremoloRate: 5,
  octaver: 0, octaverMix: 0.5,
  ringMod: 0, ringModFreq: 220,
  bitcrush: 0, bitcrushBits: 8,
  autoWah: 0, autoWahSens: 0.5,
  stutter: 0, stutterRate: 8,
  glitch: 0, glitchTime: 0.12,
  warble: 0, warbleRate: 10,
  irWet: 0.6,
};

/**
 * Bitcrusher waveshaper curve — quantizes input amplitude to 2^bits steps.
 * Lower bits = more glitchy/lo-fi. No sample-rate reduction (would need a worklet)
 * but bit depth alone gives that gritty digital character.
 */
function makeBitcrusherCurve(bits: number): Float32Array {
  const samples = 4096;
  const curve = new Float32Array(samples);
  const steps = Math.max(2, Math.pow(2, Math.max(1, Math.min(16, bits))));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
}

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

/**
 * Power-amp stage: symmetric soft-clip, always engaged. Models class-AB push-pull tube power amp —
 * lighter than the preamp (less harmonic generation) but adds the compression/warmth real amps have.
 * Drive scales with preamp distortion so cranking gain pushes the power section harder, like a real amp.
 */
function makePowerAmpCurve(amount: number): Float32Array {
  const samples = 4096;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 2.2; // amount 0.3..0.8 → drive 1.66..2.76
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * drive) * 0.95;
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

export function useGuitarEffects() {
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState<EffectSettings>(defaultSettings);
  const [cabinetType, setCabinetType] = useState<CabinetType>('2x12');
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nodesRef = useRef<Record<string, AudioNode>>({});
  const noiseGateRafRef = useRef<number>(0);
  const autoWahRafRef = useRef<number>(0);
  const releaseCtxRef = useRef<(() => void) | null>(null);
  const releaseMasterRef = useRef<(() => void) | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  // Cabinet IR buffers, populated at start() if files exist in public/ir/cab/
  const cabBuffersRef = useRef<Partial<Record<CabinetType, AudioBuffer>>>({});

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints());
      mediaStreamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = ctx;
      releaseCtxRef.current = registerAudioContext(ctx);
      if (ctx.state === 'suspended') {
        await ctx.resume().catch((err) => console.warn('AudioContext resume failed', err));
      }
      const { master, release: releaseMaster } = createMasterGain(ctx);
      masterGainRef.current = master;
      releaseMasterRef.current = releaseMaster;

      // Load IRs (best-effort — falls back to biquads/synthetic if any are missing)
      const tryLoad = async (path: string): Promise<AudioBuffer | null> => {
        try {
          const res = await fetch(path);
          if (!res.ok) return null;
          return await ctx.decodeAudioData(await res.arrayBuffer());
        } catch { return null; }
      };
      const cabBuffers: Partial<Record<CabinetType, AudioBuffer>> = {};
      let reverbBuffer: AudioBuffer | null = null;
      await Promise.all([
        tryLoad('/ir/cab/1x12.wav').then(b => { if (b) cabBuffers['1x12'] = b; }),
        tryLoad('/ir/cab/2x12.wav').then(b => { if (b) cabBuffers['2x12'] = b; }),
        tryLoad('/ir/cab/4x12.wav').then(b => { if (b) cabBuffers['4x12'] = b; }),
        tryLoad('/ir/reverb.wav').then(b => { reverbBuffer = b; }),
      ]);
      const useCabIR = !!(cabBuffers['1x12'] && cabBuffers['2x12'] && cabBuffers['4x12']);
      cabBuffersRef.current = cabBuffers;
      if (!useCabIR && (cabBuffers['1x12'] || cabBuffers['2x12'] || cabBuffers['4x12'])) {
        console.info('[guitar effects] partial cab IRs found — biquad fallback engaged. Drop in all 3 (.wav at /ir/cab/{1x12,2x12,4x12}.wav) to enable convolution.');
      }

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

      // DC blocker — asymmetric clipping creates DC offset that eats headroom and pumps the limiter
      n.dcBlocker = ctx.createBiquadFilter();
      (n.dcBlocker as BiquadFilterNode).type = 'highpass';
      (n.dcBlocker as BiquadFilterNode).frequency.value = 20;
      (n.dcBlocker as BiquadFilterNode).Q.value = 0.707;

      // Power-amp stage — light symmetric saturation, always engaged. Drive tracks preamp gain.
      n.powerAmp = ctx.createWaveShaper();
      const powerAmpAmount = 0.3 + settings.distortion * 0.4;
      (n.powerAmp as WaveShaperNode).curve = makePowerAmpCurve(powerAmpAmount) as Float32Array<ArrayBuffer>;
      (n.powerAmp as WaveShaperNode).oversample = '2x';

      // Post-distortion tone control
      n.postDistTone = ctx.createBiquadFilter();
      (n.postDistTone as BiquadFilterNode).type = 'lowpass';
      const toneFreq = settings.distortion < 0.05 ? 12000 : 6000 - settings.distortion * 1500;
      (n.postDistTone as BiquadFilterNode).frequency.value = toneFreq;
      (n.postDistTone as BiquadFilterNode).Q.value = 0.8;

      // === CABINET SIMULATION ===
      // Convolution (real IR) if all 3 cab IRs loaded; otherwise 3-biquad approximation.
      if (useCabIR) {
        n.cabConvolver = ctx.createConvolver();
        (n.cabConvolver as ConvolverNode).normalize = true;
        (n.cabConvolver as ConvolverNode).buffer = cabBuffers[cabinetType]!;
      } else {
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
      }

      // === POST-CAB EQ (tone stack) ===
      // Cuts/boosts after the cabinet so it can fix mud/harshness in the final tone,
      // independent of the pre-distortion EQ which only shapes input.
      n.postEqBass = ctx.createBiquadFilter();
      (n.postEqBass as BiquadFilterNode).type = 'lowshelf';
      (n.postEqBass as BiquadFilterNode).frequency.value = 250;
      (n.postEqBass as BiquadFilterNode).gain.value = (settings.postEqBass - 0.5) * 12;

      n.postEqMid = ctx.createBiquadFilter();
      (n.postEqMid as BiquadFilterNode).type = 'peaking';
      (n.postEqMid as BiquadFilterNode).frequency.value = 1200;
      (n.postEqMid as BiquadFilterNode).Q.value = 0.9;
      (n.postEqMid as BiquadFilterNode).gain.value = (settings.postEqMid - 0.5) * 12;

      n.postEqTreble = ctx.createBiquadFilter();
      (n.postEqTreble as BiquadFilterNode).type = 'highshelf';
      (n.postEqTreble as BiquadFilterNode).frequency.value = 4000;
      (n.postEqTreble as BiquadFilterNode).gain.value = (settings.postEqTreble - 0.5) * 12;

      // === WAH ===
      n.wah = ctx.createBiquadFilter();
      (n.wah as BiquadFilterNode).type = 'bandpass';
      (n.wah as BiquadFilterNode).frequency.value = 200 + settings.wahFreq * 3800;
      (n.wah as BiquadFilterNode).Q.value = 2 + settings.wah * 4;
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
      // Phaser feedback: last stage → first stage. This is what gives Phase 90/Small Stone their throaty resonance.
      n.phaserFeedback = ctx.createGain();
      (n.phaserFeedback as GainNode).gain.value = 0.5;

      // === TREMOLO ===
      // Tremolo: base = 1 - depth/2, lfo amplitude = depth/2 → output swings 1-depth..1
      // At depth=0 stays at unity; at depth=1 swings 0..1 (no above-unity overshoot into limiter)
      n.tremoloGain = ctx.createGain();
      (n.tremoloGain as GainNode).gain.value = 1 - settings.tremolo * 0.5;
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
      // Use real IR if /ir/reverb.wav exists; else fall back to synthetic noise-based IR.
      n.convolver = ctx.createConvolver();
      (n.convolver as ConvolverNode).buffer = reverbBuffer ?? createRealisticReverb(ctx, 2.5, 2.5, 0.02);
      n.reverbGain = ctx.createGain();
      (n.reverbGain as GainNode).gain.value = settings.reverb * 0.7;
      n.dryGain = ctx.createGain();
      (n.dryGain as GainNode).gain.value = 1;

      // === RING MODULATOR ===
      // Multiplies input × sine carrier. carrier gain modulated by oscillator → AM/ring mod.
      n.ringModCarrier = ctx.createGain();
      (n.ringModCarrier as GainNode).gain.value = 0;
      n.ringModOsc = ctx.createOscillator();
      (n.ringModOsc as OscillatorNode).type = 'sine';
      (n.ringModOsc as OscillatorNode).frequency.value = settings.ringModFreq;
      (n.ringModOsc as OscillatorNode).connect((n.ringModCarrier as GainNode).gain);
      (n.ringModOsc as OscillatorNode).start();
      n.ringModWet = ctx.createGain();
      (n.ringModWet as GainNode).gain.value = settings.ringMod;
      n.ringModDry = ctx.createGain();
      (n.ringModDry as GainNode).gain.value = 1 - settings.ringMod * 0.6;

      // === BITCRUSHER (bit-depth quantization) ===
      n.bitcrush = ctx.createWaveShaper();
      (n.bitcrush as WaveShaperNode).curve = makeBitcrusherCurve(settings.bitcrushBits) as Float32Array<ArrayBuffer>;
      (n.bitcrush as WaveShaperNode).oversample = 'none'; // crunchier aliasing — intentional for this effect
      n.bitcrushWet = ctx.createGain();
      (n.bitcrushWet as GainNode).gain.value = settings.bitcrush;
      n.bitcrushDry = ctx.createGain();
      (n.bitcrushDry as GainNode).gain.value = 1 - settings.bitcrush * 0.7;

      // === AUTO-WAH (envelope-follower bandpass) ===
      // Envelope analyser sniffs pre-effect level; rAF loop sweeps the bandpass freq.
      n.autoWahAnalyser = ctx.createAnalyser();
      (n.autoWahAnalyser as AnalyserNode).fftSize = 256;
      (n.autoWahAnalyser as AnalyserNode).smoothingTimeConstant = 0.6;
      n.autoWahFilter = ctx.createBiquadFilter();
      (n.autoWahFilter as BiquadFilterNode).type = 'bandpass';
      (n.autoWahFilter as BiquadFilterNode).frequency.value = 400;
      (n.autoWahFilter as BiquadFilterNode).Q.value = 5;
      n.autoWahWet = ctx.createGain();
      (n.autoWahWet as GainNode).gain.value = settings.autoWah;
      n.autoWahDry = ctx.createGain();
      (n.autoWahDry as GainNode).gain.value = 1 - settings.autoWah * 0.5;

      // === Output limiter ===
      n.limiter = ctx.createDynamicsCompressor();
      const limiter = n.limiter as DynamicsCompressorNode;
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;

      // === STUTTER (square-wave gate) ===
      // LFO with square wave modulates gain between (1-wet) and 1 → tremolo/gate effect
      n.stutterGain = ctx.createGain();
      (n.stutterGain as GainNode).gain.value = 1;
      n.stutterLfo = ctx.createOscillator();
      (n.stutterLfo as OscillatorNode).type = 'square';
      (n.stutterLfo as OscillatorNode).frequency.value = settings.stutterRate;
      n.stutterLfoGain = ctx.createGain();
      (n.stutterLfoGain as GainNode).gain.value = settings.stutter * 0.5;
      (n.stutterLfo as OscillatorNode).connect(n.stutterLfoGain as GainNode);
      (n.stutterLfoGain as GainNode).connect((n.stutterGain as GainNode).gain);
      (n.stutterLfo as OscillatorNode).start();

      // === GLITCH (short slice with high feedback) ===
      n.glitchDelay = ctx.createDelay(0.5);
      (n.glitchDelay as DelayNode).delayTime.value = settings.glitchTime;
      n.glitchFeedback = ctx.createGain();
      (n.glitchFeedback as GainNode).gain.value = settings.glitch * 0.75;
      n.glitchWet = ctx.createGain();
      (n.glitchWet as GainNode).gain.value = settings.glitch;
      n.glitchDry = ctx.createGain();
      (n.glitchDry as GainNode).gain.value = 1;

      // === WARBLE (sample-and-hold delayTime modulation) ===
      // Tiny delay whose delayTime jumps to random values → tape-drop/granular character
      n.warbleDelay = ctx.createDelay(0.04);
      (n.warbleDelay as DelayNode).delayTime.value = 0.005;
      n.warbleWet = ctx.createGain();
      (n.warbleWet as GainNode).gain.value = settings.warble;
      n.warbleDry = ctx.createGain();
      (n.warbleDry as GainNode).gain.value = 1;

      // === USER IR CONVOLVER (tonality slot) ===
      // Always in graph; buffer is null until user loads an IR. Wet=0 when no buffer.
      n.userConvolver = ctx.createConvolver();
      (n.userConvolver as ConvolverNode).normalize = true;
      n.userConvolverWet = ctx.createGain();
      (n.userConvolverWet as GainNode).gain.value = 0; // starts silent (no IR loaded)
      n.userConvolverDry = ctx.createGain();
      (n.userConvolverDry as GainNode).gain.value = 1;

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
      (n.distortion as WaveShaperNode).connect(n.dcBlocker);
      (n.dcBlocker as BiquadFilterNode).connect(n.powerAmp);
      (n.powerAmp as WaveShaperNode).connect(n.postDistTone);
      let cabOut: AudioNode;
      if (useCabIR) {
        (n.postDistTone as BiquadFilterNode).connect(n.cabConvolver);
        cabOut = n.cabConvolver;
      } else {
        (n.postDistTone as BiquadFilterNode).connect(n.cabHigh);
        (n.cabHigh as BiquadFilterNode).connect(n.cabPresence);
        (n.cabPresence as BiquadFilterNode).connect(n.cabLow);
        cabOut = n.cabLow;
      }

      // → user IR convolver (tonality slot) — wet/dry mix around cabOut
      cabOut.connect(n.userConvolver as ConvolverNode);
      (n.userConvolver as ConvolverNode).connect(n.userConvolverWet as GainNode);
      cabOut.connect(n.userConvolverDry as GainNode);
      const userIrMerge = ctx.createGain();
      n.userIrMerge = userIrMerge;
      (n.userConvolverWet as GainNode).connect(userIrMerge);
      (n.userConvolverDry as GainNode).connect(userIrMerge);

      // → post-cab tone stack
      userIrMerge.connect(n.postEqBass);
      (n.postEqBass as BiquadFilterNode).connect(n.postEqMid);
      (n.postEqMid as BiquadFilterNode).connect(n.postEqTreble);
      const postCab: AudioNode = n.postEqTreble;

      // → wah split/merge
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
      // Feedback path: last stage → feedback gain → first stage (Web Audio inserts a 1-block delay)
      phaserStages[phaserStages.length - 1].connect(n.phaserFeedback as GainNode);
      (n.phaserFeedback as GainNode).connect(phaserStages[0]);
      flangerMerge.connect(n.phaserDry as GainNode);

      const phaserMerge = ctx.createGain();
      n.phaserMerge = phaserMerge;
      (n.phaserWet as GainNode).connect(phaserMerge);
      (n.phaserDry as GainNode).connect(phaserMerge);

      // → tremolo
      phaserMerge.connect(n.tremoloGain);

      // → ring modulator (input × sine carrier) + dry
      (n.tremoloGain as GainNode).connect(n.ringModCarrier as GainNode);
      (n.ringModCarrier as GainNode).connect(n.ringModWet as GainNode);
      (n.tremoloGain as GainNode).connect(n.ringModDry as GainNode);
      const ringModMerge = ctx.createGain();
      n.ringModMerge = ringModMerge;
      (n.ringModWet as GainNode).connect(ringModMerge);
      (n.ringModDry as GainNode).connect(ringModMerge);

      // → bitcrusher + dry
      ringModMerge.connect(n.bitcrush as WaveShaperNode);
      (n.bitcrush as WaveShaperNode).connect(n.bitcrushWet as GainNode);
      ringModMerge.connect(n.bitcrushDry as GainNode);
      const bitcrushMerge = ctx.createGain();
      n.bitcrushMerge = bitcrushMerge;
      (n.bitcrushWet as GainNode).connect(bitcrushMerge);
      (n.bitcrushDry as GainNode).connect(bitcrushMerge);

      // → auto-wah envelope follower (analyser taps pre-filter, rAF sweeps freq)
      bitcrushMerge.connect(n.autoWahAnalyser as AnalyserNode);
      bitcrushMerge.connect(n.autoWahFilter as BiquadFilterNode);
      (n.autoWahFilter as BiquadFilterNode).connect(n.autoWahWet as GainNode);
      bitcrushMerge.connect(n.autoWahDry as GainNode);
      const autoWahMerge = ctx.createGain();
      n.autoWahMerge = autoWahMerge;
      (n.autoWahWet as GainNode).connect(autoWahMerge);
      (n.autoWahDry as GainNode).connect(autoWahMerge);

      // → warble (parallel wet delay w/ S&H modulated delayTime)
      autoWahMerge.connect(n.warbleDelay as DelayNode);
      (n.warbleDelay as DelayNode).connect(n.warbleWet as GainNode);
      autoWahMerge.connect(n.warbleDry as GainNode);
      const warbleMerge = ctx.createGain();
      n.warbleMerge = warbleMerge;
      (n.warbleWet as GainNode).connect(warbleMerge);
      (n.warbleDry as GainNode).connect(warbleMerge);

      // → glitch (short high-feedback slice) — parallel wet delay
      warbleMerge.connect(n.glitchDelay as DelayNode);
      (n.glitchDelay as DelayNode).connect(n.glitchFeedback as GainNode);
      (n.glitchFeedback as GainNode).connect(n.glitchDelay as DelayNode);
      (n.glitchDelay as DelayNode).connect(n.glitchWet as GainNode);
      warbleMerge.connect(n.glitchDry as GainNode);
      const glitchMerge = ctx.createGain();
      n.glitchMerge = glitchMerge;
      (n.glitchWet as GainNode).connect(glitchMerge);
      (n.glitchDry as GainNode).connect(glitchMerge);

      // → stutter (square-wave gate on gain, inline)
      glitchMerge.connect(n.stutterGain as GainNode);

      // → delay (with filtered feedback), fed from stutter output
      (n.stutterGain as GainNode).connect(n.delay as DelayNode);
      (n.delay as DelayNode).connect(n.delayFilter as BiquadFilterNode);
      (n.delayFilter as BiquadFilterNode).connect(n.delayDamping as BiquadFilterNode);
      (n.delayDamping as BiquadFilterNode).connect(n.delayGain as GainNode);
      (n.delayGain as GainNode).connect(n.delay as DelayNode);
      (n.delayGain as GainNode).connect(n.dryGain as GainNode);
      (n.stutterGain as GainNode).connect(n.dryGain as GainNode);

      // → reverb → limiter → output
      (n.dryGain as GainNode).connect(n.convolver as ConvolverNode);
      (n.convolver as ConvolverNode).connect(n.reverbGain as GainNode);
      (n.dryGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.reverbGain as GainNode).connect(n.limiter as DynamicsCompressorNode);
      (n.limiter as DynamicsCompressorNode).connect(masterGainRef.current ?? ctx.destination);

      (nodesRef.current as Record<string, unknown>)._phaserStages = phaserStages;

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

      // === AUTO-WAH: rAF envelope follower modulating bandpass freq ===
      const wahData = new Uint8Array((n.autoWahAnalyser as AnalyserNode).frequencyBinCount);
      let wahEnv = 0;
      const pollWah = () => {
        if (!audioContextRef.current) return;
        const an = nodesRef.current.autoWahAnalyser as AnalyserNode | undefined;
        const filt = nodesRef.current.autoWahFilter as BiquadFilterNode | undefined;
        if (!an || !filt) return;
        an.getByteTimeDomainData(wahData);
        let peak = 0;
        for (let i = 0; i < wahData.length; i++) {
          const v = Math.abs(wahData[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        // Smooth envelope (attack faster than release)
        const target = peak;
        wahEnv += (target - wahEnv) * (target > wahEnv ? 0.35 : 0.06);
        const sens = settingsRef.current.autoWahSens;
        const freq = 200 + Math.min(1, wahEnv * (1 + sens * 5)) * 2800;
        filt.frequency.setTargetAtTime(freq, audioContextRef.current!.currentTime, 0.01);
        autoWahRafRef.current = requestAnimationFrame(pollWah);
      };
      autoWahRafRef.current = requestAnimationFrame(pollWah);

      setIsActive(true);
      setError(null);
    } catch { setError('Could not access microphone for effects processing'); }
  }, [settings, cabinetType]);

  // Keep a ref to settings for the noise gate rAF callback
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const stop = useCallback(() => {
    if (noiseGateRafRef.current) cancelAnimationFrame(noiseGateRafRef.current);
    if (autoWahRafRef.current) cancelAnimationFrame(autoWahRafRef.current);
    ['chorusLfo', 'chorusLfo2', 'flangerLfo', 'phaserLfo', 'tremoloLfo', 'ringModOsc'].forEach(k => {
      try { (nodesRef.current[k] as OscillatorNode)?.stop(); } catch { /* already stopped */ }
    });
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    releaseMasterRef.current?.();
    releaseCtxRef.current?.();
    releaseMasterRef.current = null;
    releaseCtxRef.current = null;
    masterGainRef.current = null;
    audioContextRef.current?.close().catch((err) => console.warn('AudioContext close failed', err));
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
    // Post-cab tone stack
    if (n.postEqBass) (n.postEqBass as BiquadFilterNode).gain.value = (settings.postEqBass - 0.5) * 12;
    if (n.postEqMid) (n.postEqMid as BiquadFilterNode).gain.value = (settings.postEqMid - 0.5) * 12;
    if (n.postEqTreble) (n.postEqTreble as BiquadFilterNode).gain.value = (settings.postEqTreble - 0.5) * 12;
    // Power amp drive tracks preamp distortion
    if (n.powerAmp) {
      const amt = 0.3 + settings.distortion * 0.4;
      (n.powerAmp as WaveShaperNode).curve = makePowerAmpCurve(amt) as Float32Array<ArrayBuffer>;
    }
    // Wah
    if (n.wah) {
      (n.wah as BiquadFilterNode).frequency.value = 200 + settings.wahFreq * 3800;
      (n.wah as BiquadFilterNode).Q.value = 2 + settings.wah * 4;
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
    if (n.tremoloGain) (n.tremoloGain as GainNode).gain.value = 1 - settings.tremolo * 0.5;
    if (n.tremoloLfoGain) (n.tremoloLfoGain as GainNode).gain.value = settings.tremolo * 0.5;
    if (n.tremoloLfo) (n.tremoloLfo as OscillatorNode).frequency.value = settings.tremoloRate;
    // Ring modulator
    if (n.ringModWet) (n.ringModWet as GainNode).gain.value = settings.ringMod;
    if (n.ringModDry) (n.ringModDry as GainNode).gain.value = 1 - settings.ringMod * 0.6;
    if (n.ringModOsc) (n.ringModOsc as OscillatorNode).frequency.value = settings.ringModFreq;
    // Bitcrusher
    if (n.bitcrush) (n.bitcrush as WaveShaperNode).curve = makeBitcrusherCurve(settings.bitcrushBits) as Float32Array<ArrayBuffer>;
    if (n.bitcrushWet) (n.bitcrushWet as GainNode).gain.value = settings.bitcrush;
    if (n.bitcrushDry) (n.bitcrushDry as GainNode).gain.value = 1 - settings.bitcrush * 0.7;
    // Auto-wah (depth is mix; freq sweep handled by rAF using autoWahSens ref)
    if (n.autoWahWet) (n.autoWahWet as GainNode).gain.value = settings.autoWah;
    if (n.autoWahDry) (n.autoWahDry as GainNode).gain.value = 1 - settings.autoWah * 0.5;
    // Cabinet type — IR path: swap convolver buffer; biquad path: retune filters.
    if (n.cabConvolver) {
      const buf = cabBuffersRef.current[cabinetType];
      if (buf) (n.cabConvolver as ConvolverNode).buffer = buf;
    }
    const cab = CAB_PARAMS[cabinetType];
    if (n.cabHigh) {
      (n.cabHigh as BiquadFilterNode).frequency.value = cab.hp;
      (n.cabHigh as BiquadFilterNode).Q.value = cab.hpQ;
    }
    if (n.cabPresence) {
      (n.cabPresence as BiquadFilterNode).frequency.value = cab.presFreq;
      (n.cabPresence as BiquadFilterNode).Q.value = cab.presQ;
      (n.cabPresence as BiquadFilterNode).gain.value = cab.presGain;
    }
    if (n.cabLow) {
      (n.cabLow as BiquadFilterNode).frequency.value = cab.lp;
      (n.cabLow as BiquadFilterNode).Q.value = cab.lpQ;
    }
  }, [settings, isActive, cabinetType]);

  const updateSetting = useCallback((key: keyof EffectSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => { setSettings(defaultSettings); }, []);

  useEffect(() => { return () => { stop(); }; }, [stop]);

  return { isActive, settings, error, start, stop, updateSetting, resetSettings, cabinetType, setCabinetType };
}
