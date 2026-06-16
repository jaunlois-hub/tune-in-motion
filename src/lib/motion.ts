/**
 * Motion system for Bleed Out Zone — shared durations, easing curves, springs,
 * and hover/press recipes so motion reads as one intentional language, not
 * scattered transition-all defaults.
 */

type Cubic = [number, number, number, number];

export const DUR = {
  instant: 0.08,
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
  breathe: 2.0,
} as const;

export const EASE = {
  snap: [0.2, 0, 0, 1] as Cubic,
  settle: [0.4, 0, 0.2, 1] as Cubic,
  glow: [0, 0, 0.2, 1] as Cubic,
};

export const SPRING = {
  knob: { type: 'spring' as const, stiffness: 260, damping: 24 },
  counter: { type: 'spring' as const, stiffness: 320, damping: 22 },
  panel: { type: 'spring' as const, stiffness: 300, damping: 30 },
  badge: { type: 'spring' as const, stiffness: 400, damping: 18 },
  tab: { type: 'spring' as const, stiffness: 400, damping: 32 },
};

// Hover/press recipes — spread onto motion.* elements
export const HOVER_CHIP = {
  whileHover: { y: -2, scale: 1.03 },
  whileTap: { scale: 0.96, y: 0 },
};
export const HOVER_CARD = {
  whileHover: { y: -3 },
  whileTap: { y: -1 },
};
export const HOVER_CTA = {
  whileHover: { scale: 1.06 },
  whileTap: { scale: 0.93 },
};
