import { BasicPitch, type NoteEventTime, outputToNotesPoly, noteFramesToTime } from '@spotify/basic-pitch';

export interface TabNote {
  string: number;   // 0 = high E, 5 = low E (matches existing RiffNote shape)
  fret: number;
  startBeat: number;
  durationBeats: number;
  startTimeSeconds: number;
  durationSeconds: number;
  pitchMidi: number;
}

export interface TranscriptionResult {
  bpm: number;
  notes: TabNote[];
  rawNotes: NoteEventTime[];
  durationSeconds: number;
}

// Open string MIDI pitches — index 0 = high E4, index 5 = low E2
const OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];
const MAX_FRET = 22;
const MODEL_URL = `${import.meta.env.BASE_URL ?? '/'}models/basic-pitch/model.json`;

let basicPitchPromise: Promise<BasicPitch> | null = null;
function getBasicPitch(): Promise<BasicPitch> {
  if (!basicPitchPromise) {
    basicPitchPromise = (async () => new BasicPitch(MODEL_URL))();
  }
  return basicPitchPromise;
}

async function decodeBytesToMono(bytes: ArrayBuffer, targetSampleRate: number): Promise<Float32Array> {
  const decodeCtx = new AudioContext();
  try {
    const decoded = await decodeCtx.decodeAudioData(bytes.slice(0));
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * targetSampleRate),
      targetSampleRate,
    );
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  } finally {
    decodeCtx.close().catch(() => {});
  }
}

function midiToFretPosition(midi: number): { string: number; fret: number } | null {
  let best: { string: number; fret: number } | null = null;
  for (let s = 0; s < OPEN_STRING_MIDI.length; s++) {
    const fret = midi - OPEN_STRING_MIDI[s];
    if (fret >= 0 && fret <= MAX_FRET) {
      if (!best || fret < best.fret) best = { string: s, fret };
    }
  }
  return best;
}

function estimateBpm(noteEvents: NoteEventTime[]): number {
  if (noteEvents.length < 4) return 90;
  const starts = noteEvents.map((n) => n.startTimeSeconds).sort((a, b) => a - b);
  const iois: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const d = starts[i] - starts[i - 1];
    if (d > 0.08 && d < 2) iois.push(d);
  }
  if (iois.length === 0) return 90;
  iois.sort((a, b) => a - b);
  const medianIoi = iois[Math.floor(iois.length / 2)];
  let bpm = 60 / medianIoi;
  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm);
}

export interface TranscribeOptions {
  startSeconds?: number;
  maxSeconds?: number;
  onsetThreshold?: number;
  frameThreshold?: number;
  minNoteLength?: number;
  onProgress?: (percent: number) => void;
}

export async function transcribeAudioBytes(
  bytes: ArrayBuffer,
  opts: TranscribeOptions = {},
): Promise<TranscriptionResult> {
  const TARGET_SR = 22050;
  const maxSeconds = opts.maxSeconds ?? 30;
  const startSeconds = Math.max(0, opts.startSeconds ?? 0);

  const mono = await decodeBytesToMono(bytes, TARGET_SR);
  const startSample = Math.min(mono.length, Math.floor(startSeconds * TARGET_SR));
  const endSample = Math.min(mono.length, startSample + Math.floor(maxSeconds * TARGET_SR));
  const clipped = mono.subarray(startSample, endSample);

  const basicPitch = await getBasicPitch();

  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  await basicPitch.evaluateModel(
    clipped,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (pct) => opts.onProgress?.(pct),
  );

  const noteFrames = outputToNotesPoly(
    frames,
    onsets,
    opts.onsetThreshold ?? 0.5,
    opts.frameThreshold ?? 0.3,
    opts.minNoteLength ?? 11,
    true,
    1320, // ~E6 upper cap (Hz)
    70,   // ~D2 lower cap (Hz)
  );
  const noteEvents = noteFramesToTime(noteFrames);
  noteEvents.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);

  const bpm = estimateBpm(noteEvents);
  const beatsPerSecond = bpm / 60;

  const notes: TabNote[] = [];
  for (const ev of noteEvents) {
    const pos = midiToFretPosition(ev.pitchMidi);
    if (!pos) continue;
    notes.push({
      string: pos.string,
      fret: pos.fret,
      startBeat: ev.startTimeSeconds * beatsPerSecond,
      durationBeats: Math.max(0.125, ev.durationSeconds * beatsPerSecond),
      startTimeSeconds: ev.startTimeSeconds,
      durationSeconds: Math.max(0.05, ev.durationSeconds),
      pitchMidi: ev.pitchMidi,
    });
  }

  return {
    bpm,
    notes,
    rawNotes: noteEvents,
    durationSeconds: clipped.length / TARGET_SR,
  };
}

export function renderAsciiTab(notes: TabNote[], widthChars = 120): string {
  const rows = ['e', 'B', 'G', 'D', 'A', 'E'];
  if (notes.length === 0) return rows.map((r) => `${r}|${'-'.repeat(widthChars)}|`).join('\n');

  const maxBeat = Math.max(...notes.map((n) => n.startBeat + n.durationBeats), 0) || 1;
  const colsPerBeat = Math.max(1, Math.floor(widthChars / maxBeat));
  const totalCols = Math.max(widthChars, Math.ceil(maxBeat * colsPerBeat));

  const grid: string[][] = rows.map(() => Array(totalCols).fill('-'));
  for (const n of notes) {
    const col = Math.min(totalCols - 1, Math.max(0, Math.floor(n.startBeat * colsPerBeat)));
    const text = String(n.fret);
    for (let i = 0; i < text.length && col + i < totalCols; i++) {
      grid[n.string][col + i] = text[i];
    }
  }
  return rows.map((label, i) => `${label}|${grid[i].join('')}|`).join('\n');
}
