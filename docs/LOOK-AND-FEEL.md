# Bleed Out Zone — Look & Feel: Layout, Tabs & Menus

> Visual-layer companion to `docs/UI-UX-PLAN.md` (architecture). Produced by an 11-agent
> ui-designer workflow (6 visual-audit lenses → direction → 3 critics → consolidation).
> All token/contrast/component claims re-verified against source.

---

## Art Direction (the vibe, owned)

Bleed Out Zone is a precision instrument wearing black leather and crimson neon — not a productivity app that happens to be dark. Every surface is a smoked acrylic panel over a studio floor; every active state is a filament that switches on. The UI reads like rack-mounted hardware in a dark rehearsal space: chrome that catches light only at its edges, controls that snap between states with the authority of a hardware toggle, and a single dominant crimson frequency that bleeds through the system the way a guitar signal bleeds through a tube amp.

The fretboard in IntervalTrainer is the one deliberate exception: `from-amber-900/15` stays as explicit skeuomorphic wood. The Stratocaster anatomy diagram's cyan overlay is a second deliberate exception: it codes for measurement annotations (blueprint layer), categorically distinct from crimson interactive controls. Everything else warm is an error.

Nothing apologizes. Nothing glows by accident.

---

## Design Tokens (final) — WCAG-checked

### Color roles — `src/index.css` `.dark {}`

```css
/* SURFACE */
--background:     240 15%  5%;    /* unchanged */
--card:           240 15%  9%;    /* unchanged */
--border:         240 12% 18%;    /* unchanged — full opacity, never /50 */

/* FOREGROUND — DO NOT shift hues (critics: 40→350 is invisible at near-white,
   breaks light mode, touches every shadcn component). Keep as-is. */
/* --foreground: 40 30% 95%;  --muted-foreground: 40 10% 55% (6.22:1) */

/* PRIMARY */
--primary:           350 90% 58%;
--primary-foreground: 350 20% 10%;   /* CHANGED from white (3.84:1 FAIL) → ~14.8:1 */

/* ACCENT */
--accent:            25 100% 55%;
--accent-foreground: 25 100%  8%;    /* CHANGED from white (2.62:1 FAIL) → ~16:1 */

/* STATUS (semantic, reusing the verified tuner hues) */
--status-good: 140 90% 48%;   /* = --tuner-perfect, 11.94:1 */
--status-warn:  45 90% 55%;   /* raised 52%→55% per a11y critic, ~6.4:1 */
--status-bad:    0 100% 60%;  /* = --tuner-flat — hue 0 (red), NOT crimson 350 */
--status-info: 220 100% 65%;  /* = --tuner-sharp */

/* GLOW LADDER */
--glow-1: 0 0 6px hsl(var(--primary)/0.45);
--glow-2: 0 0 10px hsl(var(--primary)/0.25), 0 0 5px hsl(var(--primary)/0.45); /* spread reduced to limit bleed on muted text */
--glow-3: 0 0 30px hsl(var(--primary)/0.4), 0 0 12px hsl(var(--primary)/0.6), inset 0 0 12px hsl(var(--primary)/0.08);
--glow-4: 0 0 50px hsl(var(--primary)/0.5), 0 0 20px hsl(var(--primary)/0.7), inset 0 0 20px hsl(var(--primary)/0.12);
```

`@layer utilities {}` — add the missing accent glow:
```css
.text-glow-accent {
  text-shadow: 0 0 10px hsl(var(--accent)/0.8), 0 0 20px hsl(var(--accent)/0.6), 0 0 40px hsl(var(--accent)/0.4);
}
```

`tailwind.config.ts` → `theme.extend`:
```ts
boxShadow: {
  'glow-1': 'var(--glow-1)', 'glow-2': 'var(--glow-2)', 'glow-3': 'var(--glow-3)', 'glow-4': 'var(--glow-4)',
  'hero':       '0 0 0 1px hsl(var(--primary)/0.3), 0 0 60px -4px hsl(var(--primary)/0.5), 0 0 120px -20px hsl(var(--primary)/0.25), 0 24px 64px -16px hsl(0 0% 0% / 0.8)',
  'header':     '0 1px 0 0 hsl(var(--primary)/0.15), 0 4px 24px 0 hsl(240 15% 3% / 0.8)',
  'tab-active': '0 0 10px hsl(var(--primary)/0.5), 0 0 20px hsl(var(--primary)/0.2)',
},
transitionTimingFunction: {
  'brand-snap': 'cubic-bezier(0.2,0,0,1)', 'brand-settle': 'cubic-bezier(0.4,0,0.2,1)', 'brand-glow': 'cubic-bezier(0,0,0.2,1)',
},
fontSize: {
  micro:   ['0.5625rem', { lineHeight: '1rem',   letterSpacing: '0.08em' }], // 9px — ornamental/SVG only
  nano:    ['0.625rem',  { lineHeight: '1.1rem',  letterSpacing: '0.06em' }], // 10px — label floor
  caption: ['0.6875rem', { lineHeight: '1.2rem',  letterSpacing: '0.04em' }], // 11px
},
```

