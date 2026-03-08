import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guitar, Gauge, Mic2, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuitarTuner } from '@/components/GuitarTuner';
import { MetronomeView } from '@/components/metronome/MetronomeView';
import { StudioView } from '@/components/studio/StudioView';
import { ThemeToggle } from '@/components/ThemeToggle';

type Tab = 'tuner' | 'metronome' | 'studio';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'tuner', label: 'Tuner', icon: <Guitar className="w-5 h-5" /> },
  { id: 'metronome', label: 'Metronome', icon: <Gauge className="w-5 h-5" /> },
  { id: 'studio', label: 'Studio', icon: <Mic2 className="w-5 h-5" /> },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('tuner');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skull className="w-8 h-8 text-destructive drop-shadow-[0_0_8px_rgba(255,100,100,0.6)]" />
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

      {/* Navigation Tabs */}
      <nav className="sticky top-[73px] z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'tuner' && <GuitarTuner />}
            {activeTab === 'metronome' && <MetronomeView />}
            {activeTab === 'studio' && <StudioView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden backdrop-blur-xl bg-background/95 border-t border-border">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <footer className="py-3 text-center text-[10px] text-muted-foreground/40 space-y-0.5 pb-20 sm:pb-3">
        <p>High-precision strobe tuning • ±0.1 cent accuracy</p>
        <p className="font-display tracking-wider">BLEED OUT ZONE™ PRO by JLo</p>
      </footer>
    </div>
  );
};

export default Index;
