import { useState } from 'react';
import { Wrench, Ruler, Crosshair } from 'lucide-react';
import { IntonationChecker } from '@/components/IntonationChecker';
import { GuitarSetupGuide } from '@/components/GuitarSetupGuide';
import { StratSetupDiagram } from '@/components/setup/StratSetupDiagram';

type SetupTab = 'diagram' | 'intonation' | 'guide';

const TABS: { id: SetupTab; label: string; icon: typeof Wrench }[] = [
  { id: 'diagram',    label: 'Setup Diagram',   icon: Crosshair },
  { id: 'intonation', label: 'Intonation Check', icon: Wrench },
  { id: 'guide',      label: 'Setup Guide',      icon: Ruler },
];

export function SetupSection() {
  const [activeTab, setActiveTab] = useState<SetupTab>('diagram');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border w-fit mx-auto flex-wrap justify-center">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display transition-all ${
              activeTab === id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'diagram' && <StratSetupDiagram />}
      {activeTab === 'intonation' && <IntonationChecker />}
      {activeTab === 'guide' && <GuitarSetupGuide />}
    </div>
  );
}
