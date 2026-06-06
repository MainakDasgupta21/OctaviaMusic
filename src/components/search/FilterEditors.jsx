import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  addExclude,
  clearFilter,
  removeExclude,
  setFilter,
  toggleMood,
  VALID_MOODS,
} from '@/lib/search-filter-state';
import { cn } from '@/lib/utils';

// =============================================================================
// Each editor is a tiny self-contained popover body. They share a single
// styling toolkit (input class, button classes, FieldLabel) so the editor
// surface feels visually consistent regardless of dimension.
// =============================================================================

const NOW = new Date().getFullYear();
const MIN_YEAR = 1950;
const MAX_DURATION = 600;

export const baseInputClass = cn(
  'w-full h-9 rounded-sharp bg-transparent border border-white/[0.10] px-3 text-[13px]',
  'text-ink placeholder:text-ink-4 placeholder:font-editorial placeholder:italic',
  'hover:border-white/20 focus:border-track/70 focus:bg-white/[0.03] focus:outline-none',
  'transition-colors',
);

export const submitButtonClass = cn(
  'inline-flex items-center justify-center px-3 py-1.5 rounded-sharp font-mono text-[11px] uppercase tracking-[0.18em]',
  'bg-track text-track-fg border border-track hover:bg-track/90 focus-ring disabled:opacity-50 disabled:cursor-not-allowed',
);

export const ghostButtonClass = cn(
  'inline-flex items-center justify-center px-3 py-1.5 rounded-sharp font-mono text-[11px] uppercase tracking-[0.18em]',
  'border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04] focus-ring',
);

const FieldLabel = ({ children }) => (
  <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
    {children}
  </label>
);

// Shell every editor renders inside. Title + optional hint + Done/Cancel
// row at the bottom, which gives the user a consistent way to close the
// popover whether the dimension submits inline or commits-on-blur.
export const EditorShell = ({ title, hint, children, footer }) => (
  <div className="w-[300px]">
    <div className="px-3.5 py-2.5 border-b border-white/[0.04] bg-white/[0.015]">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
        {title}
      </p>
      {hint ? (
        <p className="font-editorial italic text-[11.5px] text-ink-4 mt-0.5">
          {hint}
        </p>
      ) : null}
    </div>
    <div className="p-3.5">{children}</div>
    {footer ? (
      <div className="px-3.5 pb-3.5 -mt-1 flex items-center justify-end gap-2">
        {footer}
      </div>
    ) : null}
  </div>
);

// =============================================================================
// Sort
// =============================================================================

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance', hint: 'Default ranking' },
  { id: 'popularity', label: 'Popularity', hint: 'Most-played first' },
  { id: 'newest', label: 'Newest', hint: 'Latest releases' },
  { id: 'shortest', label: 'Shortest', hint: 'Quick listens' },
];

export const SortEditor = ({ filters, onChange, onClose }) => {
  const current = filters?.sort || 'relevance';
  return (
    <EditorShell title="Sort results">
      <div className="space-y-1">
        {SORT_OPTIONS.map((opt) => {
          const active = current === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(setFilter(filters, 'sort', opt.id));
                onClose?.();
              }}
              className={cn(
                'relative w-full flex items-center gap-2 px-2.5 py-2 rounded-sharp text-left focus-ring transition-colors',
                active
                  ? "bg-track/[0.10] before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-4 before:bg-track before:rounded-full"
                  : 'hover:bg-white/[0.05]',
              )}
            >
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-[13px] leading-tight',
                    active ? 'text-accent' : 'text-ink',
                  )}
                >
                  {opt.label}
                </p>
                <p className="font-editorial italic text-[11.5px] text-ink-4 mt-0.5">
                  {opt.hint}
                </p>
              </div>
              {active ? <Check className="w-3.5 h-3.5 text-accent shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </EditorShell>
  );
};

// =============================================================================
// Year range
// =============================================================================

