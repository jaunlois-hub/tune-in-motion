import { useState } from 'react';
import { Gauge, Activity, Music, Circle, Drum, Guitar, Mic2 } from 'lucide-react';
import { MetronomeView } from '@/components/metronome/MetronomeView';
import { SmartDrummer } from '@/components/SmartDrummer';
import { ChordRecognitionView } from '@/components/studio/ChordRecognitionView';
import { CircleOfFifths } from '@/components/practice/CircleOfFifths';
import { RhythmPatterns } from '@/components/practice/RhythmPatterns';
import { RiffsAndScales } from '@/components/practice/RiffsAndScales';
import { JamSession } from '@/components/practice/JamSession';

type PracticeTab = 'metronome' | 'drummer' | 'chords' | 'circle' | 'rhythms' | 'riffs' | 'jam';

const TABS: { id: PracticeTab; label: string; icon: React.ElementType }[] = [
  { id: 'metronome', label: 'Metronome', icon: Gauge },
  { id: 'drummer', label: 'Smart Drummer', icon: Activity },
  { id: 'chords', label: 'Chords', icon: Music },
  { id: 'circle', label: 'Circle of 5ths', icon: Circle },
  { id: 'rhythms', label: 'Rhythms', icon: Drum },
  { id: 'riffs', label: 'Riffs & Scales', icon: Guitar },
  { id: 'jam', label: 'Jam Session', icon: Mic2 },
];

export function PracticeSection() {
  const [activeTab, setActiveTab] = useState<PracticeTab>('metronome');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-1 border border-border w-fit mx-auto flex-wrap justify-center">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-display transition-all ${
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

      {activeTab === 'metronome' && <MetronomeView />}
      {activeTab === 'drummer' && <SmartDrummer />}
      {activeTab === 'chords' && <ChordRecognitionView />}
      {activeTab === 'circle' && <CircleOfFifths />}
      {activeTab === 'rhythms' && <RhythmPatterns />}
      {activeTab === 'riffs' && <RiffsAndScales />}
      {activeTab === 'jam' && <JamSession />}
    </div>
  );
}
