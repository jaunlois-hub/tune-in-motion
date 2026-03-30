import { Zap, Gauge, ChevronDown, Wrench, Ruler } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GuitarTuner } from '@/components/GuitarTuner';
import { MetronomeView } from '@/components/metronome/MetronomeView';
import { StudioView } from '@/components/studio/StudioView';
import { IntonationChecker } from '@/components/IntonationChecker';
import { GuitarSetupGuide } from '@/components/GuitarSetupGuide';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { id: 'tuner', label: '🎸 Tuner' },
  { id: 'intonation', label: '🔧 Intonation' },
  { id: 'setup', label: '📐 Setup' },
  { id: 'metronome', label: '🎵 Metronome' },
  { id: 'studio', label: '🎛️ Studio' },
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

      {/* Main Content - Single scrollable page */}
      <main className="container mx-auto px-4 py-6 pb-8 space-y-4">
        {/* Tuner - Always visible as primary tool */}
        <section id="tuner" className="scroll-mt-20">
          <GuitarTuner />
        </section>

        {/* Intonation Check - Collapsible */}
        <section id="intonation" className="scroll-mt-20">
          <Collapsible>
            <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-lg font-bold">🔧 Intonation Check</h2>
                    <span className="text-[10px] text-muted-foreground">Test each string • Saddle adjustment</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <IntonationChecker />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        {/* Guitar Setup Guide - Collapsible */}
        <section id="setup" className="scroll-mt-20">
          <Collapsible>
            <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Ruler className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-lg font-bold">📐 Guitar Setup Guide</h2>
                    <span className="text-[10px] text-muted-foreground">Action • Relief • Radius • Pickups</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <GuitarSetupGuide />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        {/* Metronome - Collapsible */}
        <section id="metronome" className="scroll-mt-20">
          <Collapsible>
            <div className="bg-card/50 border border-border rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Gauge className="w-5 h-5 text-primary" />
                    <h2 className="font-display text-lg font-bold">🎵 Metronome</h2>
                    <span className="text-[10px] text-muted-foreground">Tap tempo • Time signatures</span>
                  </div>
                  <ChevronDown className="w-5 h-5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0">
                  <MetronomeView />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        {/* Studio Tools - Effects, Drums, Loops, Chords, etc. */}
        <section id="studio" className="scroll-mt-20">
          <StudioView />
        </section>
      </main>

      <footer className="py-3 text-center text-[10px] text-muted-foreground/40 space-y-0.5">
        <p>High-precision strobe tuning • ±0.1 cent accuracy</p>
        <p className="font-display tracking-wider">BLEED OUT ZONE™ PRO by JLo</p>
      </footer>
    </div>
  );
};

export default Index;
