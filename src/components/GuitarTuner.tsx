import { useState } from 'react';
import { Mic, MicOff, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePitchDetection } from '@/hooks/usePitchDetection';
import { TUNINGS, type Tuning } from '@/lib/tunings';
import { StrobeWheel } from './StrobeWheel';
import { NoteDisplay } from './NoteDisplay';
import { CentsMeter } from './CentsMeter';
import { TuningSelector } from './TuningSelector';
import { StringIndicator } from './StringIndicator';

export function GuitarTuner() {
  const [selectedTuning, setSelectedTuning] = useState<Tuning>(TUNINGS[0]);
  const { isListening, pitchData, error, startListening, stopListening } = usePitchDetection();

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="pt-6 pb-4 px-4">
        <div className="flex items-center justify-center gap-3">
          <Music2 className="w-8 h-8 text-primary" />
          <h1 className="font-display text-2xl md:text-3xl font-bold text-glow">
            STROBE TUNER
          </h1>
        </div>
        <p className="text-center text-muted-foreground text-sm mt-1">
          Precision Guitar Tuner
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-6 md:gap-8">
        {/* Error message */}
        {error && (
          <div className="bg-destructive/20 border border-destructive/50 text-destructive rounded-lg px-4 py-3 text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {/* Tuning selector */}
        <TuningSelector
          selectedTuning={selectedTuning}
          onTuningChange={setSelectedTuning}
        />

        {/* String indicator */}
        <StringIndicator
          tuning={selectedTuning}
          currentNote={pitchData?.note || null}
          currentOctave={pitchData?.octave || null}
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
          className={`mt-4 px-8 py-6 text-lg font-display font-bold rounded-full transition-all duration-300 ${
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
      <footer className="py-4 text-center text-xs text-muted-foreground/50">
        <p>High-precision strobe tuning • ±0.1 cent accuracy</p>
      </footer>
    </div>
  );
}
