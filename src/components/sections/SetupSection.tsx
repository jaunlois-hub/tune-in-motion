import { useState } from 'react';
import { Wrench, Ruler, Crosshair } from 'lucide-react';
import { TabBar } from '@/components/ui/TabBar';
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
      <TabBar
        tabs={TABS}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as SetupTab)}
        groupId="setup-section"
        className="mx-auto w-fit flex-wrap justify-center"
      />

      {activeTab === 'diagram' && <StratSetupDiagram />}
      {activeTab === 'intonation' && <IntonationChecker />}
      {activeTab === 'guide' && <GuitarSetupGuide />}
    </div>
  );
}
