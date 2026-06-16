import { type ElementType } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';

const trackVariants = cva('flex items-center', {
  variants: {
    variant: {
      pill: 'bg-[hsl(var(--card)/0.8)] border border-border rounded-xl p-1 gap-0.5 [box-shadow:inset_0_1px_3px_hsl(240_15%_3%_/_0.6)]',
      underline: 'gap-4 border-b border-border/30',
      chip: 'gap-1.5 flex-wrap',
    },
    size: { md: '', sm: '' },
  },
  defaultVariants: { variant: 'pill', size: 'md' },
});

const itemVariants = cva(
  'relative flex items-center justify-center font-display transition-[color,background-color,box-shadow] duration-150 ease-brand-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-card',
  {
    variants: {
      variant: {
        pill: 'rounded-full',
        underline: 'pb-2 border-b-2 border-transparent',
        chip: 'rounded-full border',
      },
      size: {
        md: 'px-3.5 py-1.5 text-xs gap-1.5 min-h-[44px]',
        sm: 'px-2.5 py-1 text-[0.625rem] gap-1.5 uppercase tracking-widest min-h-[40px]',
      },
      active: { true: '', false: '' },
    },
    compoundVariants: [
      { variant: 'pill', active: true, class: 'text-primary-foreground font-bold shadow-tab-active' },
      { variant: 'pill', active: false, class: 'text-muted-foreground hover:text-primary/90 hover:bg-primary/10' },
      { variant: 'underline', active: true, class: 'text-primary font-bold' },
      { variant: 'underline', active: false, class: 'text-muted-foreground hover:text-primary/80' },
      { variant: 'chip', active: true, class: 'bg-primary/20 border-primary/50 text-primary font-bold' },
      { variant: 'chip', active: false, class: 'bg-transparent border-border/50 text-muted-foreground hover:text-primary/80 hover:border-primary/30 hover:bg-primary/5' },
    ],
    defaultVariants: { variant: 'pill', size: 'md', active: false },
  },
);

export interface TabItem {
  id: string;
  label: string;
  icon?: ElementType;
}

interface TabBarProps extends VariantProps<typeof trackVariants> {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Unique per TabBar instance — scopes the framer layoutId so multiple bars don't fight. */
  groupId: string;
  className?: string;
}

export function TabBar({ tabs, activeId, onChange, groupId, variant = 'pill', size = 'md', className }: TabBarProps) {
  return (
    <div role="tablist" aria-label={groupId} className={cn(trackVariants({ variant, size }), className)}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeId;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(itemVariants({ variant, size, active: isActive }))}
          >
            {variant === 'pill' && isActive && (
              <motion.span
                layoutId={`tab-pill-${groupId}`}
                className="absolute inset-0 rounded-full bg-primary -z-10"
                style={{ boxShadow: 'var(--glow-3)' }}
                transition={SPRING.tab}
              />
            )}
            {variant === 'underline' && isActive && (
              <motion.span
                layoutId={`tab-underline-${groupId}`}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                transition={SPRING.tab}
              />
            )}
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
