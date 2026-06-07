// =============================================================================
// Shared preset registry. Both the idle-state QuickPresets grid AND the
// Add-filter command palette read from this list, so the vocabulary of
// "Quick filters" stays identical across the page.
//
// Each entry is a pure (currentFilters) => nextFilters transform. Composing
// through the structured state means: clicking twice doesn't double-add,
// removing the chip restores the previous state cleanly, and combinations
// stack ("This year" + "Clean only" works).
//
// `isActive(filters)` lets consumers render an "already on" affordance
// (checkmark, accent tint) without re-deriving the predicate at each site.
// =============================================================================

import {
  CalendarRange,
  Clock,
  Mic,
  Music2,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { toggleMood } from '@/lib/search-filter-state';

const NOW = new Date().getFullYear();

const moodActive = (f, tag) => Array.isArray(f?.mood) && f.mood.includes(tag);

export const PRESETS = [
  {
    id: 'this-year',
    label: 'This year',
    hint: `Released in ${NOW}`,
    icon: CalendarRange,
    apply: (f) => ({ ...f, yearFrom: NOW, yearTo: NOW }),
    isActive: (f) => f?.yearFrom === NOW && f?.yearTo === NOW,
  },
  {
    id: 'last-decade',
    label: 'The 2010s',
    hint: 'Decade in review',
    icon: CalendarRange,
    apply: (f) => ({ ...f, yearFrom: 2010, yearTo: 2019 }),
    isActive: (f) => f?.yearFrom === 2010 && f?.yearTo === 2019,
  },
  {
    id: 'nineties',
    label: 'The 90s',
    hint: 'Decade in review',
    icon: CalendarRange,
    apply: (f) => ({ ...f, yearFrom: 1990, yearTo: 1999 }),
    isActive: (f) => f?.yearFrom === 1990 && f?.yearTo === 1999,
  },
  {
    id: 'under-three',
    label: 'Under 3 min',
    hint: 'Quick listens',
    icon: Clock,
    apply: (f) => ({ ...f, durationMax: 180 }),
    isActive: (f) => f?.durationMax === 180,
  },
  {
    id: 'acoustic',
    label: 'Acoustic',
    hint: 'Unplugged feel',
    icon: Music2,
    apply: (f) => toggleMood(f, 'acoustic'),
    isActive: (f) => moodActive(f, 'acoustic'),
  },
  {
    id: 'live',
    label: 'Live versions',
    hint: 'Concert energy',
    icon: Mic,
    apply: (f) => toggleMood(f, 'live'),
    isActive: (f) => moodActive(f, 'live'),
  },
  {
    id: 'remix',
    label: 'Remixes',
    hint: 'Reworked takes',
    icon: Waves,
    apply: (f) => toggleMood(f, 'remix'),
    isActive: (f) => moodActive(f, 'remix'),
  },
  {
    id: 'clean',
    label: 'Clean only',
    hint: 'Hide explicit',
    icon: ShieldCheck,
    apply: (f) => ({ ...f, clean: true }),
    isActive: (f) => f?.clean === true,
  },
];

export default PRESETS;
