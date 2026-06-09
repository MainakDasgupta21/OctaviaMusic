import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { EMPTY_FILTERS } from '@/lib/search-filter-state';
import { PRESETS } from '@/lib/search-quick-presets';
import { cn } from '@/lib/utils';

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
                'group flex items-center gap-2.5 rounded-sharp px-2.5 py-2 text-left sm:gap-3 sm:px-3 sm:py-2.5',
                'border border-white/[0.10] bg-gradient-to-b from-white/[0.04] to-white/[0.01]',
                'hover:from-white/[0.07] hover:to-white/[0.02] hover:border-white/25',
                'transition-colors focus-ring',
              )}
            >
              <span
                className={cn(
                  'h-8 w-8 shrink-0 rounded-sharp sm:h-9 sm:w-9 flex items-center justify-center',
                  'border border-white/[0.08] bg-white/[0.02] text-ink-2',
                  'group-hover:text-ink group-hover:border-white/20 transition-colors',
                )}
              >
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] text-ink truncate leading-tight sm:text-[13px]">
                  {preset.label}
                </p>
                <p className="mt-0.5 truncate font-editorial italic text-[11px] text-ink-4 sm:text-[11.5px]">
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
