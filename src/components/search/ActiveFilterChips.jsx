import { X } from 'lucide-react';
import {
  setSort,
  setYearRange,
  stripDurationFilters,
  stripYearFilters,
  toggleKeyword,
  yearBounds,
  durationMax as readDurationMax,
} from '@/lib/search-operators';
import { cn } from '@/lib/utils';

const NOW = new Date().getFullYear();
const MIN_YEAR = 1950;
const MAX_DURATION = 600;

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
  }
  return `${seconds}s`;
};

const Chip = ({ label, onRemove }) => (
  <span
    className={cn(
      // Active filters get the holographic edge so the user feels the chip
      // is "live" and clearly removable.
      'holo-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sharp text-[11.5px] font-mono uppercase tracking-[0.14em]',
      'border border-track/40 bg-track/[0.10] text-accent',
    )}
  >
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="rounded-sharp p-0.5 hover:bg-white/[0.05] focus-ring text-accent/80 hover:text-accent"
      aria-label={`Remove ${label} filter`}
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

export const ActiveFilterChips = ({ query, parsed, onChange }) => {
  const yearFilters = parsed?.filters?.year || null;
  const durationFilters = parsed?.filters?.duration || null;
  const sort = parsed?.filters?.sort || 'relevance';
  const blockExplicit = Boolean(parsed?.intent?.blockExplicit);
  const intentTokens = parsed?.intent?.intentTokens || [];

  const { from, to } = yearBounds(yearFilters);
  const durationCap = readDurationMax(durationFilters);

  const chips = [];

  if (from != null && from > MIN_YEAR && to != null && to < NOW) {
    chips.push({
      key: 'year-range',
      label: `${from}–${to}`,
      remove: () => onChange?.(stripYearFilters(query)),
    });
  } else if (from != null && from > MIN_YEAR) {
    chips.push({
      key: 'year-from',
      label: `From ${from}`,
      remove: () => onChange?.(setYearRange(stripYearFilters(query), null, to ?? null)),
    });
  } else if (to != null && to < NOW) {
    chips.push({
      key: 'year-to',
      label: `Until ${to}`,
      remove: () => onChange?.(setYearRange(stripYearFilters(query), from ?? null, null)),
    });
  }

  if (Number.isFinite(durationCap) && durationCap < MAX_DURATION) {
    chips.push({
      key: 'duration',
      label: `≤ ${formatDuration(durationCap)}`,
      remove: () => onChange?.(stripDurationFilters(query)),
    });
  }

  if (sort && sort !== 'relevance') {
    chips.push({
      key: 'sort',
      label: `Sort: ${sort}`,
      remove: () => onChange?.(setSort(query, 'relevance')),
    });
  }

  if (blockExplicit) {
    chips.push({
      key: 'clean',
      label: 'Clean',
      remove: () => onChange?.(toggleKeyword(query, 'clean', false)),
    });
  }

  for (const token of intentTokens) {
    if (token === 'feat') continue; // implicit, no chip
    chips.push({
      key: `intent-${token}`,
      label: token.charAt(0).toUpperCase() + token.slice(1),
      remove: () => onChange?.(toggleKeyword(query, token, false)),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4 mr-1">
        Active filters
      </span>
      {chips.map((c) => (
        <Chip key={c.key} label={c.label} onRemove={c.remove} />
      ))}
      <button
        type="button"
        onClick={() => onChange?.('')}
        className="ml-2 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-1.5 py-0.5"
      >
        Clear all
      </button>
    </div>
  );
};

export default ActiveFilterChips;