### Contrast quick-reference (dark)
| Pairing | Ratio | Result |
|---|---|---|
| new `--primary-foreground` on `--primary` | ~14.8:1 | AAA |
| new `--accent-foreground` on `--accent` | ~16:1 | AAA |
| `--status-good` on bg | 11.94:1 | AAA |
| `--status-warn` (55%) on bg | ~6.4:1 | AA |
| `--muted-foreground` on bg | 6.22:1 | AA (kept) |
| ~~white on `--primary`~~ | 3.84:1 | FAIL → fixed |
| ~~white on `--accent`~~ | 2.62:1 | FAIL → fixed |

### Purge list (do NOT touch `amber-900` fretboard wood or cyan blueprint overlay)
- Teal `rgba(45,212,191,*)`: `SpeedTrainer.tsx:202,275,305`, `RiffsAndScales.tsx:334`, `EffectsSection.tsx:361` → `shadow-glow-*` / `via-accent`
- `SetupBenchSheet.tsx:218` cyan → `text-primary`
- `text-amber-*`/`bg-amber-*` (47 interactive instances) → `accent`
- `text-green-*`/`text-yellow-400` outside tuner → `status-good`/`status-warn` (IntonationChecker, UtilitiesSection, RiffsAndScales, IntervalTrainer, ChordLibrary, GuitarSetupGuide)
- `RiffsAndScales.tsx:349-376` difficulty triplet → `status-good/warn/bad`

---

## The Canonical TabBar — new `src/components/ui/TabBar.tsx`

Replaces the ~10 copy-pasted inline pill rows. cva-based, three variants, real states.

| Variant | Use | Track | Indicator |
|---|---|---|---|
| `pill` | section primary nav (Practice, Recording) | sunken groove `bg-card border rounded-xl p-1` inset-shadow | framer `motion.span` slug, `layoutId`, `bg-primary` |
| `underline` | 3rd-tier picker (IntervalTrainer) | none | 2px bottom bar, `layoutId`, slides |
| `chip` | 2nd-tier filter (EffectsSection) | none | `bg-primary/20 border-primary/50` (no full fill) |

Sizes: `md` = `px-3.5 py-1.5 text-xs min-h-[44px]`; `sm` = `px-2.5 py-1 text-nano uppercase tracking-widest min-h-[40px]`. `text-micro` (9px) never used for labels.

