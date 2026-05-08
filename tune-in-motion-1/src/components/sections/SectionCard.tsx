import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  caption?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SectionCard({ icon: Icon, title, caption, defaultOpen = false, children }: SectionCardProps) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className="bg-card/40 border border-border/70 rounded-xl overflow-hidden hover:border-border transition-colors">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3.5 hover:bg-secondary/20 transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-4 h-4 text-primary/90 shrink-0" />
              <h3 className="font-display text-sm font-bold tracking-wide">{title}</h3>
              {caption && (
                <span className="text-[10px] text-muted-foreground/80 truncate hidden sm:inline">
                  {caption}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform shrink-0" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
