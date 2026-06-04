import { useMemo } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  setDurationMax,
  setSort,
  setYearRange,
  stripDurationFilters,
  stripSortFilter,
  stripYearFilters,
  toggleKeyword,
  yearBounds,
  durationMax as readDurationMax,
} from '@/lib/search-operators';
import { cn } from '@/lib/utils';

const NOW = new Date().getFullYear();
const MIN_YEAR = 1950;
const MAX_DURATION = 600; // 10 minutes

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'popularity', label: 'Popularity' },
  { id: 'newest', label: 'Newest' },
  { id: 'shortest', label: 'Shortest' },
];

const INTENT_TOGGLES = [
  { id: 'live', label: 'Live' },
  { id: 'acoustic', label: 'Acoustic' },
  { id: 'remix', label: 'Remix' },
  { id: 'instrumental', label: 'Instrumental' },
];

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Any';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
  }
  return `${seconds}s`;
};

const computeActiveCount = ({ from, to, durationCap, sort, blockExplicit, intentTokens }) => {
  let count = 0;
  if (from != null && from > MIN_YEAR) count += 1;
  if (to != null && to < NOW) count += 1;
  if (durationCap != null && durationCap < MAX_DURATION) count += 1;
  if (sort && sort !== 'relevance') count += 1;
  if (blockExplicit) count += 1;
  if (intentTokens && intentTokens.length > 0) count += intentTokens.length;
  return count;
};

export const SearchFilters = ({ query, parsed, onChange }) => {
  const yearFilters = parsed?.filters?.year || null;
  const durationFilters = parsed?.filters?.duration || null;
  const sort = parsed?.filters?.sort || 'relevance';
  const blockExplicit = Boolean(parsed?.intent?.blockExplicit);
  const intentTokens = parsed?.intent?.intentTokens || [];

  const { from, to } = useMemo(() => yearBounds(yearFilters), [yearFilters]);
  const durationCap = useMemo(() => readDurationMax(durationFilters), [durationFilters]);

  const fromYear = Math.max(MIN_YEAR, Math.min(NOW, from ?? MIN_YEAR));
  const toYear = Math.max(MIN_YEAR, Math.min(NOW, to ?? NOW));
  const durationValue = Math.max(0, Math.min(MAX_DURATION, durationCap ?? MAX_DURATION));

  const activeCount = computeActiveCount({
    from,
    to,
    durationCap,
    sort,
    blockExplicit,
    intentTokens,
  });

  const handleYear = (range) => {
    if (!Array.isArray(range) || range.length !== 2) return;
    const [a, b] = range;
    const writeFrom = a > MIN_YEAR ? a : null;
    const writeTo = b < NOW ? b : null;
    onChange?.(setYearRange(query, writeFrom, writeTo));
  };

  const handleDuration = (range) => {
    if (!Array.isArray(range) || range.length === 0) return;
    const value = range[range.length - 1];
    onChange?.(setDurationMax(query, value < MAX_DURATION ? value : null));
  };

  const handleSort = (next) => {
    onChange?.(setSort(query, next));
  };

  const handleToggleIntent = (token, on) => {
    onChange?.(toggleKeyword(query, token, on));
  };

  const handleToggleClean = (on) => {
    onChange?.(toggleKeyword(query, 'clean', on));
  };

  const reset = () => {
    let next = stripYearFilters(query);
    next = stripDurationFilters(next);
    next = stripSortFilter(next);
    next = toggleKeyword(next, 'clean', false);
    for (const t of INTENT_TOGGLES) next = toggleKeyword(next, t.id, false);
    onChange?.(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-sharp font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-ring',
            activeCount > 0
              ? 'bg-track/15 text-accent border border-track/40'
              : 'border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04]',
          )}
          aria-label="Open advanced filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-track text-track-fg text-[10px]">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-[340px] p-0 rounded-sharp border border-white/[0.10] bg-surface-3/95 backdrop-blur-2xl shadow-elev-5"
      >
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
            Refine search
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-1.5 py-0.5"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
                Release year
              </p>
              <p className="font-editorial italic text-[12px] text-ink-3">
                {fromYear} – {toYear}
              </p>
            </div>
            <Slider
              min={MIN_YEAR}
              max={NOW}
              step={1}
              value={[fromYear, toYear]}
              onValueChange={handleYear}
              aria-label="Release year range"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
                Max duration
              </p>
              <p className="font-editorial italic text-[12px] text-ink-3">
                {formatDuration(durationValue >= MAX_DURATION ? null : durationValue)}
              </p>
            </div>
            <Slider
              min={30}
              max={MAX_DURATION}
              step={30}
              value={[durationValue]}
              onValueChange={handleDuration}
              aria-label="Max song duration in seconds"
            />
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4 mb-2">
              Sort by
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSort(opt.id)}
                    className={cn(
                      'rounded-sharp px-2.5 py-1.5 text-[12px] font-mono uppercase tracking-[0.14em] focus-ring transition-colors',
                      active
                        ? 'bg-track/15 text-accent border border-track/40'
                        : 'border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04]',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4 mb-2">
              Version
            </p>
            <div className="flex flex-wrap gap-1.5">
              {INTENT_TOGGLES.map((t) => {
                const active = intentTokens.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleIntent(t.id, !active)}
                    className={cn(
                      'rounded-sharp px-2.5 py-1 text-[11.5px] font-mono uppercase tracking-[0.14em] focus-ring transition-colors',
                      active
                        ? 'bg-track/15 text-accent border border-track/40'
                        : 'border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04]',
                    )}
                    aria-pressed={active}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-ink">Clean only</p>
              <p className="font-editorial text-[11.5px] text-ink-4 mt-0.5">
                Filter out explicit results
              </p>
            </div>
            <Switch
              checked={blockExplicit}
              onCheckedChange={handleToggleClean}
              aria-label="Toggle clean-only filter"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchFilters;
