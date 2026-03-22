import { useState, useEffect, useRef, useCallback } from 'react';

interface PitchData {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  clarity: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;

function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
  const semitonesFromA4 = 12 * Math.log2(frequency / A4_FREQUENCY);
  const roundedSemitones = Math.round(semitonesFromA4);
  const cents = (semitonesFromA4 - roundedSemitones) * 100;

  const noteIndex = ((roundedSemitones % 12) + 9 + 12) % 12;
  const octave = 4 + Math.floor((roundedSemitones + 9) / 12);

  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

/**
 * YIN-inspired pitch detection for much better accuracy and stability.
 * Uses cumulative mean normalized difference function + parabolic interpolation.
 */
function yinDetect(buffer: Float32Array, sampleRate: number): { frequency: number; clarity: number } {
  const SIZE = buffer.length;
  const halfSize = Math.floor(SIZE / 2);

  // RMS check — reject silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.015) return { frequency: -1, clarity: 0 };

  // Step 1: Difference function
  const diff = new Float32Array(halfSize);
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference function (CMNDF)
  const cmndf = new Float32Array(halfSize);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] * tau / runningSum;
  }

  // Step 3: Absolute threshold — find first tau where cmndf dips below threshold
  const threshold = 0.15; // Lower = stricter
  const minPeriod = Math.floor(sampleRate / 1500); // max ~1500 Hz
  const maxPeriod = Math.min(halfSize - 1, Math.floor(sampleRate / 50)); // min ~50 Hz

  let bestTau = -1;
  for (let tau = minPeriod; tau < maxPeriod; tau++) {
    if (cmndf[tau] < threshold) {
      // Walk to the local minimum
      while (tau + 1 < maxPeriod && cmndf[tau + 1] < cmndf[tau]) tau++;
      bestTau = tau;
      break;
    }
  }

  // Fallback: find global minimum if no dip below threshold
  if (bestTau < 0) {
    let minVal = Infinity;
    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      if (cmndf[tau] < minVal) {
        minVal = cmndf[tau];
        bestTau = tau;
      }
    }
    if (minVal > 0.5) return { frequency: -1, clarity: 0 };
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  let refinedTau = bestTau;
  if (bestTau > 0 && bestTau < halfSize - 1) {
    const s0 = cmndf[bestTau - 1];
    const s1 = cmndf[bestTau];
    const s2 = cmndf[bestTau + 1];
    const shift = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
    if (isFinite(shift) && Math.abs(shift) < 1) {
      refinedTau = bestTau + shift;
    }
  }

  const clarity = 1 - cmndf[bestTau];
  const frequency = sampleRate / refinedTau;

  return { frequency, clarity: Math.max(0, Math.min(1, clarity)) };
}

const HISTORY_SIZE = 8;
const EMA_ALPHA = 0.35; // Exponential moving average smoothing

export function usePitchDetection() {
  const [isListening, setIsListening] = useState(false);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const emaRef = useRef<number | null>(null);
  const lastNoteRef = useRef<string | null>(null);
  const noteHoldCountRef = useRef(0);
  const silenceCountRef = useRef(0);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const { frequency, clarity } = yinDetect(buffer, audioContextRef.current.sampleRate);

    if (frequency > 50 && frequency < 1500 && clarity > 0.85) {
      silenceCountRef.current = 0;

      // Push into history for median filtering
      historyRef.current.push(frequency);
      if (historyRef.current.length > HISTORY_SIZE) {
        historyRef.current.shift();
      }

      // Median filter to reject outliers
      const sorted = [...historyRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      // Reject if current reading deviates >3% from median (wild jumps)
      if (historyRef.current.length >= 3 && Math.abs(frequency - median) / median > 0.03) {
        animationFrameRef.current = requestAnimationFrame(analyze);
        return;
      }

      // Exponential moving average for super smooth Hz display
      if (emaRef.current === null || Math.abs(median - emaRef.current) / emaRef.current > 0.05) {
        // Big jump — reset EMA
        emaRef.current = median;
      } else {
        emaRef.current = EMA_ALPHA * median + (1 - EMA_ALPHA) * emaRef.current;
      }

      const smoothed = emaRef.current;
      const { note, octave, cents } = frequencyToNote(smoothed);

      // Hysteresis: require 2 consistent reads before switching displayed note
      const noteKey = `${note}${octave}`;
      if (noteKey !== lastNoteRef.current) {
        noteHoldCountRef.current++;
        if (noteHoldCountRef.current < 2) {
          animationFrameRef.current = requestAnimationFrame(analyze);
          return;
        }
        lastNoteRef.current = noteKey;
        noteHoldCountRef.current = 0;
      } else {
        noteHoldCountRef.current = 0;
      }

      setPitchData({
        frequency: smoothed,
        note,
        octave,
        cents: Math.round(cents * 10) / 10,
        clarity: Math.min(1, clarity),
      });
    } else {
      silenceCountRef.current++;
      if (silenceCountRef.current > 15) {
        setPitchData(null);
        historyRef.current = [];
        emaRef.current = null;
        lastNoteRef.current = null;
        noteHoldCountRef.current = 0;
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      historyRef.current = [];
      emaRef.current = null;
      lastNoteRef.current = null;
      noteHoldCountRef.current = 0;
      silenceCountRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsListening(true);
      analyze();
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access to use the tuner.');
      console.error('Error accessing microphone:', err);
    }
  }, [analyze]);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    historyRef.current = [];
    emaRef.current = null;
    lastNoteRef.current = null;
    noteHoldCountRef.current = 0;
    silenceCountRef.current = 0;
    setIsListening(false);
    setPitchData(null);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return { isListening, pitchData, error, startListening, stopListening };
}
