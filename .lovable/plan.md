

## Improve Guitar Effect Presets Sound Quality

### Problems Identified

1. **Distortion is too harsh** — The `tanh` waveshaper with `drive = 1 + amount * 8` and a max pre-gain of `1 + dist * 3` produces thin, buzzy distortion rather than warm amp-like saturation. The post-distortion lowpass cuts too aggressively (`5000 - dist * 2000` = 3000Hz at full dist).

2. **EQ range is extreme** — `(value - 0.5) * 20` gives ±10dB range which is fine, but the EQ is placed *before* distortion, meaning small EQ changes get massively amplified by the drive stage. This makes presets sound muddy or shrill.

3. **Noise gate does nothing** — `noiseGateGain` is always set to 1 and never modulated. The `noiseGate` setting in presets has zero effect.

4. **Preset values are too subtle** — Many presets use very similar low-range values (distortion 0.25-0.45 for crunch/blues/rock) that all sound nearly identical through this chain. The differences between "Blues Crunch" and "Classic Rock" are inaudible.

5. **Reverb sounds metallic** — The synthetic impulse response uses raw white noise with minimal diffusion, producing a grainy, unnatural reverb.

6. **Compressor settings ignore the preset parameter** — Initial compressor is hardcoded at -24dB threshold/4:1 ratio regardless of preset, and only the `useEffect` update path respects the setting.

7. **Cabinet simulation missing** — Real guitar amps use speaker cabinets that roll off harsh frequencies. Without cab sim, all distortion sounds like a raw preamp into headphones.

### Plan

#### 1. Improve distortion algorithm (`useGuitarEffects.ts`)
- Replace simple `tanh` with asymmetric soft-clipping that models tube bias
- Add a second harmonic stage for even-order harmonics (warmer, more musical)
- Scale pre-gain more musically: `1 + amount * 6` with a soft knee
- Widen post-distortion tone control range: lowpass at `6000 - dist * 1500` with a resonant bump

#### 2. Add cabinet simulation filter
- Insert a post-distortion "cabinet" filter chain: lowpass at ~4500Hz + highpass at ~80Hz + a mid-presence peak at 2kHz
- This is the single biggest improvement — it removes the "direct injection" harshness

#### 3. Fix the noise gate
- Implement a real noise gate using an AnalyserNode + scriptProcessor/worklet to measure input level
- When signal is below threshold, ramp gain to 0; above threshold, ramp to 1
- Use `requestAnimationFrame` loop for lightweight gating

#### 4. Improve reverb impulse response
- Add diffusion passes (convolve the noise with itself in short segments)
- Apply a bandpass filter to the impulse (cut below 200Hz, above 8kHz) for less mud
- Add more early reflections at realistic room intervals

#### 5. Retune all preset values
- Increase distortion differentiation between categories:
  - Clean: 0 (bypass waveshaper entirely when dist < 0.05)
  - Crunch: 0.2-0.4
  - High gain: 0.5-0.8
- Adjust EQ values to be more genre-appropriate with the improved chain
- Add meaningful compressor values per preset

#### 6. Retune quick presets
- Update the 6 quick presets (Clean, Crunch, Lead, Metal, Ambient, Blues) with values calibrated to the improved effects chain

### Files to Edit

- **`src/hooks/useGuitarEffects.ts`** — Improved distortion curve, cabinet sim filter, real noise gate, better reverb, bypass waveshaper at zero distortion
- **`src/lib/tonePresets.ts`** — Retune all ~35 preset values for the improved chain
- **`src/components/studio/StudioView.tsx`** (lines 100-107) — Retune the 6 quick presets

### Technical Details
- Cabinet sim: 3 cascaded BiquadFilters (highpass 80Hz, peaking 2kHz +3dB Q=1.5, lowpass 4500Hz)
- Noise gate: AnalyserNode polling at 60fps via rAF, smooth gain ramp (attack 5ms, release 50ms)
- Distortion bypass: when `distortion < 0.05`, set waveshaper curve to linear (identity) and pre-gain to 1
- Reverb diffusion: apply 3-pass random delay smearing to the impulse buffer before assigning

