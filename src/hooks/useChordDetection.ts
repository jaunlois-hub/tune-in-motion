import { useState, useRef, useCallback, useEffect } from 'react';

// Chord templates: each chord is defined by its chroma profile (12 pitch classes C through B)
// 1 = note present, 0 = note absent
const CHORD_TEMPLATES: Record<string, number[]> = {
  // Major
  'C':    [1,0,0,0,1,0,0,1,0,0,0,0],
  'C#':   [0,1,0,0,0,1,0,0,1,0,0,0],
  'D':    [0,0,1,0,0,0,1,0,0,1,0,0],
  'D#':   [0,0,0,1,0,0,0,1,0,0,1,0],
  'E':    [0,0,0,0,1,0,0,0,1,0,0,1],
  'F':    [1,0,0,0,0,1,0,0,0,1,0,0],
  'F#':   [0,1,0,0,0,0,1,0,0,0,1,0],
  'G':    [0,0,1,0,0,0,0,1,0,0,0,1],
  'G#':   [1,0,0,1,0,0,0,0,1,0,0,0],
  'A':    [0,1,0,0,1,0,0,0,0,1,0,0],
  'A#':   [0,0,1,0,0,1,0,0,0,0,1,0],
  'B':    [0,0,0,1,0,0,1,0,0,0,0,1],
  // Minor
  'Cm':   [1,0,0,1,0,0,0,1,0,0,0,0],
  'C#m':  [0,1,0,0,1,0,0,0,1,0,0,0],
  'Dm':   [0,0,1,0,0,1,0,0,0,1,0,0],
  'D#m':  [0,0,0,1,0,0,1,0,0,0,1,0],
  'Em':   [0,0,0,0,1,0,0,1,0,0,0,1],
  'Fm':   [1,0,0,0,0,1,0,0,1,0,0,0],
  'F#m':  [0,1,0,0,0,0,1,0,0,1,0,0],
  'Gm':   [0,0,1,0,0,0,0,1,0,0,1,0],
  'G#m':  [0,0,0,1,0,0,0,0,1,0,0,1],
  'Am':   [1,0,0,0,1,0,0,0,0,1,0,0],
  'A#m':  [0,1,0,0,0,1,0,0,0,0,1,0],
  'Bm':   [0,0,1,0,0,0,1,0,0,0,0,1],
  // 7th chords
  'C7':   [1,0,0,0,1,0,0,1,0,0,1,0],
  'D7':   [0,0,1,0,0,0,1,0,0,1,0,1],
  'E7':   [0,0,0,0,1,0,0,0,1,0,1,1],
  'G7':   [0,0,1,0,0,1,0,1,0,0,0,1],
  'A7':   [0,1,0,0,1,0,0,1,0,1,0,0],
  'B7':   [0,0,1,1,0,0,1,0,0,1,0,1],
  // Minor 7th
  'Am7':  [1,0,0,0,1,0,0,1,0,1,0,0],
  'Em7':  [0,0,1,0,1,0,0,1,0,0,0,1],
  'Dm7':  [0,0,1,0,0,1,0,0,0,1,1,0],
  'Bm7':  [0,0,1,0,0,0,1,0,0,1,0,1],
  // Maj7
  'Cmaj7':[1,0,0,0,1,0,0,1,0,0,0,1],
  'Fmaj7':[1,0,0,0,1,1,0,0,0,1,0,0],
  'Gmaj7':[0,0,1,0,0,0,1,1,0,0,0,1],
  // Sus chords
  'Csus4':[1,0,0,0,0,1,0,1,0,0,0,0],
  'Dsus4':[0,0,1,0,0,0,0,1,0,1,0,0],
  'Asus4':[0,0,1,0,1,0,0,0,0,1,0,0],
  'Esus4':[0,0,0,0,1,1,0,0,0,0,0,1],
};

