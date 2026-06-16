import { useState, useEffect } from 'react';

// The four scroll sections rendered in Index.tsx (verified IDs).
const SECTION_IDS = ['tune', 'setup', 'play', 'studio'];

/**
 * Tracks which page section is currently in the top viewport zone, so the header
 * nav can show an active/current state. Observes the section elements by id; the
 * rootMargin biases toward the section entering just under the sticky header.
 */
export function useActiveSection(): string {
  const [active, setActive] = useState(SECTION_IDS[0]);

  useEffect(() => {
    const observers = SECTION_IDS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: '-52px 0px -60% 0px', threshold: 0 },
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return active;
}
