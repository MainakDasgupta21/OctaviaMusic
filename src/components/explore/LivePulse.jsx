import { Radio } from 'lucide-react';
import { getLiveDataState, getUpdatedAgoLabel } from '@/lib/chartsUtils';
import { cn } from '@/lib/utils';

const LivePulse = ({
  trendingCount = 0,
  leadTrack = null,
  lastUpdated = null,
}) => {
  const state = getLiveDataState('today');
  const updated = getUpdatedAgoLabel(lastUpdated);

  return (
    <section className="mb-14 rounded-soft border border-white/[0.08] bg-surface-2/45 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-2xl md:text-[32px] text-ink leading-tight">
          What the world is listening to right now
        </h2>
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em]',
            'border-emerald-400/30 text-emerald-300',
          )}
          title={state.tooltip}
        >
          <span className={cn('inline-block w-2 h-2 rounded-full', state.dotClassName)} />
          Live pulse
        </div>
      </div>
      <p className="font-editorial text-[14px] text-ink-3">
        Feel connected to everyone pressing play this minute.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <div className="rounded-sharp border border-white/[0.08] bg-surface-1/55 p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4 mb-2">Global now</p>
          <p className="font-display text-2xl text-ink">{trendingCount || '—'}</p>
          <p className="text-[12px] text-ink-3 mt-1">tracks in active rotation</p>
        </div>
        <div className="rounded-sharp border border-white/[0.08] bg-surface-1/55 p-4 sm:col-span-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4 mb-2">Top momentum</p>
          {leadTrack ? (
            <>
              <p className="font-display text-[28px] text-ink leading-tight">{leadTrack.title}</p>
              <p className="font-editorial text-[13px] text-ink-3 mt-1">{leadTrack.artist}</p>
            </>
          ) : (
            <p className="font-editorial text-[13px] text-ink-3">Updating live chart leaders…</p>
          )}
          {updated ? (
            <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-4 inline-flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              {updated}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default LivePulse;
