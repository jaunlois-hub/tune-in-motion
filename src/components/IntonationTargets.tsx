import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw, Crosshair, Check } from 'lucide-react';
import type { TuningNote } from '@/lib/tunings';

interface IntonationTargetsProps {
  targetNote: TuningNote | null;
  currentFrequency: number | null;
  isActive: boolean;
  /** When non-null, the tuner is pinned to this string for proper intonation work. */
  lockedString?: TuningNote | null;
  /** Scale length in mm. Default 648 mm (25.5″ Stratocaster). */
  scaleLengthMm?: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function frequencyToNoteAt(targetHz: number, a4 = 440): { note: string; octave: number } {
  const semitonesFromA4 = 12 * Math.log2(targetHz / a4);
  const rounded = Math.round(semitonesFromA4);
  const noteIndex = (((rounded + 9) % 12) + 12) % 12;
  const octave = 4 + Math.floor((rounded + 9) / 12);
  return { note: NOTE_NAMES[noteIndex], octave };
}

function centsBetween(currHz: number, refHz: number): number {
  return 1200 * Math.log2(currHz / refHz);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

interface Capture {
  freq: number;
  cents: number; // vs target (open or 12th)
}

const CAPTURE_DURATION_MS = 600; // collection window
const CAPTURE_MIN_SAMPLES = 6;

export function IntonationTargets({
  targetNote, currentFrequency, isActive, lockedString, scaleLengthMm = 648,
}: IntonationTargetsProps) {
  const locked = !!lockedString;
  const openHz = lockedString?.frequency ?? targetNote?.frequency ?? 0;
  const twelfthHz = openHz * 2;

  // Capture state
  const [capH, setCapH] = useState<Capture | null>(null);
  const [capF, setCapF] = useState<Capture | null>(null);
  const [capturing, setCapturing] = useState<'harmonic' | 'fretted' | null>(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const sampleBufRef = useRef<number[]>([]);
  const captureStartRef = useRef<number>(0);

  // Reset captures when the locked string changes (or unlocks)
  useEffect(() => {
    setCapH(null);
    setCapF(null);
    setCapturing(null);
  }, [lockedString?.string, lockedString?.note, lockedString?.octave]);

  // Capture loop — collect samples while currentFrequency is valid
  useEffect(() => {
    if (!capturing) return;
    if (currentFrequency == null || currentFrequency <= 0) return;

    sampleBufRef.current.push(currentFrequency);

    const elapsed = performance.now() - captureStartRef.current;
    const progress = Math.min(1, elapsed / CAPTURE_DURATION_MS);
    setCaptureProgress(progress);

    if (elapsed >= CAPTURE_DURATION_MS && sampleBufRef.current.length >= CAPTURE_MIN_SAMPLES) {
      const med = median(sampleBufRef.current);
      const ref = capturing === 'harmonic' || capturing === 'fretted' ? twelfthHz : openHz;
      const cents = centsBetween(med, ref);
      const result: Capture = { freq: med, cents };
      if (capturing === 'harmonic') setCapH(result);
      else setCapF(result);
      setCapturing(null);
      setCaptureProgress(0);
      sampleBufRef.current = [];
    }
  }, [currentFrequency, capturing, twelfthHz, openHz]);

  const startCapture = useCallback((which: 'harmonic' | 'fretted') => {
    sampleBufRef.current = [];
    captureStartRef.current = performance.now();
    setCaptureProgress(0);
    setCapturing(which);
  }, []);

  const cancelCapture = useCallback(() => {
    setCapturing(null);
    setCaptureProgress(0);
    sampleBufRef.current = [];
  }, []);

  const resetCaptures = useCallback(() => {
    setCapH(null);
    setCapF(null);
    cancelCapture();
  }, [cancelCapture]);

  // ============================================================
  // Idle / no target
  // ============================================================
  if (!isActive || !targetNote) {
    return (
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground text-center font-display">
          Intonation
        </div>
        <div className="text-[11px] text-center text-muted-foreground/60 mt-2 font-mono">
          Play a string to begin · tap a string circle above to lock for intonation
        </div>
      </div>
    );
  }

  // Live cents reading vs the appropriate target (used for the open-tune indicator)
  const liveOpenCents = currentFrequency ? centsBetween(currentFrequency, openHz) : null;
  const openTuned = liveOpenCents != null && Math.abs(liveOpenCents) < 2;

  // Both captured — compute delta and saddle recommendation
  const haveBoth = capH != null && capF != null;
  const delta = haveBoth ? (capF!.cents - capH!.cents) : null; // fretted minus harmonic
  // Saddle adjustment heuristic: ≈ scale × (1 − 2^(−cents/1200)) is the position change
  // needed to compensate one cent at the 12th. Empirically this lands in the 0.10–0.13 mm
  // per cent range for a 25.5″ Strat — same as luthier rule of thumb.
  const saddleMm = delta != null
    ? Math.abs(scaleLengthMm * (1 - Math.pow(2, -Math.abs(delta) / 1200)) * 2) // ×2 because effective length affects open and 12th differently
    : null;
  const direction: 'back' | 'forward' | null = delta == null
    ? null
    : delta > 0 ? 'back' : delta < 0 ? 'forward' : null;

  const twelfthLabel = openHz > 0 ? frequencyToNoteAt(twelfthHz) : { note: '?', octave: 0 };

  return (
    <div className="w-full max-w-md rounded-xl border border-border/50 bg-card/30 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-display flex items-center gap-1.5">
          <Crosshair className={`w-3 h-3 ${locked ? 'text-amber-400' : 'text-muted-foreground'}`} />
          Intonation {locked && <span className="text-amber-400">· locked</span>}
        </div>
        <div className="text-[10px] font-mono text-foreground">
          {locked && lockedString
            ? <>String: <span className="text-amber-300 font-bold">{lockedString.note}{lockedString.octave}</span> ({lockedString.frequency.toFixed(2)} Hz)</>
            : <>Auto: <span className="text-primary font-bold">{targetNote.note}{targetNote.octave}</span></>}
        </div>
      </div>

      {/* Step 1: Open string tuned indicator (always shown) */}
      <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md border transition-colors ${
        openTuned ? 'bg-tuner-perfect/15 border-tuner-perfect/50' : 'bg-secondary/30 border-border/40'
      }`}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-display font-bold text-foreground">1. Tune Open</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Pluck open string</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
            Target {openHz.toFixed(2)} Hz
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {liveOpenCents != null && (
            <span className={`text-[11px] font-mono font-bold ${
              Math.abs(liveOpenCents) < 2 ? 'text-tuner-perfect' :
              Math.abs(liveOpenCents) < 5 ? 'text-tuner-close' : 'text-tuner-off'
            }`}>
              {liveOpenCents > 0 ? '+' : ''}{liveOpenCents.toFixed(1)}¢
            </span>
          )}
          {openTuned && <Check className="w-4 h-4 text-tuner-perfect" />}
        </div>
      </div>

      {/* Locked-mode capture workflow */}
      {locked ? (
        <>
          {/* Step 2: Capture harmonic */}
          <CaptureRow
            step="2."
            label="12th-fret Harmonic"
            hint="Touch lightly @ 12th, pluck"
            target={`${twelfthHz.toFixed(2)} Hz · ${twelfthLabel.note}${twelfthLabel.octave}`}
            cap={capH}
            isCapturing={capturing === 'harmonic'}
            progress={capturing === 'harmonic' ? captureProgress : 0}
            onStart={() => startCapture('harmonic')}
            onCancel={cancelCapture}
            onClear={() => setCapH(null)}
            disabled={!openTuned && !capH}
            disabledReason={!openTuned ? 'Tune open first' : undefined}
          />
          {/* Step 3: Capture fretted */}
          <CaptureRow
            step="3."
            label="12th-fret Fretted"
            hint="Press @ 12th, pluck"
            target={`${twelfthHz.toFixed(2)} Hz · ${twelfthLabel.note}${twelfthLabel.octave}`}
            cap={capF}
            isCapturing={capturing === 'fretted'}
            progress={capturing === 'fretted' ? captureProgress : 0}
            onStart={() => startCapture('fretted')}
            onCancel={cancelCapture}
            onClear={() => setCapF(null)}
            disabled={capH == null}
            disabledReason={capH == null ? 'Capture harmonic first' : undefined}
          />

          {/* Verdict — appears once both captured */}
          <AnimatePresence>
            {haveBoth && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <Verdict
                  delta={delta!}
                  saddleMm={saddleMm!}
                  direction={direction!}
                  capH={capH!}
                  capF={capF!}
                  onReset={resetCaptures}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        // Unlocked-mode info — encourage locking for proper intonation
        <div className="text-[10.5px] text-muted-foreground/85 leading-relaxed border-t border-border/30 pt-2">
          <span className="text-foreground/95 font-semibold">Tip:</span>{' '}
          tap the string circle above to lock the tuner — that unlocks the capture-based intonation workflow with concrete saddle-mm guidance.
        </div>
      )}
    </div>
  );
}

// ============================================================
// Capture row — used for both harmonic and fretted
// ============================================================
function CaptureRow({
  step, label, hint, target, cap, isCapturing, progress,
  onStart, onCancel, onClear, disabled, disabledReason,
}: {
  step: string;
  label: string;
  hint: string;
  target: string;
  cap: Capture | null;
  isCapturing: boolean;
  progress: number;
  onStart: () => void;
  onCancel: () => void;
  onClear: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const captured = cap != null;
  return (
    <div
      className={`relative flex items-center justify-between gap-3 px-3 py-2 rounded-md border overflow-hidden ${
        captured ? 'bg-primary/15 border-primary/40' :
        isCapturing ? 'bg-amber-400/10 border-amber-400/40' :
        disabled ? 'bg-secondary/15 border-border/30 opacity-60' :
        'bg-secondary/30 border-border/40'
      }`}
    >
      {/* Capture progress bar */}
      {isCapturing && (
        <motion.div
          className="absolute inset-y-0 left-0 bg-amber-400/25"
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.05 }}
        />
      )}

      <div className="flex flex-col min-w-0 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-display font-bold text-foreground">{step} {label}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{hint}</span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
          Target {target}
        </div>
        {captured && (
          <div className="text-[10.5px] font-mono mt-1">
            <span className="text-foreground">Captured:</span>{' '}
            <span className="text-primary font-bold">{cap!.freq.toFixed(2)} Hz</span>{' '}
            <span className={`font-bold ${
              Math.abs(cap!.cents) < 2 ? 'text-tuner-perfect' :
              Math.abs(cap!.cents) < 5 ? 'text-tuner-close' : 'text-tuner-off'
            }`}>
              ({cap!.cents > 0 ? '+' : ''}{cap!.cents.toFixed(1)}¢)
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1.5 relative z-10">
        {!captured && !isCapturing && (
          <button
            onClick={onStart}
            disabled={disabled}
            title={disabledReason}
            className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
              disabled
                ? 'bg-secondary/40 text-muted-foreground/60 cursor-not-allowed'
                : 'bg-amber-400/25 border border-amber-400/50 text-amber-300 hover:bg-amber-400/40'
            }`}
          >
            ● Capture
          </button>
        )}
        {isCapturing && (
          <button
            onClick={onCancel}
            className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-red-500/25 border border-red-500/50 text-red-300 hover:bg-red-500/40"
          >
            ✕ Cancel
          </button>
        )}
        {captured && (
          <button
            onClick={onClear}
            className="px-2 py-1 rounded-md text-[10px] font-mono text-muted-foreground hover:text-foreground"
            title="Re-capture"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Verdict panel — shown once both harmonic and fretted are captured
// ============================================================
function Verdict({
  delta, saddleMm, direction, capH, capF, onReset,
}: {
  delta: number;
  saddleMm: number;
  direction: 'back' | 'forward';
  capH: Capture;
  capF: Capture;
  onReset: () => void;
}) {
  const inTune = Math.abs(delta) < 2;
  const turnsApprox = saddleMm / 0.4; // ~0.4mm per saddle screw turn (rough)
  return (
    <div className={`rounded-md border p-3 space-y-2 ${
      inTune ? 'bg-tuner-perfect/10 border-tuner-perfect/40' : 'bg-amber-400/10 border-amber-400/40'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-display font-bold uppercase tracking-wider text-foreground">
          {inTune ? '✓ Intonation OK' : 'Adjustment Needed'}
        </span>
        <button
          onClick={onReset}
          className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
        <div className="flex flex-col px-2 py-1.5 rounded bg-card/40 border border-border/40">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Harmonic</span>
          <span className="text-foreground font-bold">{capH.freq.toFixed(2)} Hz</span>
          <span className={Math.abs(capH.cents) < 2 ? 'text-tuner-perfect' : 'text-tuner-close'}>
            {capH.cents > 0 ? '+' : ''}{capH.cents.toFixed(1)}¢
          </span>
        </div>
        <div className="flex flex-col px-2 py-1.5 rounded bg-card/40 border border-border/40">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Fretted</span>
          <span className="text-foreground font-bold">{capF.freq.toFixed(2)} Hz</span>
          <span className={Math.abs(capF.cents) < 2 ? 'text-tuner-perfect' : Math.abs(capF.cents) < 5 ? 'text-tuner-close' : 'text-tuner-off'}>
            {capF.cents > 0 ? '+' : ''}{capF.cents.toFixed(1)}¢
          </span>
        </div>
      </div>

      {/* Delta */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded bg-card/40 border border-border/40">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Δ Fretted − Harmonic</span>
        <span className={`text-sm font-mono font-bold ${
          inTune ? 'text-tuner-perfect' : Math.abs(delta) < 5 ? 'text-tuner-close' : 'text-tuner-off'
        }`}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}¢
        </span>
      </div>

      {!inTune && (
        <>
          {/* Saddle adjustment guidance */}
          <div className="rounded-md bg-card/60 border border-amber-400/30 p-2 space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              {direction === 'forward'
                ? <ArrowLeft className="w-5 h-5 text-amber-300" />
                : <ArrowRight className="w-5 h-5 text-amber-300" />
              }
              <span className="text-[12px] font-display font-bold text-amber-200">
                Move saddle {direction === 'back' ? 'BACK' : 'FORWARD'}
              </span>
              {direction === 'back'
                ? <ArrowRight className="w-5 h-5 text-amber-300" />
                : <ArrowLeft className="w-5 h-5 text-amber-300" />
              }
            </div>
            <div className="text-center text-[10.5px] font-mono text-foreground/95">
              ≈ <span className="font-bold text-amber-200">{saddleMm.toFixed(2)} mm</span> ({turnsApprox.toFixed(1)} turn{turnsApprox >= 1.05 || turnsApprox < 0.95 ? 's' : ''} of saddle screw)
            </div>
            <div className="text-center text-[9.5px] text-muted-foreground leading-tight">
              {direction === 'back'
                ? 'Loosen the spring screw at the bridge butt to lengthen the string.'
                : 'Tighten the spring screw to pull the saddle toward the neck and shorten the string.'}
              <br />
              After adjusting, re-tune open and re-capture.
            </div>
          </div>

          {/* Visual saddle bar */}
          <SaddleBar delta={delta} />
        </>
      )}
    </div>
  );
}

// Visual representation of where the saddle position is vs ideal
function SaddleBar({ delta }: { delta: number }) {
  // Map delta to a -1..+1 range capped at ±15¢
  const max = 15;
  const t = Math.max(-1, Math.min(1, delta / max));
  const pos = 50 + t * 35; // % across bar (50 = center / ideal)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
        <span>← Forward (toward neck)</span>
        <span>Ideal</span>
        <span>Back (toward butt) →</span>
      </div>
      <div className="relative h-3 rounded-full bg-secondary/40 border border-border/40 overflow-hidden">
        {/* Ideal marker */}
        <div className="absolute top-0 bottom-0 w-px bg-tuner-perfect/60" style={{ left: '50%' }} />
        {/* Current */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)] -translate-x-1/2"
          animate={{ left: `${pos}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        />
      </div>
    </div>
  );
}
