import { useState } from 'react';
import {
  Zap, Menu, X,
  Crosshair, Wrench, Music, Box,
  Gauge, Hammer, Guitar, Mic,
  Activity, Ruler, Library,
} from 'lucide-react';
import { GuitarTuner } from '@/components/GuitarTuner';
import { ReferenceTonePlayer } from '@/components/ReferenceTonePlayer';
import { SetupSection } from '@/components/sections/SetupSection';
import { PracticeSection } from '@/components/sections/PracticeSection';
import { EffectsSection } from '@/components/sections/EffectsSection';
import { RecordingSection } from '@/components/sections/RecordingSection';
import { UtilitiesSection } from '@/components/sections/UtilitiesSection';
import { StratAnatomy3D } from '@/components/StratAnatomy3D';
import { SketchfabStratViewer } from '@/components/SketchfabStratViewer';
import { IntervalTrainer } from '@/components/trainer/IntervalTrainer';
import { ChordLibrary } from '@/components/trainer/ChordLibrary';
import { SectionGroup } from '@/components/sections/SectionGroup';
import { SectionCard } from '@/components/sections/SectionCard';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_GROUPS = [
  { id: 'tune', label: 'Tune', icon: Crosshair },
  { id: 'setup', label: 'Setup', icon: Wrench },
  { id: 'play', label: 'Play', icon: Gauge },
  { id: 'studio', label: 'Studio', icon: Guitar },
];

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Index = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleNav = (id: string) => {
    scrollToSection(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card/80">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Zap className="w-7 h-7 text-primary drop-shadow-[0_0_8px_rgba(230,50,80,0.6)] shrink-0" />
              <h1 className="font-display text-lg font-bold tracking-wider truncate">
                BLEED OUT ZONE
              </h1>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_GROUPS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={() => setMobileNavOpen((v) => !v)}
                className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary/50 transition-colors"
                aria-label="Toggle navigation"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile drawer */}
          {mobileNavOpen && (
            <nav className="md:hidden mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-1.5">
              {NAV_GROUPS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-display tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  <Icon className="w-4 h-4 text-primary/80" />
                  {label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-12 space-y-8">
        {/* TUNE — strobe tuner & string references */}
        <SectionGroup id="tune" label="Tune" caption="Strobe accuracy • String references" icon={Crosshair}>
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -m-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_60%)]"
            />
            <div className="relative rounded-2xl border border-primary/10 bg-card/30 backdrop-blur-sm p-4 sm:p-6 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.25)]">
              <GuitarTuner />
            </div>
          </div>
          <SectionCard
            icon={Music}
            title="Reference Tones"
            caption="Tap a string • By Ear • Play All"
          >
            <ReferenceTonePlayer />
          </SectionCard>
        </SectionGroup>

        {/* SETUP — intonation, action, and a 3D Strat for reference */}
        <SectionGroup id="setup" label="Setup & Reference" caption="Intonation • Specs • 3D anatomy" icon={Wrench}>
          <SectionCard
            icon={Wrench}
            title="Guitar Setup"
            caption="Intonation • Action • Relief • Radius"
          >
            <SetupSection />
          </SectionCard>
          <SectionCard
            icon={Box}
            title="Stratocaster Anatomy"
            caption="3D model • Scale length • Pickup positions"
          >
            <div className="space-y-6">
              <SketchfabStratViewer />
              <StratAnatomy3D />
            </div>
          </SectionCard>
        </SectionGroup>

        {/* PLAY — practice tools, theory utilities, and ear/eye trainers */}
        <SectionGroup id="play" label="Play" caption="Practice • Theory • Trainers" icon={Gauge}>
          <SectionCard
            icon={Activity}
            title="Practice Tools"
            caption="Metronome • Drummer • Chords • Speed trainer"
            defaultOpen
          >
            <PracticeSection />
          </SectionCard>
          <SectionCard
            icon={Ruler}
            title="Interval Trainer"
            caption="Visual + audio • Asc / Desc / Harmonic • Difficulty tiers"
          >
            <IntervalTrainer />
          </SectionCard>
          <SectionCard
            icon={Library}
            title="Chord Library"
            caption="Browse diagrams • Accuracy quiz by sight & sound"
          >
            <ChordLibrary />
          </SectionCard>
          <SectionCard
            icon={Hammer}
            title="Guitar Utilities"
            caption="Transpose • Fretboard • Modes • Ear • Tension"
          >
            <UtilitiesSection />
          </SectionCard>
        </SectionGroup>

        {/* STUDIO — sound design & recording */}
        <SectionGroup id="studio" label="Studio" caption="Effects • Tone matching • Recording" icon={Guitar}>
          <SectionCard
            icon={Guitar}
            title="Effects & Tones"
            caption="Pedals • Presets • Tone Matcher • Drums"
          >
            <EffectsSection />
          </SectionCard>
          <SectionCard
            icon={Mic}
            title="Recording"
            caption="Loop Recorder • Vocal Effects"
          >
            <RecordingSection />
          </SectionCard>
        </SectionGroup>
      </main>

      <footer className="py-4 text-center text-[10px] text-muted-foreground/40 space-y-0.5">
        <p>High-precision strobe tuning • ±0.1 cent accuracy</p>
        <p className="font-display tracking-wider">BLEED OUT ZONE™ by JLo</p>
      </footer>
    </div>
  );
};

export default Index;
