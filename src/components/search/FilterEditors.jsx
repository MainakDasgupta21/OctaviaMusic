import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  MAX_DURATION,
  MAX_YEAR,
  MIN_DURATION,
  MIN_YEAR,
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
//
// Range constants intentionally come from `search-filter-state` so the URL
// parser and the editor inputs always agree about which values are
// representable. Diverging here used to silently clip values and erase user
// input at boundaries.
//
// Year and Duration intentionally do NOT use a slider: a 4px hairline track
// inside a popover is too fragile to grab on touch, and the underlying value
// space is small enough (a handful of decades, a handful of minutes) that
// presets + a numeric input are both faster and more reliable.
// =============================================================================

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
//
// `embedded` lets the editor inherit its container's width — used when the
// shell is rendered inside the Add-filter palette so we don't stack two
// fixed-width surfaces and create a visual seam.
export const EditorShell = ({ title, hint, children, footer, embedded = false }) => (
  <div className={cn(embedded ? 'w-full' : 'w-[min(300px,calc(100vw-1.5rem))]')}>
    <div className="px-4 pt-3 pb-2.5 border-b border-white/[0.04]">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">
        {title}
      </p>
      {hint ? (
        <p className="font-editorial italic text-[11.5px] text-ink-4 mt-0.5">
          {hint}
        </p>
      ) : null}
    </div>
    <div className="p-4">{children}</div>
    {footer ? (
      <div className="px-4 pb-4 -mt-1 flex items-center justify-end gap-2">
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

export const SortEditor = ({ filters, onChange, onClose, embedded }) => {
  const current = filters?.sort || 'relevance';
  return (
    <EditorShell title="Sort results" embedded={embedded}>
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
//
// Two layered controls so users can land a value the way they prefer:
//   1. Two numeric inputs ("From" / "To") for precise typing.
//   2. Decade chips (60s, 70s, …) for one-click presets.
//
// Both write back through the same `onChange` so the editor never gets out
// of sync with the chip rail or URL.
// =============================================================================

const clampYearValue = (n) =>
  Math.max(MIN_YEAR, Math.min(MAX_YEAR, Math.round(Number(n) || 0)));

const decadeStart = (year) => Math.floor(year / 10) * 10;

const buildDecadePresets = () => {
  const presets = [];
  // Walk from the 1960s up to whatever decade we're currently in. Music
  // search has effectively zero demand for pre-1960 decade buckets, but the
  // numeric From/To inputs still accept anything down to MIN_YEAR for users
  // who care about earlier eras.
  const startDecade = 1960;
  const endDecade = decadeStart(MAX_YEAR);
  for (let d = startDecade; d <= endDecade; d += 10) {
    const label = `${String(d).slice(2)}s`;
    const from = d;
    const to = Math.min(d + 9, MAX_YEAR);
    presets.push({ label, from, to });
  }
  return presets;
};

const DECADE_PRESETS = buildDecadePresets();

const presetChipClass = (active) =>
  cn(
    'rounded-sharp px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.14em] focus-ring transition-colors',
    active
      ? 'bg-track/15 text-accent border border-track/40'
      : 'border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04]',
  );

export const YearEditor = ({ filters, onChange, embedded }) => {
  const yearFrom = Number.isFinite(filters?.yearFrom) ? filters.yearFrom : null;
  const yearTo = Number.isFinite(filters?.yearTo) ? filters.yearTo : null;

  // Local input state lets the user type a multi-digit year without us
  // committing partial values like 20 or 201 mid-keystroke.
  const [fromInput, setFromInput] = useState(yearFrom != null ? String(yearFrom) : '');
  const [toInput, setToInput] = useState(yearTo != null ? String(yearTo) : '');
  useEffect(() => {
    setFromInput(yearFrom != null ? String(yearFrom) : '');
  }, [yearFrom]);
  useEffect(() => {
    setToInput(yearTo != null ? String(yearTo) : '');
  }, [yearTo]);

  const commit = (next) => {
    onChange({ ...filters, ...next });
  };

  const commitInput = (which, raw, fallback) => {
    const trimmed = String(raw).trim();
    if (!trimmed) {
      commit({ [which]: null });
      return;
    }
    const num = Math.round(Number(trimmed));
    if (!Number.isFinite(num)) {
      // Restore the on-screen text to whatever's currently in state.
      fallback();
      return;
    }
    const clamped = clampYearValue(num);
    commit({ [which]: clamped });
  };

  const presetActive = (preset) =>
    yearFrom === preset.from && yearTo === preset.to;
  const noBoundsActive = yearFrom == null && yearTo == null;

  return (
    <EditorShell title="Release year" embedded={embedded}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>From</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            value={fromInput}
            min={MIN_YEAR}
            max={MAX_YEAR}
            onChange={(e) => setFromInput(e.target.value)}
            onBlur={() =>
              commitInput('yearFrom', fromInput, () =>
                setFromInput(yearFrom != null ? String(yearFrom) : ''),
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitInput('yearFrom', fromInput, () =>
                  setFromInput(yearFrom != null ? String(yearFrom) : ''),
                );
              }
            }}
            placeholder={String(MIN_YEAR)}
            aria-label="From year"
            className={cn(baseInputClass, 'mt-1.5')}
          />
        </div>
        <div>
          <FieldLabel>To</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            value={toInput}
            min={MIN_YEAR}
            max={MAX_YEAR}
            onChange={(e) => setToInput(e.target.value)}
            onBlur={() =>
              commitInput('yearTo', toInput, () =>
                setToInput(yearTo != null ? String(yearTo) : ''),
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitInput('yearTo', toInput, () =>
                  setToInput(yearTo != null ? String(yearTo) : ''),
                );
              }
            }}
            placeholder={String(MAX_YEAR)}
            aria-label="To year"
            className={cn(baseInputClass, 'mt-1.5')}
          />
        </div>
      </div>

      <div className="mt-4">
        <FieldLabel>Quick pick</FieldLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {DECADE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => commit({ yearFrom: p.from, yearTo: p.to })}
              aria-pressed={presetActive(p)}
              className={presetChipClass(presetActive(p))}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => commit({ yearFrom: null, yearTo: null })}
            aria-pressed={noBoundsActive}
            className={presetChipClass(noBoundsActive)}
          >
            Any
          </button>
        </div>
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

// Editor stores duration in seconds (matches state) but the user interacts
// in whole minutes — easier to reason about and matches typical music UX.
const secondsToMinutesString = (seconds) =>
  Number.isFinite(seconds) && seconds > 0
    ? String(Math.max(1, Math.round(seconds / 60)))
    : '';

const DURATION_PRESETS = [
  { label: '1m', value: 60 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '20m', value: 1200 },
];

const clampDurationValue = (n) =>
  Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(Number(n) || 0)));

export const DurationEditor = ({ filters, onChange, embedded }) => {
  const cap = Number.isFinite(filters?.durationMax) ? filters.durationMax : null;

  const [minutesInput, setMinutesInput] = useState(secondsToMinutesString(cap));
  useEffect(() => {
    setMinutesInput(secondsToMinutesString(cap));
  }, [cap]);

  const commit = (next) => {
    onChange({ ...filters, ...next });
  };

  const commitMinutes = (raw) => {
    const trimmed = String(raw).trim();
    if (!trimmed) {
      commit({ durationMax: null });
      return;
    }
    const minutes = Math.round(Number(trimmed));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setMinutesInput(secondsToMinutesString(cap));
      return;
    }
    const seconds = clampDurationValue(minutes * 60);
    // Match the Year editor's contract: snapping all the way to the editor
    // ceiling means "no cap". Anywhere below that ceiling is a real cap.
    commit({ durationMax: seconds < MAX_DURATION ? seconds : null });
  };

  const presetActive = (preset) => cap === preset.value;
  const anyActive = cap == null;

  return (
    <EditorShell title="Max duration" embedded={embedded}>
      <FieldLabel>Up to</FieldLabel>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.round(MAX_DURATION / 60)}
          value={minutesInput}
          onChange={(e) => setMinutesInput(e.target.value)}
          onBlur={() => commitMinutes(minutesInput)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitMinutes(minutesInput);
            }
          }}
          placeholder={String(Math.round(MAX_DURATION / 60))}
          aria-label="Max minutes"
          className={cn(baseInputClass, 'flex-1')}
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 shrink-0">
          minutes
        </span>
      </div>

      <div className="mt-4">
        <FieldLabel>Quick pick</FieldLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => commit({ durationMax: p.value })}
              aria-pressed={presetActive(p)}
              className={presetChipClass(presetActive(p))}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => commit({ durationMax: null })}
            aria-pressed={anyActive}
            className={presetChipClass(anyActive)}
          >
            Any
          </button>
        </div>
      </div>
    </EditorShell>
  );
};

// =============================================================================
// Artist / Album text editors
// =============================================================================

const TextScopeEditor = ({ filters, onChange, onClose, dimension, title, hint, placeholder, embedded }) => {
  const initial = filters?.[dimension] || '';
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const trimmed = value.trim();
  // Enter and the submit button must follow the same disabled-when-empty
  // contract — otherwise pressing Enter on a blank input silently wipes an
  // existing artist/album filter.
  const commit = () => {
    if (!trimmed) return;
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
      embedded={embedded}
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

export const MoodEditor = ({ filters, onChange, embedded }) => {
  const current = useMemo(() => new Set(filters?.mood || []), [filters?.mood]);
  return (
    <EditorShell title="Mood / Version" hint="Pick one or more variants" embedded={embedded}>
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

export const CleanEditor = ({ filters, onChange, embedded }) => (
  <EditorShell title="Explicit content" hint="Hide explicit results" embedded={embedded}>
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

export const ExcludeEditor = ({ filters, onChange, embedded }) => {
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
      embedded={embedded}
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
