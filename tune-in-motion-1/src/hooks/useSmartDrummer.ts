import { useState, useRef, useCallback, useEffect } from 'react';
import { useBpmSync } from './useBpmSync';
import { applyOutputSink, buildAudioConstraints } from './useAudioDevices';

export type DrumGenre = 'ballad' | 'blues' | 'rock' | 'punk' | 'metal' | 'blast';

const GENRE_RANGES: { genre: DrumGenre; min: number; max: number; pattern: string }[] = [
  { genre: 'ballad', min: 40, max: 75, pattern: 'halfTime' },
  { genre: 'blues', min: 76, max: 95, pattern: 'blues' },
  { genre: 'rock', min: 96, max: 130, pattern: 'rock' },
  { genre: 'punk', min: 131, max: 165, pattern: 'funk' },
  { genre: 'metal', min: 166, max: 200, pattern: 'metal' },
  { genre: 'blast', min: 201, max: 400, pattern: 'dnb' },
];

function getPatternForBpm(bpm: number): { genre: DrumGenre; pattern: string } {
  for (const range of GENRE_RANGES) {
    if (bpm >= range.min && bpm <= range.max) {
      return { genre: range.genre, pattern: range.pattern };
    }
  }
  return bpm < 40 ? { genre: 'ballad', pattern: 'halfTime' } : { genre: 'blast', pattern: 'dnb' };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useSmartDrummer() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState(0);
  const [detectedGenre, setDetectedGenre] = useState<DrumGenre>('rock');
  const [suggestedPattern, setSuggestedPattern] = useState('rock');
  const [sensitivity, setSensitivity] = useState(0.5); // 0-1
  const [bpmLocked, setBpmLocked] = useState(false);
  const [beatPulse, setBeatPulse] = useState(false);

  const { setBpm } = useBpmSync();

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Onset detection state
  const prevEnergyRef = useRef(0);
  const onsetTimesRef = useRef<number[]>([]);
  const ioiBufferRef = useRef<number[]>([]);
  const smoothedBpmRef = useRef(120);
  const lastOnsetRef = useRef(0);
  const lastBpmUpdateRef = useRef(0);
  const sensitivityRef = useRef(sensitivity);
  const bpmLockedRef = useRef(bpmLocked);

  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { bpmLockedRef.current = bpmLocked; }, [bpmLocked]);

  const detectOnsets = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const ctx = audioContextRef.current;
    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(buffer);

    // Calculate RMS energy
    let rms = 0;
    for (let i = 0; i < bufferLength; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / bufferLength);

    // Adaptive threshold based on sensitivity (lower sensitivity = higher threshold)
    const threshold = 0.015 + (1 - sensitivityRef.current) * 0.08;
    const energyRatio = rms / (prevEnergyRef.current + 0.0001);

    const now = ctx.currentTime;
    const minOnsetGap = 0.12; // ~500 BPM max, prevents double-triggers

    // Onset detected when energy rises sharply above previous
    if (energyRatio > 1.5 + (1 - sensitivityRef.current) * 2 && rms > threshold && (now - lastOnsetRef.current) > minOnsetGap) {
      lastOnsetRef.current = now;

      // Flash beat pulse
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 100);

      const onsetTimes = onsetTimesRef.current;
      onsetTimes.push(now);

      // Keep last 12 onsets
      if (onsetTimes.length > 12) onsetTimes.shift();

      // Calculate IOIs (Inter-Onset Intervals)
      if (onsetTimes.length >= 3) {
        const iois: number[] = [];
        for (let i = 1; i < onsetTimes.length; i++) {
          const ioi = onsetTimes[i] - onsetTimes[i - 1];
          // Only accept reasonable IOIs (30-300 BPM range)
          if (ioi > 0.2 && ioi < 2.0) {
            iois.push(ioi);
          }
        }

        if (iois.length >= 2) {
          const ioiBuffer = ioiBufferRef.current;
          ioiBuffer.push(...iois.slice(-3));
          if (ioiBuffer.length > 16) ioiBuffer.splice(0, ioiBuffer.length - 16);

          const medianIOI = median(ioiBuffer);
          const rawBpm = 60 / medianIOI;
          const clampedBpm = Math.max(30, Math.min(300, Math.round(rawBpm)));

          // Exponential smoothing
          const alpha = 0.3;
          smoothedBpmRef.current = Math.round(smoothedBpmRef.current * (1 - alpha) + clampedBpm * alpha);

          // Rate-limit BPM updates to 2/sec
          if (now - lastBpmUpdateRef.current > 0.5) {
            lastBpmUpdateRef.current = now;
            const finalBpm = smoothedBpmRef.current;
            setDetectedBpm(finalBpm);

            const { genre, pattern } = getPatternForBpm(finalBpm);
            setDetectedGenre(genre);
            setSuggestedPattern(pattern);

            if (!bpmLockedRef.current) {
              setBpm(finalBpm);
            }
          }
        }
      }
    }

    prevEnergyRef.current = rms;
    animFrameRef.current = requestAnimationFrame(detectOnsets);
  }, [setBpm]);

  const startFollowing = useCallback(async (existingStream?: MediaStream) => {
    try {
      let stream = existingStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints());
      }
      streamRef.current = existingStream ? null : stream; // Only own the stream if we created it

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      applyOutputSink(ctx);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Reset state
      prevEnergyRef.current = 0;
      onsetTimesRef.current = [];
      ioiBufferRef.current = [];
      smoothedBpmRef.current = 120;
      lastOnsetRef.current = 0;
      lastBpmUpdateRef.current = 0;

      setIsFollowing(true);
      setDetectedBpm(0);
      detectOnsets();
    } catch (err) {
      console.error('Smart drummer mic error:', err);
    }
  }, [detectOnsets]);

  const stopFollowing = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsFollowing(false);
  }, []);

  useEffect(() => {
    return () => { stopFollowing(); };
  }, [stopFollowing]);

  return {
    isFollowing,
    detectedBpm,
    detectedGenre,
    suggestedPattern,
    sensitivity,
    bpmLocked,
    beatPulse,
    setSensitivity,
    setBpmLocked,
    startFollowing,
    stopFollowing,
  };
}
