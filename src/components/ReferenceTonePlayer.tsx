import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Ear, ListMusic, Square } from 'lucide-react';
import { TuningSelector } from './TuningSelector';
import { useReferenceTone } from '@/hooks/useReferenceTone';
import { useTuningSelection } from '@/hooks/useTuningSelection';

export function ReferenceTonePlayer() {
  const { selectedTuning, setSelectedTuning } = useTuningSelection();
  const { playingFrequency, toggle, stop, playForDuration } = useReferenceTone();
  const [byEarMode, setByEarMode] = useState(false);
  const [playingAll, setPlayingAll] = useState(false);
  const playAllRef = useRef<number[]>([]);

  const cancelSequence = useCallback(() => {
    playAllRef.current.forEach(clearTimeout);
    playAllRef.current = [];
    setPlayingAll(false);
  }, []);

  const handleTone = useCallback((frequency: number) => {
    if (byEarMode) {
      playForDuration(frequency, 2000);
    } else {
      toggle(frequency);
    }
  }, [byEarMode, toggle, playForDuration]);

  const playAll = useCallback(() => {
    if (playingAll) return;
    cancelSequence();
    setPlayingAll(true);

    const notes = [...selectedTuning.notes].reverse();
    notes.forEach((note, i) => {
      const t = window.setTimeout(() => {
        playForDuration(note.frequency, 2500);
      }, i * 3000);
      playAllRef.current.push(t);
    });

    const endT = window.setTimeout(() => setPlayingAll(false), notes.length * 3000);
    playAllRef.current.push(endT);
  }, [selectedTuning.notes, playForDuration, playingAll, cancelSequence]);

  const handleStopAll = useCallback(() => {
    cancelSequence();
    stop();
  }, [cancelSequence, stop]);

  useEffect(() => () => cancelSequence(), [cancelSequence]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-xs">
        <TuningSelector
          selectedTuning={selectedTuning}
          onTuningChange={(t) => { setSelectedTuning(t); stop(); cancelSequence(); }}
        />
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={() => setByEarMode(!byEarMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display transition-all border ${
            byEarMode
              ? 'bg-accent/20 border-accent text-accent'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ear className="w-3 h-3" />
          By Ear
        </button>
        <button
          onClick={playAll}
          disabled={playingAll}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display transition-all border ${
            playingAll
              ? 'bg-primary/20 border-primary text-primary animate-pulse'
              : 'border-border text-muted-foreground hover:text-foreground disabled:opacity-50'
          }`}
        >
          <ListMusic className="w-3 h-3" />
          {playingAll ? 'Playing...' : 'Play All'}
        </button>
        <button
          onClick={handleStopAll}
          disabled={!playingFrequency && !playingAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display transition-all border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Square className="w-3 h-3" />
          Stop
        </button>
      </div>

      {byEarMode && (
        <p className="text-center text-[10px] text-muted-foreground">
          Tap a string — hear it for 2 seconds, then tune by memory
        </p>
      )}

      <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
        {selectedTuning.notes.map((note) => {
          const isPlaying = playingFrequency === note.frequency;

          return (
            <button
              key={note.string}
              onClick={() => handleTone(note.frequency)}
              className={`flex flex-col items-center transition-all duration-200 group cursor-pointer ${
                isPlaying ? 'scale-110' : 'hover:scale-105'
              }`}
            >
              <div
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-display font-bold text-sm md:text-base border-2 transition-all duration-200 ${
                  isPlaying
                    ? 'bg-accent/30 border-accent text-accent shadow-lg animate-pulse-glow'
                    : 'bg-secondary/30 border-border text-muted-foreground group-hover:border-primary/50'
                }`}
              >
                {note.note}
                <span className="text-[10px] opacity-70">{note.octave}</span>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                    isPlaying ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground opacity-0 group-hover:opacity-100'
                  } transition-opacity`}
                >
                  {isPlaying ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                </div>
              </div>
              <span
                className={`text-[10px] mt-1 font-mono transition-colors ${
                  isPlaying ? 'text-accent' : 'text-muted-foreground/60'
                }`}
              >
                {note.frequency.toFixed(0)}Hz
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
