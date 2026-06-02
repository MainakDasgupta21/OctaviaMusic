// =============================================================================
// LRC parser + LRCLib client. Returns an array of { time, text } lines.
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

const cache = new Map();

// Fetch from LRCLib (public, no auth required). Returns either:
//   { synced: [{time,text}], plain: 'multi-line text' }
// or null if nothing found / on error.
export const fetchLyrics = async ({ title, artist, durationSec }) => {
  if (!title || !artist) return null;
  const key = `${title}::${artist}`.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
    ...(durationSec ? { duration: String(Math.round(durationSec)) } : {}),
  });

  try {
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'Harmony Hub (https://harmonyhub.local)' },
    });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const data = await res.json();
    const result = {
      synced: parseLRC(data.syncedLyrics || ''),
      plain: data.plainLyrics || '',
    };
    if (!result.synced.length && !result.plain) {
      cache.set(key, null);
      return null;
    }
    cache.set(key, result);
    return result;
  } catch (e) {
    console.warn('LRC fetch failed', e);
    cache.set(key, null);
    return null;
  }
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