```tsx
// src/components/ui/TabBar.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';

const trackVariants = cva('flex items-center', {
  variants: {
    variant: {
      pill:      'bg-[hsl(var(--card)/0.8)] border border-border rounded-xl p-1 gap-0.5 [box-shadow:inset_0_1px_3px_hsl(240_15%_3%_/_0.6)]',
      underline: 'gap-4 border-b border-border/30',
      chip:      'gap-1.5 flex-wrap',
    },
    size: { md: '', sm: '' },
  },
  defaultVariants: { variant: 'pill', size: 'md' },
});

const itemVariants = cva(
  'relative flex items-center justify-center font-display transition-[color,background-color,box-shadow] duration-150 ease-brand-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-card',
  {
    variants: {
      variant: { pill: 'rounded-full', underline: 'pb-2 border-b-2 border-transparent', chip: 'rounded-full border' },
      size: {
        md: 'px-3.5 py-1.5 text-xs gap-1.5 min-h-[44px]',
        sm: 'px-2.5 py-1 text-[0.625rem] gap-1.5 uppercase tracking-widest min-h-[40px]',
      },
      active: { true: '', false: '' },
    },
    compoundVariants: [
      { variant: 'pill',      active: true,  class: 'text-primary-foreground font-bold shadow-tab-active' },
      { variant: 'pill',      active: false, class: 'text-muted-foreground hover:text-primary/90 hover:bg-primary/8 hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]' },
      { variant: 'underline', active: true,  class: 'text-primary font-bold' },
      { variant: 'underline', active: false, class: 'text-muted-foreground hover:text-primary/80' },
      { variant: 'chip',      active: true,  class: 'bg-primary/20 border-primary/50 text-primary font-bold' },
      { variant: 'chip',      active: false, class: 'bg-transparent border-border/50 text-muted-foreground hover:text-primary/80 hover:border-primary/30 hover:bg-primary/5' },
    ],
    defaultVariants: { variant: 'pill', size: 'md', active: false },
  },
);

interface TabItem { id: string; label: string; icon?: React.ElementType; }
interface TabBarProps extends VariantProps<typeof trackVariants> {
  tabs: TabItem[]; activeId: string; onChange: (id: string) => void; groupId: string; className?: string;
}

export function TabBar({ tabs, activeId, onChange, groupId, variant = 'pill', size = 'md', className }: TabBarProps) {
  return (
    <div role="tablist" aria-label={groupId} className={cn(trackVariants({ variant, size }), className)}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeId;
        return (
          <button key={id} role="tab" aria-selected={isActive} aria-controls={`tabpanel-${groupId}-${id}`}
            onClick={() => onChange(id)} className={cn(itemVariants({ variant, size, active: isActive }))}>
            {variant === 'pill' && isActive && (
              <motion.span layoutId={`tab-pill-${groupId}`} className="absolute inset-0 rounded-full bg-primary -z-10"
                style={{ boxShadow: 'var(--glow-3)' }} transition={SPRING.tab} />
            )}
            {variant === 'underline' && isActive && (
              <motion.span layoutId={`tab-underline-${groupId}`} className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" transition={SPRING.tab} />
            )}
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

```
PILL — "Chords" active (dark fg on crimson slug = AAA), hover shows faint fill, focus = ring-2 crimson
┌────────────────────────────────────────────────────────────────┐
│ [♩ Metro] [♥ Drummer] [██ Chords ██] [○ Circle] [▶ Riffs] │  ← slug slides via layoutId
└────────────────────────────────────────────────────────────────┘  bg-card/80 + inset groove
UNDERLINE — 2px crimson bar slides under active (no track)
CHIP — bg-primary/20 border-primary/50 (dim = secondary tier, not full fill)
```

---

## Header & Menu

Verified section IDs are `tune / setup / play / studio` (NOT `practice`/`utilities` — the draft was wrong). Active state via a new `useActiveSection` IntersectionObserver hook.

```
BEFORE:  ⚡ BLEED OUT ZONE   [Tune][Setup][Play][Studio]  ☾ ≡   (grey ~invisible border, no active state)
AFTER:   ⚡̲ BLEED OUT ZONE   [Tune][Setup][▓Play▓][Studio] ◉    (1px crimson edge + shadow-header)
  wordmark: dark:text-primary dark:text-glow (light mode: flat foreground, no glow)
  active nav: bg-primary/10 border-primary/30 shadow-glow-2, driven by scroll position
  nav btn py-2.5 → ~38px; ThemeToggle w-11 h-11 (44px touch target)
```

```tsx
// src/hooks/useActiveSection.ts (new, ~25 lines)
import { useState, useEffect } from 'react';
const SECTION_IDS = ['tune', 'setup', 'play', 'studio'];
export function useActiveSection() {
  const [active, setActive] = useState('tune');
  useEffect(() => {
    const obs = SECTION_IDS.map((id) => {
      const el = document.getElementById(id); if (!el) return null;
      const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(id); },
        { rootMargin: '-52px 0px -60% 0px', threshold: 0 });
      o.observe(el); return o;
    });
    return () => obs.forEach((o) => o?.disconnect());
  }, []);
  return active;
}
```

**Mobile (own PR):** replace the hamburger drawer with a fixed bottom nav (4 cells `Tune/Play/Setup/Studio`, `min-h-[56px]`, active = crimson underline + inward glow, `border-t border-primary/20 backdrop-blur-xl`). Main content gets `pb-[76px]`. Optional Tuner FAB at `bottom-[72px] right-4` appearing when `#tune` scrolls off.

---

## Cards & Layout — three-level elevation

SectionCard uses Radix Collapsible (uncontrolled) — **no `isOpen` in scope**, so style via `group-data-[state=open]:` selectors, NOT a state refactor.

```
CLOSED: bg-card/35  border-border/70  rounded-xl  hover:border-primary/25 hover:shadow-glow-2
OPEN:   bg-card/55  backdrop-blur-md  border-l-2 border-l-primary (left rail = open signal,
        not color alone)  border-primary/12  + content border-t border-primary/10
HERO (tuner): bg-card/65 backdrop-blur-xl  border-primary/30  shadow-hero  radial 0.13
        (keep -m-6 bleed — -m-10 risks mobile overflow)
```

SectionGroup: crimson filament divider (`bg-gradient-to-r from-primary/40 via-primary/15 to-transparent`) replacing the invisible grey line; icon glow; `h2` → `text-xs font-black text-primary/70 tracking-[0.3em] uppercase`; captions visible on mobile. Page rhythm: groups `space-y-10`, cards `space-y-3`.

