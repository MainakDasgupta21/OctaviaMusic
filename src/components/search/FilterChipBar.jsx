import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Album,
  ArrowUpDown,
  Ban,
  CalendarRange,
  ChevronDown,
  Clock,
  Disc,
  ListMusic,
  Music,
  Plus,
  ShieldCheck,
  Tag,
  User,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlbumEditor,
  ArtistEditor,
  CleanEditor,
  DurationEditor,
  ExcludeEditor,
  MoodEditor,
  SortEditor,
  YearEditor,
  filterIsSet,
  formatFilterValue,
  removeFilter,
} from '@/components/search/FilterEditors';
import {
  EMPTY_FILTERS,
  hasAnyFilter,
} from '@/lib/search-filter-state';
import { cn } from '@/lib/utils';

// =============================================================================
// FilterChipBar — the single, canonical filter surface for /search.
//
// Type tabs live on their own row above the chips because Type is structurally
// different (it scopes the *result kind*, not a property of a result). Every
// other dimension is rendered as a clickable chip when set; clicking it opens
// its editor popover. A trailing `+ Add filter` button opens a menu of
// dimensions; selecting one immediately opens that dimension's editor.
//
// The whole component reads from a single structured `filters` object and
// writes back through `onFiltersChange(next)` — no operator-string surgery
// happens here.
// =============================================================================

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'song', label: 'Songs', icon: Music },
  { id: 'artist', label: 'Artists', icon: User },
  { id: 'album', label: 'Albums', icon: Disc },
  { id: 'playlist', label: 'Playlists', icon: ListMusic },
];

// Single source of truth for every non-type dimension. Each row carries its
// editor component so the popover can render whichever one is needed.
const DIMENSIONS = [
  {
    id: 'sort',
    label: 'Sort',
    eyebrow: 'Sort',
    icon: ArrowUpDown,
    Editor: SortEditor,
  },
  {
    id: 'year',
    label: 'Year',
    eyebrow: 'Year',
    icon: CalendarRange,
    Editor: YearEditor,
  },
  {
    id: 'duration',
    label: 'Length',
    eyebrow: 'Length',
    icon: Clock,
    Editor: DurationEditor,
  },
  {
    id: 'artist',
    label: 'Artist',
    eyebrow: 'Artist',
    icon: User,
    Editor: ArtistEditor,
  },
  {
    id: 'album',
    label: 'Album',
    eyebrow: 'Album',
    icon: Album,
    Editor: AlbumEditor,
  },
  {
    id: 'mood',
    label: 'Mood',
    eyebrow: 'Mood',
    icon: Tag,
    Editor: MoodEditor,
  },
  {
    id: 'clean',
    label: 'Clean only',
    eyebrow: 'Mode',
    icon: ShieldCheck,
    Editor: CleanEditor,
  },
  {
    id: 'exclude',
    label: 'Exclude',
    eyebrow: 'Exclude',
    icon: Ban,
    Editor: ExcludeEditor,
  },
];

const DIMENSION_BY_ID = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d]));

// =============================================================================
// Individual chip — both editor trigger AND remove handle. The chip body is
// a popover trigger; the trailing `×` lives outside the trigger so a click
// there doesn't also open the popover.
// =============================================================================

