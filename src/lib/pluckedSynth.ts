// Safe plucked-string synthesis.
//
// This intentionally avoids delay-feedback / Karplus-Strong loops. Tiny Web Audio
// feedback cycles can become unstable on some browsers/devices and produce a
// piercing high-frequency squeal. Instead we render a short harmonic pluck buffer
// with a decaying body and a damped pick transient, then play it back at pitch.

const REF_FREQ = 196; // G3 — mid-range so playbackRate doesn't stretch extremes too far
const RENDER_SECONDS = 2.4;

// Per-AudioContext cache (different sample rates render different buffers)
const cacheByCtx = new WeakMap<AudioContext, AudioBuffer>();

export async function ensurePluckBuffer(ctx: AudioContext): Promise<AudioBuffer> {
  const cached = cacheByCtx.get(ctx);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const totalSamples = Math.floor(sr * RENDER_SECONDS);
  const buffer = ctx.createBuffer(1, totalSamples, sr);
  const data = buffer.getChannelData(0);
  let previousNoise = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sr;
    const bodyEnv = Math.exp(-t * 3.4);
    const brightnessEnv = Math.exp(-t * 10);
    const pickEnv = Math.exp(-t * 95);
    let sample = 0;

    for (let h = 1; h <= 10; h++) {
      const harmonicRollOff = 1 / (h * 1.18);
      const harmonicDamping = h <= 3 ? bodyEnv : brightnessEnv;
      const detune = 1 + (h % 2 === 0 ? 0.0015 : -0.001);
      sample += Math.sin(2 * Math.PI * REF_FREQ * h * detune * t) * harmonicRollOff * harmonicDamping;
    }

    const noise = Math.random() * 2 - 1;
    const highpassedNoise = noise - previousNoise;
    previousNoise = noise;
    sample += highpassedNoise * pickEnv * 0.08;

    // Fixed headroom: prevents clipped stacked chords even before the master limiter.
    data[i] = Math.max(-0.85, Math.min(0.85, sample * 0.34));
  }

  cacheByCtx.set(ctx, buffer);
  return buffer;
}

export interface PluckedNoteHandle {
  stop: () => void;
  source: AudioBufferSourceNode;
}

/**
 * Play a single plucked note.
 *
 * The note holds at near-peak velocity for `duration` seconds (the rhythmic length),
 * then releases exponentially over `releaseTime` (default 1.4 s) so the string
 * "rings out" naturally. This means short rhythmic notes still get a long sustain
 * tail — exactly like a real guitar where notes ring until either you damp them
 * or the next note's pluck takes over.
 *
 * @param ctx       audio context
 * @param buffer    pre-rendered pluck buffer (from ensurePluckBuffer)
 * @param freq      note frequency in Hz
 * @param startTime AudioContext time at which to start
 * @param duration  rhythmic note duration in seconds (sustain held at peak for this long)
 * @param velocity  peak gain 0..1 (default 0.65)
 * @param destination optional destination (defaults to ctx.destination)
 * @param releaseTime length of natural ring-out tail past `duration` (default 1.4 s)
 */
export function playPluckedNote(
  ctx: AudioContext,
  buffer: AudioBuffer,
  freq: number,
  startTime: number,
  duration: number,
  velocity = 0.65,
  destination: AudioNode = ctx.destination,
  releaseTime = 1.4,
): PluckedNoteHandle {
  const safeStart = Math.max(ctx.currentTime + 0.005, startTime);
  const safeDuration = Math.max(0.03, duration);
  const safeVelocity = Math.min(0.32, Math.max(0, velocity));
  const safeRelease = Math.min(0.9, Math.max(0.08, releaseTime));
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = freq / REF_FREQ;

  // Subtle velocity-driven LPF to avoid lower notes sounding overly bright at full velocity
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2600 + safeVelocity * 4200;
  tone.Q.value = 0.2;

  const safetyHp = ctx.createBiquadFilter();
  safetyHp.type = 'highpass';
  safetyHp.frequency.value = 45;
  safetyHp.Q.value = 0.2;

  const safetyLp = ctx.createBiquadFilter();
  safetyLp.type = 'lowpass';
  safetyLp.frequency.value = 6200;
  safetyLp.Q.value = 0.2;

  const totalDuration = safeDuration + safeRelease;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, safeStart);
  g.gain.linearRampToValueAtTime(safeVelocity, safeStart + 0.012);
  // Hold near peak through the rhythmic duration
  g.gain.setValueAtTime(safeVelocity * 0.72, safeStart + Math.max(0.03, safeDuration * 0.85));
  // Long exponential release — natural ring-out
  g.gain.exponentialRampToValueAtTime(0.001, safeStart + totalDuration);

  src.connect(tone);
  tone.connect(safetyHp);
  safetyHp.connect(safetyLp);
  safetyLp.connect(g);
  g.connect(destination);
  src.start(safeStart);
  src.stop(safeStart + totalDuration + 0.08);
  src.onended = () => {
    try { src.disconnect(); } catch { /* already disconnected */ }
    try { tone.disconnect(); } catch { /* already disconnected */ }
    try { safetyHp.disconnect(); } catch { /* already disconnected */ }
    try { safetyLp.disconnect(); } catch { /* already disconnected */ }
    try { g.disconnect(); } catch { /* already disconnected */ }
  };

  return {
    stop: () => {
      try {
        const now = ctx.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0.0001, now, 0.015);
        src.stop(now + 0.05);
      } catch { /* already stopped */ }
    },
    source: src,
  };
}
