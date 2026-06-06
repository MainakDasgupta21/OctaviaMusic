import { motion } from 'framer-motion';
import {
  CalendarRange,
  Clock,
  Mic,
  Music2,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { EMPTY_FILTERS, toggleMood } from '@/lib/search-filter-state';
import { cn } from '@/lib/utils';

const NOW = new Date().getFullYear();

// Each preset is a pure (currentFilters) => nextFilters transform. Composing
// through the structured state means: clicking twice doesn't double-add,
// removing the chip restores the previous state cleanly, and combinations
// stack ("This year" + "Clean only" works).
const PRESETS = [
  {
    id: 'this-year',
    label: 'This year',
    hint: `Released in ${NOW}`,
    icon: CalendarRange,
    apply: (f) => ({ ...f, yearFrom: NOW, yearTo: NOW }),
  },
  {
    id: 'last-decade',
    label: 'The 2010s',
    hint: 'Decade in review',
    icon: CalendarRange,
    apply: (f) => ({ ...f, yearFrom: 2010, yearTo: 2019 }),
  },
  {
    id: 'nineties',
    label: 'The 90s',
    hint: 'Decade in review',
    icon: CalendarRange,
    apply: (f) => ({ ...f, yearFrom: 1990, yearTo: 1999 }),
  },
  {
    id: 'under-three',
    label: 'Under 3 min',
    hint: 'Quick listens',
    icon: Clock,
    apply: (f) => ({ ...f, durationMax: 180 }),
  },
  {
    id: 'acoustic',
    label: 'Acoustic',
    hint: 'Unplugged feel',
    icon: Music2,
    apply: (f) => toggleMood(f, 'acoustic'),
  },
  {
    id: 'live',
    label: 'Live versions',
    hint: 'Concert energy',
    icon: Mic,
    apply: (f) => toggleMood(f, 'live'),
  },
  {
    id: 'remix',
    label: 'Remixes',
    hint: 'Reworked takes',
    icon: Waves,
    apply: (f) => toggleMood(f, 'remix'),
  },
  {
    id: 'clean',
    label: 'Clean only',
    hint: 'Hide explicit',
    icon: ShieldCheck,
    apply: (f) => ({ ...f, clean: true }),
  },
];

export const QuickPresets = ({ filters, onFiltersChange, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 inline-flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Quick filters
      </p>
      <motion.div
        initial="initial"
        animate="animate"
        variants={{
          animate: {
            transition: { staggerChildren: 0.025 },
          },
        }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
      >
        {PRESETS.map((preset) => {
          const Icon = preset.icon;
          return (
            <motion.button
              key={preset.id}
              variants={{
                initial: { opacity: 0, y: 4 },
                animate: { opacity: 1, y: 0 },
              }}
              type="button"
              onClick={() =>
                onFiltersChange?.(preset.apply(filters || { ...EMPTY_FILTERS }))
              }
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-sharp text-left',
                'border border-white/[0.10] bg-gradient-to-b from-white/[0.04] to-white/[0.01]',
                'hover:from-white/[0.07] hover:to-white/[0.02] hover:border-white/25',
                'transition-colors focus-ring',
              )}
            >
              <span
                className={cn(
                  'w-9 h-9 rounded-sharp flex items-center justify-center shrink-0',
                  'border border-white/[0.08] bg-white/[0.02] text-ink-2',
                  'group-hover:text-ink group-hover:border-white/20 transition-colors',
                )}
              >
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-ink truncate leading-tight">
                  {preset.label}
                </p>
                <p className="font-editorial italic text-[11.5px] text-ink-4 truncate mt-0.5">
                  {preset.hint}
                </p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

export default QuickPresets;