const FilterChip = ({ dimension, filters, onFiltersChange }) => {
  const { id, eyebrow, icon: Icon, Editor } = dimension;
  const [open, setOpen] = useState(false);

  return (
    <motion.span
      layout
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -2, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0.2, 1] }}
      className={cn(
        'inline-flex items-center rounded-sharp',
        'border border-track/40 bg-track/[0.10] text-accent',
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 pl-2.5 pr-1 py-[5px] rounded-sharp text-[11.5px]',
              'hover:bg-track/[0.05] focus-ring transition-colors',
            )}
            aria-label={`Edit ${eyebrow} filter`}
          >
            {Icon ? <Icon className="w-3 h-3 opacity-80" /> : null}
            <span className="font-mono uppercase tracking-[0.14em] text-accent/70">
              {eyebrow}
            </span>
            <span className="font-editorial italic text-[12.5px] leading-none">
              {formatFilterValue(filters, id)}
            </span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70 ml-0.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="p-0 rounded-sharp border border-white/[0.10] bg-surface-3/95 backdrop-blur-2xl shadow-elev-5"
        >
          <Editor
            filters={filters}
            onChange={onFiltersChange}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => onFiltersChange(removeFilter(filters, id))}
        className="rounded-sharp p-1 mr-0.5 hover:bg-accent/[0.18] focus-ring text-accent/80 hover:text-accent transition-colors"
        aria-label={`Remove ${eyebrow} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  );
};

// =============================================================================
// + Add filter — single button. Picker is in-popover; selecting a dimension
// immediately swaps the popover content to that dimension's editor (no
// double-clicking required). On close, we reset for next time.
// =============================================================================

const AddFilterButton = ({ filters, onFiltersChange }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  const reset = useCallback(() => setActive(null), []);

  // Dimensions that ARE NOT already set float to the top of the picker so
  // the user adds new things first; already-set ones drop to a secondary
  // group ("Edit existing") so clicking them re-opens the editor.
  const { unsetDims, setDims } = useMemo(() => {
    const unset = [];
    const setList = [];
    for (const d of DIMENSIONS) {
      if (filterIsSet(filters, d.id)) setList.push(d);
      else unset.push(d);
    }
    return { unsetDims: unset, setDims: setList };
  }, [filters]);

  const ActiveEditor = active ? DIMENSION_BY_ID[active]?.Editor : null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add filter"
          className={cn(
            'group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sharp font-mono text-[10.5px] uppercase tracking-[0.16em]',
            'border border-dashed border-white/[0.18] text-ink-3',
            'hover:text-accent hover:border-accent/40 hover:bg-accent/[0.06]',
            'focus-ring whitespace-nowrap transition-colors',
          )}
        >
          <Plus className="w-3 h-3" />
          Add filter
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="p-0 rounded-sharp border border-white/[0.10] bg-surface-3/95 backdrop-blur-2xl shadow-elev-5"
      >
        {ActiveEditor ? (
          <ActiveEditor
            filters={filters}
            onChange={(next) => {
              onFiltersChange(next);
            }}
            onClose={() => setOpen(false)}
          />
        ) : (
          <div className="w-[300px]">
            <div className="px-3.5 py-2.5 border-b border-white/[0.08]">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
                Add a filter
              </p>
              <p className="font-editorial italic text-[11.5px] text-ink-4 mt-0.5">
                Pick the dimension you want to refine
              </p>
            </div>
            <div className="p-1.5 max-h-[360px] overflow-y-auto">
              {unsetDims.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActive(d.id)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-sharp text-left hover:bg-white/[0.05] focus-ring"
                  >
                    <span className="w-7 h-7 rounded-sharp border border-white/[0.10] bg-white/[0.02] flex items-center justify-center text-ink-2">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-[13px] text-ink leading-tight">{d.label}</p>
                  </button>
                );
              })}
              {setDims.length > 0 ? (
                <div className="mt-2 pt-2 border-t border-white/[0.06]">
                  <p className="px-2.5 pt-1 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4">
                    Already active
                  </p>
                  {setDims.map((d) => {
                    const Icon = d.icon;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setActive(d.id)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-sharp text-left hover:bg-white/[0.05] focus-ring"
                      >
                        <span className="w-7 h-7 rounded-sharp border border-track/30 bg-track/[0.08] flex items-center justify-center text-accent">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-ink leading-tight">{d.label}</p>
                          <p className="font-editorial italic text-[11.5px] text-ink-4 truncate mt-0.5">
                            {formatFilterValue(filters, d.id)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// =============================================================================
// FilterChipBar — public component
// =============================================================================

export const FilterChipBar = ({
  filters,
  type,
  onFiltersChange,
  onTypeChange,
}) => {
  // Arrow-key navigation across the tabs + chips. Tab still enters/exits
  // the toolbar; arrows shuffle focus inside it.
  const railRef = useRef(null);
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const root = railRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll(
        'button:not([disabled]), [role="tab"]:not([disabled])',
      ),
    );
    const idx = focusable.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = focusable[(idx + dir + focusable.length) % focusable.length];
    next?.focus();
  }, []);

  const activeDims = useMemo(
    () => DIMENSIONS.filter((d) => filterIsSet(filters, d.id)),
    [filters],
  );

  const showClearAll = hasAnyFilter(filters);

  return (
    <div
      ref={railRef}
      role="toolbar"
      aria-label="Search filters"
      onKeyDown={handleKeyDown}
      className="space-y-2.5 py-3 border-y border-white/[0.05]"
    >
      <div
        role="tablist"
        aria-label="Result type"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTypeChange?.(t.id)}
              className={cn(
                'relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sharp text-[12px] font-mono uppercase tracking-[0.18em] whitespace-nowrap focus-ring transition-colors duration-short',
                active
                  ? 'bg-track/15 text-accent border border-track/40'
                  : 'bg-transparent border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04]',
              )}
            >
              {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
              {t.label}
              {active ? (
                <motion.span
                  layoutId="searchTypeTabUnderline"
                  className="absolute left-3 right-3 bottom-[-6px] h-px bg-track"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <AnimatePresence initial={false}>
          {activeDims.map((d) => (
            <FilterChip
              key={d.id}
              dimension={d}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          ))}
        </AnimatePresence>
        <AddFilterButton filters={filters} onFiltersChange={onFiltersChange} />
        {showClearAll ? (
          <button
            type="button"
            onClick={() => onFiltersChange({ ...EMPTY_FILTERS })}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-sharp font-editorial italic text-[12px] normal-case tracking-normal',
              'text-ink-3 hover:text-ink focus-ring transition-colors',
            )}
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default FilterChipBar;
