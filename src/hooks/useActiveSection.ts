import { useState, useEffect } from 'react';

// The four scroll sections rendered in Index.tsx (verified IDs).
const SECTION_IDS = ['tune', 'setup', 'play', 'studio'];

function hashSection(): string | null {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.replace('#', '');
  return SECTION_IDS.includes(id) ? id : null;
}

/**
 * Tracks which page section is currently in the top viewport zone (for the nav's
 * active/current state) AND keeps it in sync with the URL hash so sections are
 * bookmarkable and Back/Forward-friendly. On mount it scrolls to the section named
 * in the hash (deep link); while scrolling it reflects the active section into the
 * hash via replaceState (no history spam).
 */
export function useActiveSection(): string {
  const [active, setActive] = useState(() => hashSection() ?? SECTION_IDS[0]);

  // Deep-link: scroll to the hash target on first mount.
  useEffect(() => {
    const id = hashSection();
    if (!id) return;
    const el = document.getElementById(id);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }, []);

  // Track the in-view section and mirror it into the URL hash.
  useEffect(() => {
    let current = hashSection() ?? '';
    const observers = SECTION_IDS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          setActive(id);
          if (current !== id) {
            current = id;
            window.history.replaceState(null, '', `#${id}`);
          }
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
