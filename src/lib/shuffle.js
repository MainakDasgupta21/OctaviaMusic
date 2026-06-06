// Pure Fisher-Yates shuffle. Returns a new array — does not mutate input.
export const shuffleArray = (arr) => {
  if (!Array.isArray(arr) || arr.length <= 1) return Array.isArray(arr) ? [...arr] : [];
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Share helper — uses Web Share API when available, falls back to clipboard.
// Returns 'shared' | 'copied' | 'error' | 'cancelled' so callers can pick the
// right toast voice.
export const shareOrCopy = async ({ title, text, url } = {}) => {
  const safeUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url: safeUrl });
      return 'shared';
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(safeUrl);
      return 'copied';
    }
    return 'error';
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
    return 'error';
  }
};
