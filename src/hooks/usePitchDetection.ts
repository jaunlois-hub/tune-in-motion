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
  const cents = Math.round((semitonesFromA4 - roundedSemitones) * 100);

  const noteIndex = ((roundedSemitones % 12) + 9 + 12) % 12;
  const octave = 4 + Math.floor((roundedSemitones + 9) / 12);

  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

/**
 * Improved autocorrelation with parabolic interpolation
 */
function autoCorrelate(buffer: Float32Array, sampleRate: number): { frequency: number; clarity: number } {
  const SIZE = buffer.length;

  // RMS check
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.02) return { frequency: -1, clarity: 0 }; // Higher threshold

  // Normalised autocorrelation via NSDF-like approach
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const correlations = new Float32Array(MAX_SAMPLES);

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += buffer[i] * buffer[i + offset];
      norm1 += buffer[i] * buffer[i];
      norm2 += buffer[i + offset] * buffer[i + offset];
    }
    const normFactor = Math.sqrt(norm1 * norm2);
    correlations[offset] = normFactor > 0 ? correlation / normFactor : 0;
  }

  // Find the first peak after the initial drop
  // Skip the zero-lag peak by waiting for correlation to drop below threshold then rise
  let foundDip = false;
  let bestOffset = -1;
  let bestCorrelation = 0;

  // Min period: ~2000 Hz max detectable
  const minOffset = Math.floor(sampleRate / 2000);
  // Max period: ~50 Hz min detectable
  const maxOffset = Math.min(MAX_SAMPLES - 1, Math.floor(sampleRate / 50));

  for (let offset = minOffset; offset < maxOffset; offset++) {
    if (correlations[offset] < 0.3) {
      foundDip = true;
    }
    if (foundDip && correlations[offset] > 0.5 && correlations[offset] > bestCorrelation) {
      bestCorrelation = correlations[offset];
      bestOffset = offset;
    }
    // Once we found a strong peak and start declining, stop
    if (foundDip && bestOffset > 0 && correlations[offset] < bestCorrelation * 0.8) {
      break;
    }
  }

  if (bestOffset < 1 || bestCorrelation < 0.5) return { frequency: -1, clarity: 0 };

  // Parabolic interpolation for sub-sample accuracy
  const prev = correlations[bestOffset - 1];
  const curr = correlations[bestOffset];
  const next = bestOffset + 1 < MAX_SAMPLES ? correlations[bestOffset + 1] : curr;
  const shift = (next - prev) / (2 * (2 * curr - prev - next));
  const refinedOffset = bestOffset + (isFinite(shift) ? shift : 0);

  const frequency = sampleRate / refinedOffset;
  return { frequency, clarity: bestCorrelation };
}

const HISTORY_SIZE = 5;

export function usePitchDetection() {
  const [isListening, setIsListening] = useState(false);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const lastNoteRef = useRef<string | null>(null);
  const noteHoldCountRef = useRef(0);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const { frequency, clarity } = autoCorrelate(buffer, audioContextRef.current.sampleRate);

    if (frequency > 50 && frequency < 1500 && clarity > 0.5) {
      // Median filter: keep a rolling window and use median to reject outliers
      historyRef.current.push(frequency);
      if (historyRef.current.length > HISTORY_SIZE) {
        historyRef.current.shift();
      }

      // Use median of recent readings
      const sorted = [...historyRef.current].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      // Only accept if current reading is within 5% of median (reject wild jumps)
      if (historyRef.current.length >= 3 && Math.abs(frequency - median) / median > 0.05) {
        animationFrameRef.current = requestAnimationFrame(analyze);
        return;
      }

      const smoothed = median;
      const { note, octave, cents } = frequencyToNote(smoothed);

      // Hysteresis: require consistent note detection before switching
      const noteKey = `${note}${octave}`;
      if (noteKey !== lastNoteRef.current) {
        noteHoldCountRef.current++;
        if (noteHoldCountRef.current < 3) {
          // Don't switch yet — keep old display
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
        cents,
        clarity: Math.min(1, clarity),
      });
    } else {
      // Only clear after several consecutive misses
      noteHoldCountRef.current++;
      if (noteHoldCountRef.current > 10) {
        setPitchData(null);
        historyRef.current = [];
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
      lastNoteRef.current = null;
      noteHoldCountRef.current = 0;

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
      analyser.fftSize = 8192; // Larger FFT for better low-freq resolution
      analyser.smoothingTimeConstant = 0.85;
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
    lastNoteRef.current = null;
    noteHoldCountRef.current = 0;
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
