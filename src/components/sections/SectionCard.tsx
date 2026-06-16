import { type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  caption?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SectionCard({ icon: Icon, title, caption, defaultOpen = false, children }: SectionCardProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group">
      <div
        className={cn(
          'border rounded-xl overflow-hidden transition-[border-color,background-color,box-shadow] duration-[250ms] ease-brand-settle',
          // Closed
          'bg-card/35 border-border/70 hover:border-primary/25 hover:shadow-glow-2',
          // Open — crimson left rail is the open signal (not color alone), lit surface
          'group-data-[state=open]:bg-card/55 group-data-[state=open]:backdrop-blur-md',
          'group-data-[state=open]:border-primary/12 group-data-[state=open]:border-l-2 group-data-[state=open]:border-l-primary',
          'group-data-[state=open]:shadow-[0_2px_24px_-4px_hsl(var(--background))]',
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3.5 hover:bg-secondary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className="w-4 h-4 text-primary/90 shrink-0" />
              <h3 className="font-display text-sm font-bold tracking-wide">{title}</h3>
              {caption && (
                <span className="text-[10px] text-muted-foreground/80 truncate hidden sm:inline">
                  {caption}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground/50 group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary transition-transform shrink-0" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-primary/10 px-4 pb-5 pt-3">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
