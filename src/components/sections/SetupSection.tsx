import { useState } from 'react';
import { Wrench, Ruler } from 'lucide-react';
import { IntonationChecker } from '@/components/IntonationChecker';
import { GuitarSetupGuide } from '@/components/GuitarSetupGuide';

type SetupTab = 'intonation' | 'guide';

export function SetupSection() {
  const [activeTab, setActiveTab] = useState<SetupTab>('intonation');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border w-fit mx-auto">
        <button
          onClick={() => setActiveTab('intonation')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display transition-all ${
            activeTab === 'intonation'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          Intonation Check
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display transition-all ${
            activeTab === 'guide'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          Setup Guide
        </button>
      </div>

      {activeTab === 'intonation' ? <IntonationChecker /> : <GuitarSetupGuide />}
    </div>
  );
}
