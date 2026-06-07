import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Album,
  ArrowUpDown,
  Ban,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
// its editor popover. A trailing `+ Add filter` button opens a simple
// dimension picker; selecting one opens that dimension's editor in-place.
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
// Add-filter menu — a quiet, premium dropdown:
//   - active === null  -> flat list of every filter dimension
//   - active === <id>  -> that dimension's editor, behind a contextual Back row
//
// No header band, no search field, no group headings, no icon tiles — just a
// clean menu of rows (icon tile + label + value subtitle + chevron). Each row
// drills into its editor; the editor owns its own title so headers never
// stack.
// =============================================================================

const MENU_WIDTH = 'w-[280px]';

const AddFilterPalette = ({
  filters,
  onFiltersChange,
  onRequestClose,
  active,
  setActive,
}) => {
  const listRef = useRef(null);

  // Flat list of focusable rows in DOM order — feeds the arrow-key walker.
  const collectFocusables = useCallback(() => {
    const root = listRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll('button[data-menu-item]:not([disabled])'),
    );
  }, []);

  // When the menu (re)appears, land focus on the first row so keyboard users
  // can arrow straight down — and so returning from an editor doesn't drop
  // focus to the page body.
  useEffect(() => {
    if (active) return;
    const first = listRef.current?.querySelector('button[data-menu-item]');
    first?.focus();
  }, [active]);

  const handleMenuKeyDown = useCallback(
    (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const focusables = collectFocusables();
      if (!focusables.length) return;
      e.preventDefault();
      const idx = focusables.indexOf(document.activeElement);
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const start = idx === -1 ? (dir === 1 ? -1 : 0) : idx;
      const next = (start + dir + focusables.length) % focusables.length;
      focusables[next]?.focus();
    },
    [collectFocusables],
  );

  // ===========================================================================
  // Editor view — contextual Back row showing the active dimension, then the
  // editor body. The Back row mirrors the menu rows' icon-tile rhythm so the
  // drill-in feels like the same surface, not a separate panel.
  // ===========================================================================
  if (active) {
    const ActiveDim = DIMENSION_BY_ID[active];
    const ActiveEditor = ActiveDim?.Editor;
    if (!ActiveEditor) return null;
    const ActiveIcon = ActiveDim.icon;
    return (
      <div className={MENU_WIDTH}>
        <button
          type="button"
          onClick={() => setActive(null)}
          className={cn(
            'group flex w-full items-center gap-3 pl-3 pr-3 py-2.5 text-left',
            'border-b border-white/[0.06]',
            // Same hover wash + transition profile as menu rows.
            'hover:bg-white/[0.035]',
            'focus-ring transition-colors duration-200 ease-out',
          )}
          aria-label="Back to filter picker"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-ink-3 group-hover:text-ink-2 transition-colors" />
          <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-ink-3 group-hover:text-ink-2 transition-colors">
            Back
          </span>
          <span className="flex-1" />
          {ActiveIcon ? (
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded-sharp shrink-0',
                'text-accent border border-track/35',
                'bg-gradient-to-b from-track/[0.22] to-track/[0.06]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
              )}
            >
              <ActiveIcon className="w-3 h-3" aria-hidden="true" />
            </span>
          ) : null}
          <span className="font-editorial italic text-[12.5px] text-accent/85">
            {ActiveDim.label}
          </span>
        </button>
        <ActiveEditor
          filters={filters}
          onChange={onFiltersChange}
          onClose={onRequestClose}
          embedded
        />
      </div>
    );
  }

  // ===========================================================================
  // Menu view — flat list of dimensions, each row a small "card" with an
  // icon tile, the dimension label, and (when set) an italic value subtitle.
  // Rows where the filter is currently set carry an accent left-rule, a
  // gentle gradient wash, and a tinted icon tile so users can scan the
  // active dimensions at a glance. Hover/focus apply the same low-key wash
  // — never a saturated bg — so the menu stays calm even with motion off.
  // ===========================================================================
  return (
    <div
      ref={listRef}
      role="menu"
      aria-label="Add a filter"
      onKeyDown={handleMenuKeyDown}
      className={cn(
        MENU_WIDTH,
        'py-1.5 max-h-[min(440px,var(--radix-popover-content-available-height,80vh))] overflow-y-auto',
      )}
    >
      {DIMENSIONS.map((d) => {
        const Icon = d.icon;
        const isSet = filterIsSet(filters, d.id);
        const value = isSet ? formatFilterValue(filters, d.id) : '';
        return (
          <button
            key={d.id}
            type="button"
            role="menuitem"
            data-menu-item
            onClick={() => setActive(d.id)}
            aria-label={value ? `${d.label}, ${value}` : d.label}
            className={cn(
              'group relative flex w-full items-center gap-3 pl-3.5 pr-3 py-2.5',
              'text-left transition-[background-color,color] duration-200 ease-out',
              'focus-ring',
              isSet
                ? 'bg-gradient-to-r from-track/[0.05] via-transparent to-transparent hover:from-track/[0.08]'
                : 'hover:bg-white/[0.035]',
            )}
          >
            {isSet ? (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-full bg-track"
              />
            ) : null}
            <span
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-sharp shrink-0',
                'transition-[background-color,border-color,color,box-shadow] duration-200 ease-out',
                isSet
                  ? cn(
                      'text-accent border border-track/35',
                      'bg-gradient-to-b from-track/[0.22] to-track/[0.06]',
                      'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
                    )
                  : cn(
                      'text-ink-3 border border-white/[0.07]',
                      'bg-gradient-to-b from-white/[0.04] to-white/[0.01]',
                      'group-hover:text-ink-2 group-hover:border-white/[0.12]',
                      'group-hover:from-white/[0.06] group-hover:to-white/[0.02]',
                    ),
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="flex-1 min-w-0">
              <span
                className={cn(
                  'block text-[13px] leading-tight truncate transition-colors duration-200',
                  isSet
                    ? 'text-ink font-medium tracking-[-0.005em]'
                    : 'text-ink-2 group-hover:text-ink',
                )}
              >
                {d.label}
              </span>
              {value ? (
                <span className="block mt-0.5 font-editorial italic text-[11.5px] text-accent/75 truncate">
                  {value}
                </span>
              ) : null}
            </span>
            <ChevronRight
              className={cn(
                'w-3.5 h-3.5 shrink-0',
                'text-ink-4/30 -translate-x-0.5 transition-[color,transform] duration-200 ease-out',
                'group-hover:text-ink-3 group-hover:translate-x-0',
                'group-focus-visible:text-ink-3 group-focus-visible:translate-x-0',
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
};

const AddFilterButton = ({ filters, onFiltersChange }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const wasOpenRef = useRef(false);

  // Normalize all close paths (outside click, Esc, editor-driven close) so the
  // next open always starts back on the menu view rather than a stale editor.
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      setActive(null);
    }
    wasOpenRef.current = open;
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add filter"
          className={cn(
            'group inline-flex items-center gap-1.5 px-3 py-[5px] rounded-sharp',
            'font-mono text-[10.5px] uppercase tracking-[0.18em]',
            // Solid hairline + a barely-there top→bottom gradient and inset
            // highlight reads more "designed object" than the older dashed
            // outline, while staying just as quiet at rest.
            'text-ink-3 border border-white/[0.10]',
            'bg-gradient-to-b from-white/[0.04] to-white/[0.01]',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
            'hover:text-accent hover:border-accent/40',
            'hover:from-accent/[0.07] hover:to-accent/[0.02]',
            'focus-ring whitespace-nowrap transition-[color,border-color,background-color] duration-200 ease-out',
            // Open-state mirrors hover so the trigger reads as paired with
            // its popover (calmly, no extra glow).
            'data-[state=open]:text-accent data-[state=open]:border-accent/40',
            'data-[state=open]:from-accent/[0.07] data-[state=open]:to-accent/[0.02]',
          )}
        >
          <Plus className="w-3 h-3 transition-transform duration-300 ease-out group-hover:rotate-90 group-data-[state=open]:rotate-45" />
          Add filter
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        collisionPadding={16}
        className={cn(
          'p-0 rounded-sharp overflow-hidden',
          'border border-white/[0.10] bg-surface-3/95 backdrop-blur-2xl',
          // Layered shadow: a long soft drop, a tight close-shadow for
          // crispness, an inner top highlight (1px white) for a glassy
          // edge, and a subtle outer ring so the panel reads as a floating
          // object on any background — without any extra animation noise.
          'shadow-[0_24px_60px_-22px_rgba(0,0,0,0.7),0_4px_12px_-4px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]',
          'ring-1 ring-black/30',
        )}
      >
        <AddFilterPalette
          filters={filters}
          onFiltersChange={onFiltersChange}
          onRequestClose={handleClose}
          active={active}
          setActive={setActive}
        />
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
