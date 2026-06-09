import { useMemo, useRef } from 'react';
import { MODE_OPTIONS, REGION_OPTIONS, WINDOW_OPTIONS } from '@/types/charts.types';
import { cn } from '@/lib/utils';

const nextIndexFromKey = (key, currentIndex, length) => {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (currentIndex + 1) % length;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (currentIndex - 1 + length) % length;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return -1;
};

const FilterPillGroup = ({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  activeClassName,
  inactiveClassName,
  groupId,
  panelId,
}) => {
  const refs = useRef(new Map());

  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        text: option.flag ? `${option.flag} ${option.label}` : option.label,
      })),
    [options],
  );

  return (
    <div className="flex min-w-0 items-center gap-1.5 xs:gap-2">
      <span className="issue-pill hidden md:inline-flex">{label}</span>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex min-w-0 w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 pr-2 no-scrollbar [scrollbar-width:none] xs:gap-2 xs:pr-1"
        onKeyDown={(event) => {
          const idx = normalizedOptions.findIndex((item) => item.id === value);
          const nextIdx = nextIndexFromKey(event.key, idx, normalizedOptions.length);
          if (nextIdx < 0) return;
          event.preventDefault();
          const next = normalizedOptions[nextIdx];
          onChange(next.id);
          refs.current.get(next.id)?.focus();
        }}
      >
        {normalizedOptions.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              ref={(node) => {
                if (node) refs.current.set(option.id, node);
                else refs.current.delete(option.id);
              }}
              id={`${groupId}-${option.id}`}
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              type="button"
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(option.id)}
              className={cn(
                'touch-target shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.08em] transition-colors focus-ring xs:px-3.5 xs:py-2 xs:text-[12px] xs:tracking-[0.14em]',
                active ? activeClassName : inactiveClassName,
              )}
            >
              {option.text}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ChartsFilters = ({
  mode,
  region,
  window,
  setMode,
  setRegion,
  setWindow,
}) => (
  <div className="sticky top-0 z-20 -mx-1 mb-6 border-y border-white/[0.06] bg-surface-1/90 px-1 py-3 backdrop-blur-md xs:-mx-2 xs:px-2 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
    <div className="flex flex-col gap-3">
      <FilterPillGroup
        label="Mode"
        ariaLabel="Chart mode"
        value={mode}
        options={MODE_OPTIONS}
        onChange={setMode}
        groupId="chart-mode"
        panelId="charts-results-panel"
        activeClassName="bg-emerald-400 text-[#0d0d0d] border-emerald-300"
        inactiveClassName="border-white/15 text-ink-3 hover:text-ink hover:border-white/35"
      />

      <FilterPillGroup
        label="Region"
        ariaLabel="Chart region"
        value={region}
        options={REGION_OPTIONS}
        onChange={setRegion}
        groupId="chart-region"
        panelId="charts-results-panel"
        activeClassName="bg-emerald-400 text-[#0d0d0d] border-emerald-300"
        inactiveClassName="border-white/15 text-ink-3 hover:text-ink hover:border-white/35"
      />

      <FilterPillGroup
        label="Window"
        ariaLabel="Chart time window"
        value={window}
        options={WINDOW_OPTIONS}
        onChange={setWindow}
        groupId="chart-window"
        panelId="charts-results-panel"
        activeClassName="bg-white/[0.08] text-emerald-300 border-emerald-400/40"
        inactiveClassName="border-white/15 text-ink-3 hover:text-ink hover:border-white/35"
      />
    </div>
  </div>
);

export default ChartsFilters;
