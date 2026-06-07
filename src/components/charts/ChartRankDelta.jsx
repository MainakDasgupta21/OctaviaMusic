import { cn } from '@/lib/utils';
import { getRankDelta } from '@/lib/chartsUtils';

const ChartRankDelta = ({ rank, prevRank, peakRank, className }) => {
  const delta = getRankDelta(rank, prevRank);
  const isPeak = Number.isFinite(peakRank) && rank === peakRank;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[2.3rem] px-1.5 py-0.5 rounded-full border text-[10px] font-mono tracking-tight',
          delta.className,
        )}
        aria-label={delta.ariaLabel}
      >
        {delta.label}
      </span>
      {isPeak ? (
        <span
          className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-300 tracking-tight"
          aria-label="Peak rank"
        >
          {'\u25c6'} PEAK
        </span>
      ) : null}
    </div>
  );
};

export default ChartRankDelta;
