import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

interface SectionGroupProps {
  id: string;
  label: string;
  caption?: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function SectionGroup({ id, label, caption, icon: Icon, children }: SectionGroupProps) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-primary/80 drop-shadow-[0_0_6px_hsl(var(--primary)/0.7)]" />
          <h2 className="font-display text-xs font-black tracking-[0.3em] uppercase text-primary/70">
            {label}
          </h2>
        </div>
        {caption && (
          <span className="text-nano text-muted-foreground/70 font-mono truncate">
            {caption}
          </span>
        )}
        <div className="flex-1 h-px bg-gradient-to-r from-primary/40 via-primary/15 to-transparent ml-2" />
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