export const YearEditor = ({ filters, onChange }) => {
  const from = Number.isFinite(filters?.yearFrom) ? filters.yearFrom : MIN_YEAR;
  const to = Number.isFinite(filters?.yearTo) ? filters.yearTo : NOW;
  const fromClamped = Math.max(MIN_YEAR, Math.min(NOW, from));
  const toClamped = Math.max(MIN_YEAR, Math.min(NOW, to));

  const handle = (range) => {
    if (!Array.isArray(range) || range.length !== 2) return;
    const [a, b] = range;
    onChange({
      ...filters,
      yearFrom: a > MIN_YEAR ? a : null,
      yearTo: b < NOW ? b : null,
    });
  };

  return (
    <EditorShell title="Release year" hint={`${fromClamped} – ${toClamped}`}>
      <Slider
        min={MIN_YEAR}
        max={NOW}
        step={1}
        value={[fromClamped, toClamped]}
        onValueChange={handle}
        aria-label="Release year range"
        className="[&_[role=slider]]:bg-track"
      />
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4">
        <span>{MIN_YEAR}</span>
        <span>{NOW}</span>
      </div>
    </EditorShell>
  );
};

// =============================================================================
// Duration cap
// =============================================================================

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Any length';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
  }
  return `${seconds}s`;
};

export const DurationEditor = ({ filters, onChange }) => {
  const cap = Number.isFinite(filters?.durationMax)
    ? filters.durationMax
    : MAX_DURATION;
  const clamped = Math.max(30, Math.min(MAX_DURATION, cap));

  const handle = (range) => {
    if (!Array.isArray(range) || range.length === 0) return;
    const v = range[range.length - 1];
    onChange({
      ...filters,
      durationMax: v < MAX_DURATION ? v : null,
    });
  };

  return (
    <EditorShell
      title="Max duration"
      hint={cap >= MAX_DURATION ? 'Any length' : `≤ ${formatDuration(clamped)}`}
    >
      <Slider
        min={30}
        max={MAX_DURATION}
        step={30}
        value={[clamped]}
        onValueChange={handle}
        aria-label="Max song duration"
        className="[&_[role=slider]]:bg-track"
      />
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4">
        <span>0:30</span>
        <span>10:00</span>
      </div>
    </EditorShell>
  );
};

// =============================================================================
// Artist / Album text editors
// =============================================================================

const TextScopeEditor = ({ filters, onChange, onClose, dimension, title, hint, placeholder }) => {
  const initial = filters?.[dimension] || '';
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const trimmed = value.trim();
  const commit = () => {
    onChange(setFilter(filters, dimension, trimmed));
    onClose?.();
  };
  const cancel = () => {
    onChange(setFilter(filters, dimension, ''));
    onClose?.();
  };
  return (
    <EditorShell
      title={title}
      hint={hint}
      footer={
        <>
          {initial ? (
            <button type="button" className={ghostButtonClass} onClick={cancel}>
              Remove
            </button>
          ) : null}
          <button
            type="button"
            className={submitButtonClass}
            onClick={commit}
            disabled={!trimmed}
          >
            {initial ? 'Update' : 'Add'}
          </button>
        </>
      }
    >
      <FieldLabel>{title}</FieldLabel>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
        className={cn(baseInputClass, 'mt-1.5')}
      />
    </EditorShell>
  );
};

export const ArtistEditor = (props) => (
  <TextScopeEditor
    {...props}
    dimension="artist"
    title="Filter by artist"
    hint="Scope every result to a single artist"
    placeholder="e.g. Frank Ocean"
  />
);

export const AlbumEditor = (props) => (
  <TextScopeEditor
    {...props}
    dimension="album"
    title="Filter by album"
    hint="Scope every result to a single album"
    placeholder="e.g. Blonde"
  />
);

// =============================================================================
// Mood (multi-select)
// =============================================================================

const MOOD_LABELS = {
  live: 'Live',
  acoustic: 'Acoustic',
  remix: 'Remix',
  instrumental: 'Instrumental',
};

export const MoodEditor = ({ filters, onChange }) => {
  const current = useMemo(() => new Set(filters?.mood || []), [filters?.mood]);
  return (
    <EditorShell title="Mood / Version" hint="Pick one or more variants">
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from(VALID_MOODS).map((tag) => {
          const active = current.has(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(toggleMood(filters, tag))}
              aria-pressed={active}
              className={cn(
                'rounded-sharp px-2.5 py-1.5 text-[12px] font-mono uppercase tracking-[0.14em] focus-ring transition-colors',
                active
                  ? 'bg-track/15 text-accent border border-track/40'
                  : 'border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04]',
              )}
            >
              {MOOD_LABELS[tag]}
            </button>
          );
        })}
      </div>
    </EditorShell>
  );
};

