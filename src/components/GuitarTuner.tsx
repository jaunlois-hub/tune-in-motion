import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Gauge, Disc, Headphones, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { TUNINGS, findClosestNote, type TuningNote } from '@/lib/tunings';
import { StrobeWheel } from './StrobeWheel';
import { NeedleTuner } from './NeedleTuner';
import { NoteDisplay } from './NoteDisplay';
import { CentsMeter } from './CentsMeter';
import { TuningSelector } from './TuningSelector';
import { StringIndicator } from './StringIndicator';
import { FrequencyDisplay } from './FrequencyDisplay';
import { IntonationTargets } from './IntonationTargets';
import { A4Calibration } from './A4Calibration';
import { SignalStrength } from './SignalStrength';
import { TuningHistoryPanel } from './TuningHistoryPanel';
import { useTuningHistory } from '@/hooks/useTuningHistory';
import { useAudioMonitoring } from '@/hooks/useAudioMonitoring';
import { useTuningSelection } from '@/hooks/useTuningSelection';
import { useTunerPrefs } from '@/hooks/useTunerPrefs';
import { AudioDeviceSelector } from './AudioDeviceSelector';
import { TabBar } from '@/components/ui/TabBar';

export function GuitarTuner() {
  const { selectedTuning, setSelectedTuning } = useTuningSelection();
  const { a4, setA4, mode: tunerMode, setMode: setTunerMode } = useTunerPrefs();
  const { isListening, pitchData, error, startListening, stopListening } = usePitchDetection(a4);
  const { sessions, logReading, endSession, clearHistory } = useTuningHistory();
  const { isMonitoring, monitorVolume, startMonitoring, stopMonitoring, updateVolume } = useAudioMonitoring();
  const wasListeningRef = useRef(false);
  // Locking the tuner to a specific string — when set, target/cents come from this string,
  // not from the closest-note search. Used for intonation work where you don't want the
  // tuner to switch targets if the note drifts past a 50¢ boundary.
  const [lockedString, setLockedString] = useState<TuningNote | null>(null);
  const toggleStringLock = useCallback((note: TuningNote) => {
    setLockedString((prev) =>
      prev && prev.string === note.string && prev.note === note.note && prev.octave === note.octave
        ? null
        : note,
    );
  }, []);

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      endSession();
    } else {
      startListening();
    }
  }, [isListening, stopListening, endSession, startListening]);

  // Keyboard shortcuts:
  //   Space        - start/stop tuner
  //   M            - toggle audio monitor
  //   [  /  ]      - previous / next tuning
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack typing in inputs / selects.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggle();
      } else if (e.key === 'm' || e.key === 'M') {
        if (isMonitoring) stopMonitoring(); else startMonitoring();
      } else if (e.key === '[' || e.key === ']') {
        const idx = TUNINGS.findIndex((t) => t.id === selectedTuning.id);
        if (idx === -1) return;
        const next = e.key === ']'
          ? TUNINGS[(idx + 1) % TUNINGS.length]
          : TUNINGS[(idx - 1 + TUNINGS.length) % TUNINGS.length];
        setSelectedTuning(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleToggle, isMonitoring, startMonitoring, stopMonitoring, selectedTuning.id, setSelectedTuning]);

  // Clear lock if the tuning changes (locked string may not exist in new tuning)
  useEffect(() => {
    if (!lockedString) return;
    const exists = selectedTuning.notes.some(
      (n) => n.string === lockedString.string && n.note === lockedString.note && n.octave === lockedString.octave,
    );
    if (!exists) setLockedString(null);
  }, [selectedTuning, lockedString]);

  // When locked, override the target with the locked string and recompute cents
  // against its frequency. Otherwise, fall back to the closest-note auto-detect.
  const targetNote = lockedString ?? (pitchData
    ? findClosestNote(pitchData.frequency, selectedTuning)
    : null);

  const lockedCents = lockedString && pitchData
    ? 1200 * Math.log2(pitchData.frequency / lockedString.frequency)
    : null;
  // Cents to display in all the meters/strobe — use locked-cents when locking, else pitchData cents
  const displayCents = lockedCents ?? pitchData?.cents ?? 0;

  const isActive = isListening && pitchData !== null;

  // Log readings while tuning
  useEffect(() => {
    if (pitchData && isListening && targetNote) {
      logReading(
        pitchData.note,
        pitchData.octave,
        pitchData.cents,
        pitchData.frequency,
        targetNote.frequency,
        selectedTuning.name,
      );
    }
  }, [pitchData, isListening, targetNote, selectedTuning.name, logReading]);

  // End session if listening stops externally
  useEffect(() => {
    if (wasListeningRef.current && !isListening) {
      endSession();
    }
    wasListeningRef.current = isListening;
  }, [isListening, endSession]);

  return (
    <div className="flex flex-col items-center gap-4 md:gap-6">
      {error && (
        <div className="bg-destructive/20 border border-destructive/50 text-destructive rounded-lg px-4 py-3 text-sm max-w-md text-center">
          {error}
        </div>
      )}

        {/* Control deck — audio I/O + tuning/calibration/mode grouped as one rack panel */}
        <div className="w-full max-w-md mx-auto space-y-2.5">
          <AudioDeviceSelector />
          <div className="rounded-xl border border-border bg-card/40 p-3 space-y-3">
            <TuningSelector
              selectedTuning={selectedTuning}
              onTuningChange={setSelectedTuning}
            />
            <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border/50 pt-3">
              <A4Calibration a4={a4} onChange={setA4} />
              <TabBar
                tabs={[
                  { id: 'strobe', label: 'Strobe', icon: Disc },
                  { id: 'needle', label: 'Needle', icon: Gauge },
                ]}
                activeId={tunerMode}
                onChange={(id) => setTunerMode(id as 'strobe' | 'needle')}
                groupId="tuner-mode"
                variant="underline"
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* String indicator — clickable to lock the tuner to a specific string for intonation work */}
        <StringIndicator
          tuning={selectedTuning}
          currentNote={pitchData?.note || null}
          currentOctave={pitchData?.octave || null}
          isActive={isActive}
          lockedString={lockedString}
          onToggleLock={toggleStringLock}
        />

        {lockedString && (
          <button
            onClick={() => setLockedString(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono bg-amber-400/15 border border-amber-400/40 text-amber-300 hover:bg-amber-400/25 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <Unlock className="w-3 h-3" />
            Unlock {lockedString.note}{lockedString.octave} ({lockedString.frequency.toFixed(2)} Hz)
          </button>
        )}

        {/* Readout — live frequency comparison + intonation capture, grouped as one panel */}
        <div className="w-full max-w-md mx-auto rounded-xl border border-border/50 bg-card/20 p-3 space-y-3">
          <FrequencyDisplay
            currentFrequency={pitchData?.frequency || null}
            targetNote={targetNote}
            isActive={isActive}
          />
          <IntonationTargets
            targetNote={targetNote}
            currentFrequency={pitchData?.frequency || null}
            isActive={isActive}
            lockedString={lockedString}
          />
        </div>

        {/* Tuner display */}
        <div className="relative">
          {tunerMode === 'strobe' ? (
            <>
              <StrobeWheel
                cents={displayCents}
                isActive={isActive}
                clarity={pitchData?.clarity || 0}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <NoteDisplay
                  note={pitchData?.note || null}
                  octave={pitchData?.octave || null}
                  frequency={pitchData?.frequency || null}
                  isActive={isActive}
                  cents={displayCents}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <NeedleTuner
                cents={displayCents}
                isActive={isActive}
                clarity={pitchData?.clarity || 0}
              />
              <div className="mt-2">
                <NoteDisplay
                  note={pitchData?.note || null}
                  octave={pitchData?.octave || null}
                  frequency={pitchData?.frequency || null}
                  isActive={isActive}
                  cents={displayCents}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cents meter */}
        <CentsMeter cents={displayCents} isActive={isActive} />

        {/* Start/Stop button */}
        <Button
          onClick={handleToggle}
          size="lg"
          className={`mt-2 px-8 py-6 text-lg font-display font-bold rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-destructive hover:bg-destructive/90 shadow-[0_0_30px_hsl(var(--destructive)/0.3)]'
              : 'bg-primary hover:bg-primary/90 shadow-[0_0_30px_hsl(var(--primary)/0.3)]'
          }`}
        >
          {isListening ? (
            <><MicOff className="w-6 h-6 mr-2" />STOP</>
          ) : (
            <><Mic className="w-6 h-6 mr-2" />START</>
          )}
        </Button>

        {/* Signal strength + status */}
        <div className="flex items-center justify-center gap-4">
          <SignalStrength clarity={pitchData?.clarity || 0} isActive={isActive} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                isListening
                  ? pitchData ? 'bg-tuner-perfect animate-pulse-glow' : 'bg-primary animate-pulse'
                  : 'bg-muted-foreground'
              }`}
            />
            <span>
              {isListening ? (pitchData ? 'Signal detected' : 'Listening...') : 'Tap START to begin'}
            </span>
          </div>
        </div>

        {/* Audio Monitor */}
        <div className="flex items-center gap-3 bg-secondary/30 rounded-full px-4 py-2 border border-border">
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`flex items-center gap-1.5 text-xs font-display transition-all ${
              isMonitoring ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Headphones className={`w-4 h-4 ${isMonitoring ? 'text-primary' : ''}`} />
            {isMonitoring ? 'Monitor ON' : 'Monitor'}
          </button>
          {isMonitoring && (
            <Slider
              value={[monitorVolume * 100]}
              onValueChange={([v]) => updateVolume(v / 100)}
              min={0}
              max={100}
              className="w-20"
            />
          )}
        </div>

        {/* Tuning History */}
        <TuningHistoryPanel sessions={sessions} onClear={clearHistory} />
    </div>
  );
}
