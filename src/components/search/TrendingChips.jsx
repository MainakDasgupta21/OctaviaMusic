import { Flame, Music, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const KIND_ICON = {
  artist: User,
  song: Music,
};

export const TrendingChips = ({ terms = [], onPick, title = 'Trending now', className }) => {
  if (!Array.isArray(terms) || terms.length === 0) return null;
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 inline-flex items-center gap-1.5">
        <Flame className="w-3 h-3" />
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5 px-1 pt-0.5 pb-1">
        {terms.map((entry, idx) => {
          const Icon = KIND_ICON[entry.kind] || Music;
          // Showcase the top two as iridescent "holo" chips. Subtle enough
          // not to be loud, but enough to make trending feel like the
          // current "drop" — pure Gen Z dopamine.
          const isHolo = idx < 2;
          return (
            <button
              key={`${entry.kind}-${entry.label}`}
              type="button"
              onClick={() => onPick?.(entry.label, entry)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sharp border border-white/[0.10] bg-white/[0.02]',
                'text-[12px] text-ink-2 hover:text-ink hover:bg-white/[0.06] hover:border-white/[0.22] transition-colors focus-ring',
                isHolo && 'holo-chip border-transparent',
              )}
            >
              <Icon className="w-3 h-3 text-ink-3" />
              {entry.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TrendingChips;
