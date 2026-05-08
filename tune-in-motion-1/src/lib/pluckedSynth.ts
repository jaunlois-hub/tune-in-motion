// Karplus-Strong plucked-string synthesis.
//
// We render one reference pluck offline (~4 seconds at G3 = 196 Hz), cache the buffer,
// and play it back at varied playbackRate to pitch each note. This sounds dramatically
// more guitar-like than a sawtooth-oscillator-with-lowpass approach: real attack
// transient, harmonic content, and a natural exponential decay where high frequencies
// die off faster than the fundamental — exactly like a plucked string.
//
// The loop:
//   noise burst → delay (1/freq) → lowpass → DC-blocker → feedback → delay (rings)
// Output = delay + small pick-attack click (highpassed noise).

const REF_FREQ = 196; // G3 — mid-range so playbackRate doesn't stretch extremes too far
const RENDER_SECONDS = 4;

// Per-AudioContext cache (different sample rates render different buffers)
const cacheByCtx = new WeakMap<AudioContext, AudioBuffer>();

export async function ensurePluckBuffer(ctx: AudioContext): Promise<AudioBuffer> {
  const cached = cacheByCtx.get(ctx);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const totalSamples = Math.floor(sr * RENDER_SECONDS);
  const offline = new OfflineAudioContext(1, totalSamples, sr);

  // Excitation: short noise burst, half-cosine windowed for smoother transient
  const burstLen = Math.max(8, Math.floor(sr * 0.008)); // ~8 ms
  const noiseBuf = offline.createBuffer(1, burstLen, sr);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < burstLen; i++) {
    const window = Math.sin((Math.PI * i) / burstLen);
    data[i] = (Math.random() * 2 - 1) * window * 0.6;
  }
  const noiseSrc = offline.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  // Karplus-Strong loop
  const delay = offline.createDelay(0.1);
  delay.delayTime.value = 1 / REF_FREQ;

  const lpf = offline.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 4500;
  lpf.Q.value = 0.5;

  const fbGain = offline.createGain();
  fbGain.gain.value = 0.997; // long natural sustain — envelope cuts each note when needed

  const dcBlock = offline.createBiquadFilter();
  dcBlock.type = 'highpass';
  dcBlock.frequency.value = 30;

  noiseSrc.connect(delay);
  delay.connect(lpf);
  lpf.connect(fbGain);
  fbGain.connect(dcBlock);
  dcBlock.connect(delay);

  // Main output: ringing delay
  const outGain = offline.createGain();
  outGain.gain.value = 0.7;
  delay.connect(outGain);
  outGain.connect(offline.destination);

  // Pick attack click: highpassed noise burst, mixed in dry
  const pickHp = offline.createBiquadFilter();
  pickHp.type = 'highpass';
  pickHp.frequency.value = 1800;
  const pickGain = offline.createGain();
  pickGain.gain.value = 0.18;
  noiseSrc.connect(pickHp);
  pickHp.connect(pickGain);
  pickGain.connect(offline.destination);

  noiseSrc.start(0);
  const buffer = await offline.startRendering();
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
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = freq / REF_FREQ;

  // Subtle velocity-driven LPF to avoid lower notes sounding overly bright at full velocity
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4000 + velocity * 3000;
  tone.Q.value = 0.4;

  const totalDuration = duration + releaseTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(velocity, startTime + 0.003);
  // Hold near peak through the rhythmic duration
  g.gain.setValueAtTime(velocity * 0.9, startTime + Math.max(0.03, duration * 0.95));
  // Long exponential release — natural ring-out
  g.gain.exponentialRampToValueAtTime(0.001, startTime + totalDuration);

  src.connect(tone);
  tone.connect(g);
  g.connect(destination);
  src.start(startTime);
  src.stop(startTime + totalDuration + 0.1);

  return {
    stop: () => { try { src.stop(); } catch { /* already stopped */ } },
    source: src,
  };
}