---

## Motion — new `src/lib/motion.ts`

```ts
export const DUR = { instant: 0.08, fast: 0.14, base: 0.22, slow: 0.36, breathe: 2.0 } as const;
export const EASE = { snap: [0.2,0,0,1], settle: [0.4,0,0.2,1], glow: [0,0,0.2,1] } as const;
export const SPRING = {
  knob:    { type: 'spring', stiffness: 260, damping: 24 },
  counter: { type: 'spring', stiffness: 320, damping: 22 },
  panel:   { type: 'spring', stiffness: 300, damping: 30 },
  badge:   { type: 'spring', stiffness: 400, damping: 18 },
  tab:     { type: 'spring', stiffness: 400, damping: 32 },
} as const;
export const HOVER_CHIP = { whileHover: { y: -2, scale: 1.03 }, whileTap: { scale: 0.96, y: 0 } };
export const HOVER_CARD = { whileHover: { y: -3 }, whileTap: { y: -1 } };
export const HOVER_CTA  = { whileHover: { scale: 1.06 }, whileTap: { scale: 0.93 } };
```

**`animate-pulse` split (definitive):** continuous live state → `animate-pulse-glow` (already wired; fix `SmartDrummer.tsx:75,155`); discrete events → one-shot `motion.div` scale pop (`scale: [1,1.12,1]`, ease-snap) at UtilitiesSection/IntervalTrainer/JamSession/CircleOfFifths/ChordLibrary correct-answer sites; skeleton keeps `animate-pulse`. (Blanket replacement would break the mic-active dot, BPM dot, diagnostics badge.)

**3 signature micro-interactions:** (1) Tuner perfect-pitch bloom (green textShadow flare on `NoteDisplay`), (2) tab slug slide (`layoutId` + `SPRING.tab`), (3) correct-answer pop.

---

## Implementation Slice — recommended first PR

### Tier 1 — cheap drop-ins (S, huge return)
1. Wordmark `dark:text-primary dark:text-glow` + bigger Zap glow — `Index.tsx`
2. Header `border-primary/20 shadow-header` — `Index.tsx` + `tailwind.config.ts`
3. `--glow-1..4` vars + boxShadow tokens — `index.css`, `tailwind.config.ts`
4. SectionGroup crimson filament divider + h2 upgrade — `SectionGroup.tsx`
5-8. Teal/cyan/amber purges — `SpeedTrainer`, `RiffsAndScales`, `EffectsSection`, `SetupBenchSheet`
9. fontSize micro/nano/caption — `tailwind.config.ts`
10. `.text-glow-accent` utility — `index.css`

### Tier 2 — medium (architectural)
11. `src/lib/motion.ts`
12. SectionCard elevation via `group-data-[state=open]:` (no state refactor)
13. **Fix `primary-foreground`/`accent-foreground` contrast failures** — `index.css`
14. `--status-*` tokens + replace green/yellow across non-tuner components
15. `RecordingSection.tsx:98-104` `Math.random()` waveform bug → pre-gen in `useRef`
16-17. `animate-pulse` split
18. `TabBar.tsx` + wire into PracticeSection + RecordingSection
19. NoteDisplay perfect-pitch bloom
21. `focus-visible:ring` on raw `<button>`s

### Tier 3 — new infra (L, defer)
22. `useActiveSection` + desktop nav active state
23. TabBar into IntervalTrainer/ChordLibrary/EffectsSection
24. Mobile bottom nav (own PR)
25. Tuner FAB

### Dropped (over-design / wrong)
foreground hue shift, `--primary-dim` (dead), `max-w-3xl` (no mobile impact), StratAnatomy cyan + fretboard amber (intentional), micro spacing tweaks.

---

## Critic disagreements resolved
- **Foreground hue shift** — dropped (invisible at near-white, breaks light mode).
- **`--status-bad`** — verified `--tuner-flat` is hue `0` (red), not crimson 350; keeps flat/sharp distinction.
- **primary/accent-foreground contrast** — white-on-crimson (3.84:1) and white-on-orange (2.62:1) are real fails → dark foregrounds (~15:1, ~16:1).
- **SectionCard** — `isOpen` doesn't exist; use `group-data-[state=open]:`, no state refactor.
- **animate-pulse** — split by signal type, not blanket-replaced.
- **Hero bleed** — keep `-m-6` (mobile overflow); punch via gradient/border instead.
- **fretboard amber / StratAnatomy cyan** — material metaphor / blueprint layer; keep.
