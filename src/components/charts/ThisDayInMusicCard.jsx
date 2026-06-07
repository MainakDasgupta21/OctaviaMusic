import { X } from 'lucide-react';

const ThisDayInMusicCard = ({ fact, onDismiss, onExplore }) => (
  <div className="rounded-soft border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 mb-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-300">
          {'\ud83d\udcc5'} {fact.title}
        </p>
        <p className="mt-2 text-sm text-ink">
          {fact.dateLabel} - On this date in {fact.year}, {fact.text}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="h-7 w-7 rounded-full border border-white/15 bg-white/[0.04] text-ink-4 hover:text-ink hover:bg-white/[0.1] transition-colors focus-ring inline-flex items-center justify-center shrink-0"
        aria-label="Dismiss This Day in Music"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="mt-3 flex justify-end">
      <button
        type="button"
        className="text-sm text-emerald-300 hover:text-emerald-200 transition-colors focus-ring rounded-sharp px-1 py-0.5"
        onClick={onExplore}
      >
        Explore {'->'}
      </button>
    </div>
  </div>
);

export default ThisDayInMusicCard;
