import { useEffect } from 'react';
import { setRootAccent, resetRootAccent } from '@/hooks/use-color-extraction';
import { shuffleArray } from '@/lib/shuffle';

// Curated palette of harmonious accents tuned to the Octavia aesthetic.
// Each entry already satisfies the saturation/lightness clamps in
// setRootAccent (s 45-85, l 45-65), so legibility guards stay intact and
// the auto-picked --track-accent-foreground keeps WCAG contrast.
const PALETTE = [
  { h: 18, s: 78, l: 56 },
  { h: 345, s: 72, l: 60 },
  { h: 42, s: 78, l: 58 },
  { h: 135, s: 55, l: 50 },
  { h: 170, s: 60, l: 50 },
  { h: 200, s: 70, l: 56 },
  { h: 262, s: 64, l: 64 },
  { h: 295, s: 55, l: 58 },
];

export const useAccentRotator = ({ intervalMs = 15000 } = {}) => {
  useEffect(() => {
    const order = shuffleArray(PALETTE);
    if (order.length === 0) return undefined;
    let i = 0;
    const apply = () => {
      const c = order[i % order.length];
      setRootAccent(c.h, c.s, c.l);
      i += 1;
    };

    apply();

    let timer = window.setInterval(apply, intervalMs);

    const onVisibility = () => {
      if (document.hidden) {
        if (timer) {
          window.clearInterval(timer);
          timer = 0;
        }
      } else if (!timer) {
        apply();
        timer = window.setInterval(apply, intervalMs);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      resetRootAccent();
    };
  }, [intervalMs]);
};

export default useAccentRotator;
