// =============================================================================
// LRC parser. The transport layer for fetching lyrics now lives in
// `src/lib/api.js` so React Query can manage caching, retries, and 404 vs
// provider-error semantics. This module stays focused on parsing/utility.
// =============================================================================

export const parseLRC = (raw) => {
  if (!raw || typeof raw !== 'string') return [];
  const lines = raw.split(/\r?\n/);
  const out = [];
  const tagRe = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
  for (const line of lines) {
    if (!line.trim()) continue;
    const matches = [...line.matchAll(tagRe)];
    if (!matches.length) continue;
    const text = line.replace(tagRe, '').trim();
    for (const m of matches) {
      const min = parseInt(m[1], 10);
      const sec = parseFloat(m[2]);
      out.push({ time: min * 60 + sec, text });
    }
  }
  out.sort((a, b) => a.time - b.time);
  return out;
};

// Find the active synced line for a given playback time.
export const activeLineIndex = (lines, time) => {
  if (!lines?.length) return -1;
  let lo = 0, hi = lines.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) { idx = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return idx;
};
