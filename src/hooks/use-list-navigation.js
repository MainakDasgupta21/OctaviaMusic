import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

// Returns { selectedIndex, setSelectedIndex, props } for ARIA.
// Bind the resulting key handlers to a container. j/k or arrow keys move.
// Enter triggers `onSelect`. Q adds to queue. L likes. Esc clears selection.
export const useListNavigation = ({ items = [], onSelect, onQueue, onLike } = {}) => {
  const { settings } = useSettings();
  const enabled = settings.vimNavigation !== false; // default on
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const move = useCallback(
    (delta) => setSelectedIndex((i) => {
      if (!items.length) return -1;
      const next = i + delta;
      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    }),
    [items.length],
  );

  // Keep selection index valid when list size changes.
  useEffect(() => {
    setSelectedIndex((idx) => {
      if (!items.length) return -1;
      if (idx < 0) return idx;
      return Math.min(idx, items.length - 1);
    });
  }, [items.length]);

  useEffect(() => {
    if (!enabled || !items.length) return;
    const onKey = (e) => {
      const active = document.activeElement;
      if (active && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) return;
      if (active?.isContentEditable) return;
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          if (selectedIndex >= 0 || e.key === 'j') {
            e.preventDefault();
            move(1);
          }
          break;
        case 'k':
        case 'ArrowUp':
          if (selectedIndex >= 0 || e.key === 'k') {
            e.preventDefault();
            move(-1);
          }
          break;
        case 'g':
          e.preventDefault();
          setSelectedIndex(0);
          break;
        case 'G':
          e.preventDefault();
          setSelectedIndex(items.length - 1);
          break;
        case 'Enter':
          if (selectedIndex >= 0) {
            e.preventDefault();
            onSelect?.(items[selectedIndex], selectedIndex);
          }
          break;
        case 'q':
        case 'Q':
          if (selectedIndex >= 0) {
            e.preventDefault();
            onQueue?.(items[selectedIndex], selectedIndex);
          }
          break;
        case 'l':
        case 'L':
          if (selectedIndex >= 0) {
            e.preventDefault();
            onLike?.(items[selectedIndex], selectedIndex);
          }
          break;
        case 'Escape':
          setSelectedIndex(-1);
          break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, items, selectedIndex, move, onSelect, onQueue, onLike]);

  // Expose whether list navigation currently owns selection so global
  // keyboard shortcuts can gracefully defer (e.g. `L` like key).
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;
    if (selectedIndex >= 0) {
      document.body.dataset.listNavActive = 'true';
    } else {
      delete document.body.dataset.listNavActive;
    }
    return () => {
      delete document.body.dataset.listNavActive;
    };
  }, [enabled, selectedIndex]);

  return { selectedIndex, setSelectedIndex };
};
