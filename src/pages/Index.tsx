import { Zap, ChevronDown, Wrench, Gauge, Guitar, Mic } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GuitarTuner } from '@/components/GuitarTuner';
import { SetupSection } from '@/components/sections/SetupSection';
import { PracticeSection } from '@/components/sections/PracticeSection';
import { EffectsSection } from '@/components/sections/EffectsSection';
import { RecordingSection } from '@/components/sections/RecordingSection';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { id: 'tuner', label: '🎸 Tuner' },
  { id: 'setup', label: '🔧 Setup' },
  { id: 'practice', label: '🎵 Practice' },
  { id: 'effects', label: '🎛️ Effects' },
  { id: 'record', label: '🎙️ Record' },
];

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-7 h-7 text-destructive drop-shadow-[0_0_8px_rgba(255,100,100,0.6)]" />
              <div>
                <h1 className="font-display text-lg font-bold tracking-wider">
                  BLEED OUT ZONE
                </h1>
              </div>
            </div>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-display text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-8 space-y-4">
        {/* 1. Tuner - Always visible */}
        <section id="tuner" className="scroll-mt-20">
          <GuitarTuner />
        </section>

        {/* 2. Guitar Setup - Intonation + Setup Guide */}
        <section id="setup" className="scroll-mt-20">
          <Collapsible>
            <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-lg font-bold">🔧 Guitar Setup</h2>
                    <span className="text-[10px] text-muted-foreground">Intonation • Action • Relief • Radius</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <SetupSection />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        {/* 3. Practice - Metronome + Smart Drummer + Chords */}
        <section id="practice" className="scroll-mt-20">
          <Collapsible>
            <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Gauge className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-lg font-bold">🎵 Practice Tools</h2>
                    <span className="text-[10px] text-muted-foreground">Metronome • Smart Drummer • Chord Recognition</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <PracticeSection />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        {/* 4. Effects & Tones */}
        <section id="effects" className="scroll-mt-20">
          <Collapsible>
            <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Guitar className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-lg font-bold">🎛️ Effects & Tones</h2>
                    <span className="text-[10px] text-muted-foreground">Pedals • Presets • Tone Matcher • Drums</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <EffectsSection />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        {/* 5. Recording */}
        <section id="record" className="scroll-mt-20">
          <Collapsible>
            <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-lg font-bold">🎙️ Recording</h2>
                    <span className="text-[10px] text-muted-foreground">Loop Recorder • Vocal Effects</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <RecordingSection />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>
      </main>

      <footer className="py-3 text-center text-[10px] text-muted-foreground/40 space-y-0.5">
        <p>High-precision strobe tuning • ±0.1 cent accuracy</p>
        <p className="font-display tracking-wider">BLEED OUT ZONE™ by JLo</p>
      </footer>
    </div>
  );
};

export default Index;