// Guitar chord fingering diagrams: [string6, string5, string4, string3, string2, string1]
// -1 = muted, 0 = open, 1-12 = fret
export const CHORD_DIAGRAMS: Record<string, { frets: number[]; barFret?: number; startFret?: number }> = {
  'C':    { frets: [-1, 3, 2, 0, 1, 0] },
  'D':    { frets: [-1, -1, 0, 2, 3, 2] },
  'E':    { frets: [0, 2, 2, 1, 0, 0] },
  'F':    { frets: [1, 1, 2, 3, 3, 1], barFret: 1 },
  'G':    { frets: [3, 2, 0, 0, 0, 3] },
  'A':    { frets: [-1, 0, 2, 2, 2, 0] },
  'B':    { frets: [-1, 2, 4, 4, 4, 2], barFret: 2, startFret: 2 },
  'Am':   { frets: [-1, 0, 2, 2, 1, 0] },
  'Bm':   { frets: [-1, 2, 4, 4, 3, 2], barFret: 2, startFret: 2 },
  'Cm':   { frets: [-1, 3, 5, 5, 4, 3], barFret: 3, startFret: 3 },
  'Dm':   { frets: [-1, -1, 0, 2, 3, 1] },
  'Em':   { frets: [0, 2, 2, 0, 0, 0] },
  'Fm':   { frets: [1, 1, 3, 3, 2, 1], barFret: 1 },
  'Gm':   { frets: [3, 1, 0, 0, 3, 3], startFret: 1 },
  'C7':   { frets: [-1, 3, 2, 3, 1, 0] },
  'D7':   { frets: [-1, -1, 0, 2, 1, 2] },
  'E7':   { frets: [0, 2, 0, 1, 0, 0] },
  'G7':   { frets: [3, 2, 0, 0, 0, 1] },
  'A7':   { frets: [-1, 0, 2, 0, 2, 0] },
  'B7':   { frets: [-1, 2, 1, 2, 0, 2], startFret: 1 },
  'Am7':  { frets: [-1, 0, 2, 0, 1, 0] },
  'Em7':  { frets: [0, 2, 0, 0, 0, 0] },
  'Dm7':  { frets: [-1, -1, 0, 2, 1, 1] },
  'Cmaj7':{ frets: [-1, 3, 2, 0, 0, 0] },
  'Fmaj7':{ frets: [-1, -1, 3, 2, 1, 0], startFret: 1 },
  'F#':   { frets: [2, 4, 4, 3, 2, 2], barFret: 2, startFret: 2 },
  'F#m':  { frets: [2, 4, 4, 2, 2, 2], barFret: 2, startFret: 2 },
  'C#':   { frets: [-1, 4, 6, 6, 6, 4], barFret: 4, startFret: 4 },
  'C#m':  { frets: [-1, 4, 6, 6, 5, 4], barFret: 4, startFret: 4 },
  'D#':   { frets: [-1, -1, 1, 3, 4, 3], startFret: 1 },
  'D#m':  { frets: [-1, -1, 1, 3, 4, 2], startFret: 1 },
  'G#':   { frets: [4, 6, 6, 5, 4, 4], barFret: 4, startFret: 4 },
  'G#m':  { frets: [4, 6, 6, 4, 4, 4], barFret: 4, startFret: 4 },
  'A#':   { frets: [-1, 1, 3, 3, 3, 1], barFret: 1 },
  'A#m':  { frets: [-1, 1, 3, 3, 2, 1], barFret: 1 },
};

export interface ChordData {
  chord: string;
  confidence: number;
  chroma: number[];
}

/**
 * Extract chroma features from FFT data.
 * Maps each FFT bin to one of 12 pitch classes and sums energies.
 */
function extractChroma(frequencyData: Float32Array, sampleRate: number, fftSize: number): number[] {
  const chroma = new Array(12).fill(0);
  const binHz = sampleRate / fftSize;

  // Only consider frequencies from ~80Hz (E2) to ~1200Hz (covers guitar fundamentals)
  const minBin = Math.floor(80 / binHz);
  const maxBin = Math.min(Math.floor(1200 / binHz), frequencyData.length - 1);

  for (let i = minBin; i <= maxBin; i++) {
    const freq = i * binHz;
    if (freq < 20) continue;

    // Convert dB to linear power (frequencyData is in dB)
    const power = Math.pow(10, frequencyData[i] / 20);
    if (power < 0.001) continue;

    // Map frequency to pitch class
    const semitones = 12 * Math.log2(freq / 440);
    const pitchClass = ((Math.round(semitones) % 12) + 12 + 9) % 12; // A=9, so C=0

    chroma[pitchClass] += power;
  }

  // Normalize
  const maxVal = Math.max(...chroma);
  if (maxVal > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= maxVal;
  }

  return chroma;
}

/**
 * Match chroma vector against chord templates using cosine similarity.
 */
function matchChord(chroma: number[]): { chord: string; confidence: number } {
  let bestChord = 'N/A';
  let bestScore = -1;

  for (const [name, template] of Object.entries(CHORD_TEMPLATES)) {
    // Cosine similarity
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < 12; i++) {
      dot += chroma[i] * template[i];
      normA += chroma[i] * chroma[i];
      normB += template[i] * template[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    const similarity = denom > 0 ? dot / denom : 0;

    if (similarity > bestScore) {
      bestScore = similarity;
      bestChord = name;
    }
  }

  return { chord: bestChord, confidence: bestScore };
}

const SMOOTHING_FRAMES = 4;

export function useChordDetection() {
  const [isListening, setIsListening] = useState(false);
  const [chordData, setChordData] = useState<ChordData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const historyRef = useRef<string[]>([]);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const fftSize = analyserRef.current.fftSize;
    const freqData = new Float32Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getFloatFrequencyData(freqData);

    // Check if there's enough signal
    let maxDb = -Infinity;
    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i] > maxDb) maxDb = freqData[i];
    }

    if (maxDb > -50) {
      const chroma = extractChroma(freqData, audioContextRef.current.sampleRate, fftSize);
      const { chord, confidence } = matchChord(chroma);

      if (confidence > 0.6) {
        // Smoothing: require consistent detection
        historyRef.current.push(chord);
        if (historyRef.current.length > SMOOTHING_FRAMES) historyRef.current.shift();

        // Use mode (most frequent) from history
        const counts: Record<string, number> = {};
        historyRef.current.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
        const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

        if (mode && mode[1] >= Math.ceil(SMOOTHING_FRAMES / 2)) {
          setChordData({ chord: mode[0], confidence, chroma });
        }
      }
    } else {
      // Low signal — clear after a bit
      historyRef.current = [];
      setChordData(null);
    }

    animFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      historyRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsListening(true);
      analyze();
    } catch {
      setError('Microphone access denied.');
    }
  }, [analyze]);

  const stopListening = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    historyRef.current = [];
    setIsListening(false);
    setChordData(null);
  }, []);

  useEffect(() => () => { stopListening(); }, [stopListening]);

  return { isListening, chordData, error, startListening, stopListening };
}
