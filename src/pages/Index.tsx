import { Zap, Gauge, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GuitarTuner } from '@/components/GuitarTuner';
import { MetronomeView } from '@/components/metronome/MetronomeView';
import { StudioView } from '@/components/studio/StudioView';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-destructive drop-shadow-[0_0_8px_rgba(255,100,100,0.6)]" />
              <div>
                <h1 className="font-display text-xl font-bold tracking-wider">
                  BLEED OUT ZONE <span className="text-primary">PRO</span>
                </h1>
                <p className="text-xs text-muted-foreground">
                  Tuner • Metronome • Effects • Drums • Loops — by JLo
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - Single scrollable page */}
      <main className="container mx-auto px-4 py-6 pb-8 space-y-4">
        {/* Tuner - Always visible as primary tool */}
        <GuitarTuner />

        {/* Metronome - Collapsible */}
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

        {/* Studio Tools - Effects, Drums, Loops, Chords, etc. */}
        <StudioView />
      </main>

      <footer className="py-3 text-center text-[10px] text-muted-foreground/40 space-y-0.5">
        <p>High-precision strobe tuning • ±0.1 cent accuracy</p>
        <p className="font-display tracking-wider">BLEED OUT ZONE™ PRO by JLo</p>
      </footer>
    </div>
  );
};

export default Index;
