import { useState, useEffect, useRef, useCallback } from 'react';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, RotateCcw, Check, AlertTriangle, XCircle, Lock } from 'lucide-react';

const STRINGS = [
  { num: 6, name: 'Low E', freq: 82.41 },
  { num: 5, name: 'A', freq: 110.0 },
  { num: 4, name: 'D', freq: 146.83 },
  { num: 3, name: 'G', freq: 196.0 },
  { num: 2, name: 'B', freq: 246.94 },
  { num: 1, name: 'High E', freq: 329.63 },
];

type Step = 'open' | 'harmonic' | 'fretted';

interface StringResult {
  open: number | null;
  harmonic: number | null;
  fretted: number | null;
  centsOff: number | null;
}

const STEP_LABELS: Record<Step, string> = {
  open: 'Play OPEN string',
  harmonic: 'Play 12th fret HARMONIC',
  fretted: 'Play 12th fret FRETTED',
};

const STEP_TIPS: Record<Step, string> = {
  open: 'Pluck the open string and let it ring clearly',
  harmonic: 'Lightly touch the string above the 12th fret wire, pluck, then lift your finger',
  fretted: 'Press the string at the 12th fret normally and pluck',
};

export function IntonationChecker() {
  const { isListening, pitchData, startListening, stopListening } = usePitchDetection();
  const [selectedString, setSelectedString] = useState(0); // index into STRINGS
  const [currentStep, setCurrentStep] = useState<Step>('open');
  const [results, setResults] = useState<Record<number, StringResult>>({});
  const [lockedFreq, setLockedFreq] = useState<number | null>(null);
  const [isLocking, setIsLocking] = useState(false);

  const stableCountRef = useRef(0);
  const stableFreqRef = useRef<number | null>(null);
  const LOCK_THRESHOLD = 12; // ~1.5s at 60fps

  // Auto-lock pitch after stable reading
  useEffect(() => {
    if (!isListening || !pitchData || lockedFreq !== null) {
      stableCountRef.current = 0;
      stableFreqRef.current = null;
      setIsLocking(false);
      return;
    }

    const freq = pitchData.frequency;
    if (pitchData.clarity < 0.85) {
      stableCountRef.current = 0;
      stableFreqRef.current = null;
      setIsLocking(false);
      return;
    }

    if (stableFreqRef.current && Math.abs(freq - stableFreqRef.current) / stableFreqRef.current < 0.005) {
      stableCountRef.current++;
      setIsLocking(true);
      if (stableCountRef.current >= LOCK_THRESHOLD) {
        setLockedFreq(Math.round(freq * 100) / 100);
        setIsLocking(false);
      }
    } else {
      stableFreqRef.current = freq;
      stableCountRef.current = 1;
      setIsLocking(false);
    }
  }, [pitchData, isListening, lockedFreq]);

  const confirmReading = useCallback(() => {
    if (lockedFreq === null) return;
    const strNum = STRINGS[selectedString].num;
    const prev = results[strNum] || { open: null, harmonic: null, fretted: null, centsOff: null };

    const updated = { ...prev, [currentStep]: lockedFreq };

    // Calculate cents if we have harmonic and fretted
    if (updated.harmonic && updated.fretted) {
      updated.centsOff = Math.round(1200 * Math.log2(updated.fretted / updated.harmonic) * 10) / 10;
    }

    setResults(r => ({ ...r, [strNum]: updated }));
    setLockedFreq(null);

    // Advance step
    if (currentStep === 'open') setCurrentStep('harmonic');
    else if (currentStep === 'harmonic') setCurrentStep('fretted');
    else {
      // Done with this string — move to next if available
      if (selectedString < STRINGS.length - 1) {
        setSelectedString(s => s + 1);
        setCurrentStep('open');
      }
    }
  }, [lockedFreq, currentStep, selectedString, results]);

  const resetString = () => {
    const strNum = STRINGS[selectedString].num;
    setResults(r => {
      const copy = { ...r };
      delete copy[strNum];
      return copy;
    });
    setCurrentStep('open');
    setLockedFreq(null);
  };

  const resetAll = () => {
    setResults({});
    setSelectedString(0);
    setCurrentStep('open');
    setLockedFreq(null);
  };

  const getDiagnosis = (cents: number) => {
    const abs = Math.abs(cents);
    if (abs < 2) return { label: 'In tune', color: 'text-green-400', icon: Check, bg: 'bg-green-500/10' };
    if (abs < 5) return { label: 'Slightly off', color: 'text-yellow-400', icon: AlertTriangle, bg: 'bg-yellow-500/10' };
    return { label: 'Needs adjustment', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10' };
  };

  const getSaddleAdvice = (cents: number) => {
    const abs = Math.abs(cents);
    if (abs < 2) return 'No adjustment needed ✓';
    const dir = cents > 0 ? 'BACK (away from neck)' : 'FORWARD (toward neck)';
    const dist = (abs / 5).toFixed(1);
    return `Move saddle ${dir} ~${dist}mm`;
  };

  const currentStr = STRINGS[selectedString];
  const currentResult = results[currentStr.num];
  const stepDone = currentResult?.[currentStep] != null;
  const allStepsDone = currentResult?.centsOff != null;
  const lockProgress = lockedFreq !== null ? 100 : isLocking ? Math.min(95, (stableCountRef.current / LOCK_THRESHOLD) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Mic toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant={isListening ? 'destructive' : 'default'}
          size="sm"
          onClick={isListening ? stopListening : startListening}
          className="gap-2"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isListening ? 'Stop' : 'Start Listening'}
        </Button>
        <Button variant="ghost" size="sm" onClick={resetAll} className="gap-1 text-xs text-muted-foreground">
          <RotateCcw className="w-3 h-3" /> Reset All
        </Button>
      </div>

      {/* String selector */}
      <div className="flex gap-1.5">
        {STRINGS.map((s, i) => {
          const r = results[s.num];
          const done = r?.centsOff != null;
          const diag = done ? getDiagnosis(r.centsOff!) : null;
          return (
            <button
              key={s.num}
              onClick={() => { setSelectedString(i); setCurrentStep(r ? 'open' : 'open'); setLockedFreq(null); }}
              className={`flex-1 py-2 rounded-lg text-center text-xs font-display transition-all border ${
                i === selectedString
                  ? 'border-primary bg-primary/10 text-primary'
                  : done
                  ? `border-border ${diag?.bg} ${diag?.color}`
                  : 'border-border bg-card/30 text-muted-foreground hover:bg-secondary/30'
              }`}
            >
              <div className="font-bold">{s.num}</div>
              <div className="text-[9px] opacity-70">{s.name}</div>
              {done && <div className="text-[8px] mt-0.5">{r.centsOff! > 0 ? '+' : ''}{r.centsOff!}¢</div>}
            </button>
          );
        })}
      </div>

      {/* Current step wizard */}
      <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">
            String {currentStr.num} ({currentStr.name})
          </h3>
          <Button variant="ghost" size="sm" onClick={resetString} className="text-[10px] h-6 px-2">
            Reset String
          </Button>
        </div>

        {/* Steps */}
        {(['open', 'harmonic', 'fretted'] as Step[]).map((step) => {
          const reading = currentResult?.[step];
          const isActive = step === currentStep && !allStepsDone;
          return (
            <div
              key={step}
              className={`flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all ${
                isActive ? 'bg-primary/5 border border-primary/30' : 'bg-secondary/20 border border-transparent'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                reading != null ? 'bg-green-500/20 text-green-400' : isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {reading != null ? '✓' : step === 'open' ? '1' : step === 'harmonic' ? '2' : '3'}
              </div>
              <div className="flex-1">
                <div className="font-display font-medium">{STEP_LABELS[step]}</div>
                {isActive && <div className="text-[10px] text-muted-foreground mt-0.5">{STEP_TIPS[step]}</div>}
              </div>
              <div className="text-right min-w-[70px]">
                {reading != null ? (
                  <span className="text-green-400 font-mono">{reading.toFixed(1)} Hz</span>
                ) : isActive && lockedFreq != null ? (
                  <span className="text-primary font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {lockedFreq.toFixed(1)} Hz
                  </span>
                ) : isActive && pitchData ? (
                  <span className="text-muted-foreground font-mono animate-pulse">{pitchData.frequency.toFixed(1)} Hz</span>
                ) : (
                  <span className="text-muted-foreground/30">—</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Lock progress bar */}
        {isListening && !allStepsDone && (
          <div className="h-1 bg-secondary/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150 rounded-full"
              style={{ width: `${lockProgress}%` }}
            />
          </div>
        )}

        {/* Confirm button */}
        {lockedFreq !== null && !allStepsDone && (
          <Button size="sm" onClick={confirmReading} className="w-full gap-2">
            <Check className="w-4 h-4" /> Confirm {lockedFreq.toFixed(1)} Hz
          </Button>
        )}

        {/* Result for this string */}
        {allStepsDone && currentResult?.centsOff != null && (() => {
          const diag = getDiagnosis(currentResult.centsOff);
          const Icon = diag.icon;
          return (
            <div className={`p-3 rounded-lg ${diag.bg} border border-border space-y-1.5`}>
              <div className={`flex items-center gap-2 font-display font-bold text-sm ${diag.color}`}>
                <Icon className="w-4 h-4" />
                {diag.label} — {currentResult.centsOff > 0 ? '+' : ''}{currentResult.centsOff}¢
              </div>
              <div className="text-xs text-muted-foreground">{getSaddleAdvice(currentResult.centsOff)}</div>
            </div>
          );
        })()}
      </div>

      {/* Summary table */}
      {Object.keys(results).length > 0 && (
        <div className="bg-card/30 border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">Results Summary</h3>
          </div>
          <div className="divide-y divide-border">
            {STRINGS.map(s => {
              const r = results[s.num];
              if (!r) return null;
              const done = r.centsOff != null;
              const diag = done ? getDiagnosis(r.centsOff!) : null;
              const Icon = diag?.icon || AlertTriangle;
              return (
                <div key={s.num} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <span className="font-display font-bold w-8">{s.num}{s.name[0]}</span>
                  <span className="font-mono text-muted-foreground flex-1">
                    {r.open?.toFixed(1) || '—'} → {r.harmonic?.toFixed(1) || '—'} → {r.fretted?.toFixed(1) || '—'}
                  </span>
                  {done ? (
                    <span className={`flex items-center gap-1 ${diag!.color}`}>
                      <Icon className="w-3 h-3" />
                      {r.centsOff! > 0 ? '+' : ''}{r.centsOff!}¢
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">…</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
