import { useCallback } from 'react';

// Registry of lazy chunk loaders, keyed by route path. Populated by App.jsx.
const registry = new Map();

export const registerPrefetch = (path, loader) => {
  registry.set(path, loader);
};

const seen = new Set();

export const useRoutePrefetch = () => {
  return useCallback((path) => {
    if (!path || seen.has(path)) return;
    const loader = registry.get(path);
    if (!loader) return;
    seen.add(path);
    try {
      // Fire and forget — even on failure we'll retry on actual navigation.
      Promise.resolve(loader()).catch(() => seen.delete(path));
    } catch {
      seen.delete(path);
    }
  }, []);
};

// Convenience prop spreader for NavLink-like elements.
export const usePrefetchProps = (path) => {
  const prefetch = useRoutePrefetch();
  const handler = useCallback(() => prefetch(path), [prefetch, path]);
  return {
    onMouseEnter: handler,
    onFocus: handler,
    onTouchStart: handler,
  };
};
