import { useEffect } from 'react';
import { toast } from 'sonner';

const KEY = 'harmony.first-run-hint.v1';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

export const useFirstRunHints = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    const id = window.setTimeout(() => {
      toast(`Press ${isMac ? '⌘K' : 'Ctrl+K'} to search anything`, {
        description: 'Space plays · ← → seeks · L favorites the current track',
        duration: 6000,
      });
      try {
        window.localStorage.setItem(KEY, '1');
      } catch {
        /* noop */
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, []);
};
