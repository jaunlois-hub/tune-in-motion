import { useState } from 'react';
import { Mic, MicOff, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { useReferenceTone } from '@/hooks/useReferenceTone';
import { TUNINGS, type Tuning, findClosestNote } from '@/lib/tunings';
import { StrobeWheel } from './StrobeWheel';
import { NoteDisplay } from './NoteDisplay';
import { CentsMeter } from './CentsMeter';
import { TuningSelector } from './TuningSelector';
import { StringIndicator } from './StringIndicator';
import { FrequencyDisplay } from './FrequencyDisplay';
import { A4Calibration } from './A4Calibration';

export function GuitarTuner() {
  const [selectedTuning, setSelectedTuning] = useState<Tuning>(TUNINGS[0]);
  const [a4, setA4] = useState(440);
  const { isListening, pitchData, error, startListening, stopListening } = usePitchDetection();
  const { playingFrequency, toggle: toggleTone, stop: stopTone } = useReferenceTone();

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      stopTone();
    } else {
      startListening();
    }
  };

  const targetNote = pitchData
    ? findClosestNote(pitchData.frequency, selectedTuning)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-6 pb-2 px-4">
        <div className="flex items-center justify-center gap-3">
          <Skull className="w-8 h-8 text-destructive drop-shadow-[0_0_8px_rgba(255,100,100,0.6)]" />
          <div className="text-center">
            <h1 className="font-display text-xl md:text-2xl font-black tracking-widest text-glow uppercase">
              Bleed Out Zone
            </h1>
            <p className="font-display text-[10px] tracking-[0.3em] text-primary/70 uppercase -mt-0.5">
              Strobe Tuner by JLo
            </p>
          </div>
          <Skull className="w-8 h-8 text-destructive drop-shadow-[0_0_8px_rgba(255,100,100,0.6)]" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-6 gap-4 md:gap-6">
        {/* Error message */}
        {error && (
          <div className="bg-destructive/20 border border-destructive/50 text-destructive rounded-lg px-4 py-3 text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {/* A4 Calibration + Tuning selector row */}
        <div className="flex flex-col items-center gap-3 w-full">
          <TuningSelector
            selectedTuning={selectedTuning}
            onTuningChange={(t) => { setSelectedTuning(t); stopTone(); }}
          />
          <A4Calibration a4={a4} onChange={setA4} />
        </div>

        {/* String indicator with tap-to-play */}
        <StringIndicator
          tuning={selectedTuning}
          currentNote={pitchData?.note || null}
          currentOctave={pitchData?.octave || null}
          isActive={isListening && pitchData !== null}
          playingFrequency={playingFrequency}
          onPlayTone={toggleTone}
        />

        {/* Frequency comparison */}
        <FrequencyDisplay
          currentFrequency={pitchData?.frequency || null}
          targetNote={targetNote}
          isActive={isListening && pitchData !== null}
        />

        {/* Strobe wheel */}
        <div className="relative">
          <StrobeWheel
            cents={pitchData?.cents || 0}
            isActive={isListening && pitchData !== null}
            clarity={pitchData?.clarity || 0}
          />
          
          {/* Note display overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <NoteDisplay
              note={pitchData?.note || null}
              octave={pitchData?.octave || null}
              frequency={pitchData?.frequency || null}
              isActive={isListening && pitchData !== null}
              cents={pitchData?.cents || 0}
            />
          </div>
        </div>

        {/* Cents meter */}
        <CentsMeter
          cents={pitchData?.cents || 0}
          isActive={isListening && pitchData !== null}
        />

        {/* Start/Stop button */}
        <Button
          onClick={handleToggle}
          size="lg"
          className={`mt-2 px-8 py-6 text-lg font-display font-bold rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-destructive hover:bg-destructive/90 shadow-[0_0_30px_rgba(255,100,100,0.3)]'
              : 'bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(45,212,191,0.3)]'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-6 h-6 mr-2" />
              STOP
            </>
          ) : (
            <>
              <Mic className="w-6 h-6 mr-2" />
              START
            </>
          )}
        </Button>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              isListening
                ? pitchData
                  ? 'bg-tuner-perfect animate-pulse-glow'
                  : 'bg-primary animate-pulse'
                : 'bg-muted-foreground'
            }`}
          />
          <span>
            {isListening
              ? pitchData
                ? 'Signal detected'
                : 'Listening...'
              : 'Tap START to begin'}
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-[10px] text-muted-foreground/40 space-y-0.5">
        <p>High-precision strobe tuning • ±0.1 cent accuracy</p>
        <p className="font-display tracking-wider">BLEED OUT ZONE™ by JLo</p>
      </footer>
    </div>
  );
}
