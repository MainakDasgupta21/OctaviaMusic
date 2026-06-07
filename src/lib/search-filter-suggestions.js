// =============================================================================
// Smart suggestions for the Add-filter command palette.
//
// suggestFromText(text) inspects the user's raw search text for cues that
// imply a structured filter — moods like "live" / "acoustic", explicit years
// ("1995"), decades ("the 90s", "2020s"), and duration shorthands ("short",
// "quick", "under 3"). For each cue we emit a one-tap suggestion whose
// `apply(filters)` rolls the matching dimension forward without disturbing
// any other.
//
// Pure module, no React, no hooks — trivial to unit-test in isolation.
// =============================================================================

import { CalendarRange, Clock, Tag } from 'lucide-react';
import { toggleMood, VALID_MOODS } from '@/lib/search-filter-state';

const NOW = new Date().getFullYear();
const MIN_YEAR = 1900;

const moodsList = Array.from(VALID_MOODS);

const yearInRange = (y) => Number.isFinite(y) && y >= MIN_YEAR && y <= NOW + 1;

// Decade tokens accept two- or four-digit years with a trailing "s":
//   "90s"   -> 1990 - 1999
//   "2020s" -> 2020 - 2029
//   "1970s" -> 1970 - 1979
// Two-digit decades coerce into the closest century (60 -> 1960, 20 -> 2020).
const expandDecade = (raw) => {
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  let start;
  if (raw.length === 2) {
    const guess20 = 2000 + num;
    const guess19 = 1900 + num;
    start = Math.abs(NOW - guess20) <= Math.abs(NOW - guess19) ? guess20 : guess19;
    if (start > NOW) start -= 100;
  } else if (raw.length === 4) {
    start = Math.floor(num / 10) * 10;
  } else {
    return null;
  }
  const end = start + 9;
  // Only the start anchors validity. The end can extend past the current
  // year (a "2020s" filter is intentional even before the decade closes).
  if (!yearInRange(start)) return null;
  return { start, end };
};

const parseShortMinutes = (text) => {
  const m = text.match(/(?:under|<|less than)\s*(\d{1,2})\s*(?:min|mins|minutes)?/i);
  if (!m) return null;
  const minutes = Number(m[1]);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 30) return null;
  return minutes * 60;
};

export const suggestFromText = (text) => {
  const raw = String(text || '');
  if (!raw.trim()) return [];

  const t = raw.toLowerCase();
  const out = [];
  const seen = new Set();
  const push = (entry) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    out.push(entry);
  };

  for (const mood of moodsList) {
    const re = new RegExp(`\\b${mood}\\b`);
    if (re.test(t)) {
      push({
        id: `mood-${mood}`,
        label: `Mood: ${mood}`,
        icon: Tag,
        apply: (f) => toggleMood(f, mood),
      });
    }
  }

  const decadeMatch = t.match(/\b(\d{4}|\d{2})s\b/);
  if (decadeMatch) {
    const range = expandDecade(decadeMatch[1]);
    if (range) {
      push({
        id: `decade-${range.start}`,
        label: `${range.start}s`,
        icon: CalendarRange,
        apply: (f) => ({ ...f, yearFrom: range.start, yearTo: range.end }),
      });
    }
  }

  // Single-year cue runs after decade so "2020" inside "2020s" doesn't
  // double-fire. We also drop matches that fall inside any decade we
  // already emitted.
  const yearMatches = t.match(/\b(19|20)\d{2}\b/g) || [];
  for (const m of yearMatches) {
    const y = Number(m);
    if (!yearInRange(y)) continue;
    if (decadeMatch) {
      const declRange = expandDecade(decadeMatch[1]);
      if (declRange && y >= declRange.start && y <= declRange.end) continue;
    }
    push({
      id: `year-${y}`,
      label: `Year: ${y}`,
      icon: CalendarRange,
      apply: (f) => ({ ...f, yearFrom: y, yearTo: y }),
    });
  }

  const explicitCap = parseShortMinutes(t);
  if (explicitCap != null) {
    push({
      id: `duration-${explicitCap}`,
      label: `Under ${Math.round(explicitCap / 60)} min`,
      icon: Clock,
      apply: (f) => ({ ...f, durationMax: explicitCap }),
    });
  } else if (/\b(short|quick)\b/.test(t)) {
    push({
      id: 'duration-180',
      label: 'Under 3 min',
      icon: Clock,
      apply: (f) => ({ ...f, durationMax: 180 }),
    });
  }

  return out;
};

export default suggestFromText;
