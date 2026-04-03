import { useState } from 'react';
import { Gauge, Activity, Music } from 'lucide-react';
import { MetronomeView } from '@/components/metronome/MetronomeView';
import { SmartDrummer } from '@/components/SmartDrummer';
import { ChordRecognitionView } from '@/components/studio/ChordRecognitionView';

type PracticeTab = 'metronome' | 'drummer' | 'chords';

export function PracticeSection() {
  const [activeTab, setActiveTab] = useState<PracticeTab>('metronome');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border w-fit mx-auto">
        <button
          onClick={() => setActiveTab('metronome')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-display transition-all ${
            activeTab === 'metronome'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          Metronome
        </button>
        <button
          onClick={() => setActiveTab('drummer')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-display transition-all ${
            activeTab === 'drummer'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Smart Drummer
        </button>
        <button
          onClick={() => setActiveTab('chords')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-display transition-all ${
            activeTab === 'chords'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          Chords
        </button>
      </div>

      {activeTab === 'metronome' && <MetronomeView />}
      {activeTab === 'drummer' && <SmartDrummer />}
      {activeTab === 'chords' && <ChordRecognitionView />}
    </div>
  );
}