// =============================================================================
// Clean only (boolean)
// =============================================================================

export const CleanEditor = ({ filters, onChange }) => (
  <EditorShell title="Explicit content" hint="Hide explicit results">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[13px] text-ink">Clean only</p>
        <p className="font-editorial italic text-[11.5px] text-ink-4 mt-0.5">
          Strip explicit songs from the result set
        </p>
      </div>
      <Switch
        checked={Boolean(filters?.clean)}
        onCheckedChange={(on) => onChange(setFilter(filters, 'clean', Boolean(on)))}
        aria-label="Toggle clean-only filter"
      />
    </div>
  </EditorShell>
);

// =============================================================================
// Exclude (multi-token)
// =============================================================================

export const ExcludeEditor = ({ filters, onChange }) => {
  const [value, setValue] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const exclude = filters?.exclude || [];
  const trimmed = value.trim().toLowerCase().replace(/^-+/, '');
  const commit = () => {
    if (!trimmed) return;
    onChange(addExclude(filters, trimmed));
    setValue('');
    ref.current?.focus();
  };
  return (
    <EditorShell
      title="Exclude words"
      hint="Filter results that mention these"
    >
      <FieldLabel>Add a word</FieldLabel>
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="karaoke"
          className={baseInputClass}
        />
        <button
          type="button"
          onClick={commit}
          className={submitButtonClass}
          disabled={!trimmed}
        >
          Add
        </button>
      </div>
      {exclude.length > 0 ? (
        <div className="mt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4 mb-1.5">
            Currently excluded
          </p>
          <div className="flex flex-wrap gap-1.5">
            {exclude.map((token) => (
              <span
                key={token}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-sharp border border-white/[0.10] bg-white/[0.02] text-[11.5px] text-ink-2"
              >
                <span className="font-editorial italic text-[12px]">{token}</span>
                <button
                  type="button"
                  onClick={() => onChange(removeExclude(filters, token))}
                  className="rounded-sharp p-0.5 text-ink-3 hover:text-ink focus-ring"
                  aria-label={`Remove ${token}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </EditorShell>
  );
};

// =============================================================================
// Public registry — { id, label, eyebrow, icon, EditorComponent, isSet, format }
// Single source the chip bar can iterate to build chips + the +Add menu.
// =============================================================================

export const filterIsSet = (filters, id) => {
  const f = filters || {};
  switch (id) {
    case 'sort':
      return Boolean(f.sort && f.sort !== 'relevance');
    case 'year':
      return Number.isFinite(f.yearFrom) || Number.isFinite(f.yearTo);
    case 'duration':
      return Number.isFinite(f.durationMax);
    case 'artist':
      return Boolean(f.artist);
    case 'album':
      return Boolean(f.album);
    case 'mood':
      return Boolean(f.mood && f.mood.length);
    case 'clean':
      return Boolean(f.clean);
    case 'exclude':
      return Boolean(f.exclude && f.exclude.length);
    default:
      return false;
  }
};

export const formatFilterValue = (filters, id) => {
  const f = filters || {};
  switch (id) {
    case 'sort':
      return (
        SORT_OPTIONS.find((o) => o.id === f.sort)?.label ||
        f.sort?.[0]?.toUpperCase() + f.sort?.slice(1)
      );
    case 'year': {
      const from = Number.isFinite(f.yearFrom) ? f.yearFrom : null;
      const to = Number.isFinite(f.yearTo) ? f.yearTo : null;
      if (from && to) return `${from}–${to}`;
      if (from) return `From ${from}`;
      if (to) return `Until ${to}`;
      return '';
    }
    case 'duration':
      return Number.isFinite(f.durationMax)
        ? `≤ ${formatDuration(f.durationMax)}`
        : '';
    case 'artist':
      return f.artist;
    case 'album':
      return f.album;
    case 'mood':
      return (f.mood || [])
        .map((m) => MOOD_LABELS[m] || m)
        .join(' · ');
    case 'clean':
      return 'On';
    case 'exclude':
      return (f.exclude || []).map((t) => `−${t}`).join(' ');
    default:
      return '';
  }
};

// `removeFilter(filters, id)` is just a thin wrapper around clearFilter that
// keeps the chip-bar code reading top-to-bottom without nested lookups.
export const removeFilter = clearFilter;
