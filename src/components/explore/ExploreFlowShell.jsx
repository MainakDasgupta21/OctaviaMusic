import { Activity, Flame, Radar } from 'lucide-react';
import ExploreFlowDeck from '@/components/explore/ExploreFlowDeck';

const ExploreFlowShell = ({
  mood = '',
  genre = '',
  stats = null,
  deck = [],
  isLoading = false,
  onPlay,
  onSave,
  onSkip,
  onLoadMore,
}) => {
  const activeTrack = deck[0] || null;
  const queueCount = Math.max(0, deck.length - 1);

  return (
    <div className="page-shell-content-narrow pt-5 md:pt-8 pb-12">
      <section className="mb-8 rounded-soft border border-white/[0.08] bg-surface-2/45 p-4 sm:p-5 md:p-6">
        <p className="eyebrow eyebrow-accent mb-2 inline-flex items-center gap-2">
          <Radar className="w-3.5 h-3.5" />
          Explore flow
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.95]">
          Continuous discovery tuned for your next obsession.
        </h1>
        <p className="font-editorial text-[13px] text-ink-3 mt-2">
          Mood: {mood || 'auto'} · Genre: {genre || 'auto'}
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          <div className="rounded-sharp border border-white/[0.08] bg-surface-1/45 p-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">Actions</p>
            <p className="font-display text-2xl text-ink inline-flex items-center gap-2">
              <Activity className="w-5 h-5 text-track" />
              {stats?.swipes || 0}
            </p>
          </div>
          <div className="rounded-sharp border border-white/[0.08] bg-surface-1/45 p-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">Saves</p>
            <p className="font-display text-2xl text-ink">{stats?.saves || 0}</p>
          </div>
          <div className="rounded-sharp border border-white/[0.08] bg-surface-1/45 p-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">Flow streak</p>
            <p className="font-display text-2xl text-ink inline-flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-300" />
              {Math.max(1, (stats?.plays || 0) + (stats?.saves || 0))}
            </p>
          </div>
        </div>
      </section>

      <ExploreFlowDeck
        track={activeTrack}
        queueCount={queueCount}
        isLoading={isLoading}
        onPlay={onPlay}
        onSave={onSave}
        onSkip={onSkip}
        onLoadMore={onLoadMore}
      />
    </div>
  );
};

export default ExploreFlowShell;
