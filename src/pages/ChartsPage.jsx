import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Clock,
  ChevronUp,
  ChevronDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import Tabs from '@/components/ui-v2/Tabs';
import Button from '@/components/ui-v2/Button';
import Skeleton from '@/components/ui-v2/Skeleton';
import EmptyState from '@/components/ui-v2/EmptyState';
import { getCharts } from '@/lib/api';
import { fadeUp, staggerChildren } from '@/design/motion';
import { cn } from '@/lib/utils';

const REGIONS = [
  { id: 'global', label: 'Global' },
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'United Kingdom' },
  { id: 'jp', label: 'Japan' },
  { id: 'in', label: 'India' },
];

const WINDOWS = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This week' },
  { id: 'monthly', label: 'This month' },
  { id: 'alltime', label: 'All time' },
];

const formatPlays = (n) => {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

const formatMasthead = () => {
  const d = new Date();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d).toUpperCase();
};

// Editorial rank-delta dingbats: thin arrow + diff in mono.
const RankDelta = ({ current, prev }) => {
  const diff = prev - current;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center text-ink-4 font-mono text-[10px] tabular-nums">
        <Minus className="w-3 h-3" strokeWidth={1.75} />
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-success font-mono text-[10px] tabular-nums">
        <ChevronUp className="w-3 h-3" strokeWidth={2} />
        {diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-danger font-mono text-[10px] tabular-nums">
      <ChevronDown className="w-3 h-3" strokeWidth={2} />
      {-diff}
    </span>
  );
};

const NowPlayingBars = () => (
  <span className="inline-flex items-end gap-0.5 h-4" aria-label="Now playing">
    <span className="w-0.5 h-2 bg-accent rounded-full animate-pulse" />
    <span
      className="w-0.5 h-3 bg-accent rounded-full animate-pulse"
      style={{ animationDelay: '0.12s' }}
    />
    <span
      className="w-0.5 h-1.5 bg-accent rounded-full animate-pulse"
      style={{ animationDelay: '0.24s' }}
    />
  </span>
);

const ChartRowSkeleton = () => (
  <div className="grid grid-cols-[3rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center border-b border-white/[0.05] last:border-0">
    <Skeleton className="h-7 w-6 mx-auto" />
    <Skeleton className="w-12 h-12 rounded-sharp" />
    <div>
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="hidden md:block h-3 w-12" />
    <Skeleton className="w-6 h-6 rounded-full" />
    <Skeleton className="h-3 w-10" />
  </div>
);

const ChartsPage = () => {
  const { playTrack, addToQueue, currentTrack, isPlaying } = usePlayer();
  const [region, setRegion] = useState('global');
  const [chartWindow, setChartWindow] = useState('weekly');
  const masthead = useMemo(() => formatMasthead(), []);

  const { data: charts = [], isLoading, isError } = useQuery({
    queryKey: ['charts', region, chartWindow],
    queryFn: () => getCharts({ limit: 50 }),
    // v5: keep the current chart visible while a new region/window loads
    // instead of collapsing to the loading skeleton on every toggle.
    placeholderData: keepPreviousData,
  });

  const handlePlayAll = () => {
    if (!charts.length) return;
    playTrack(charts[0]);
    charts.slice(1).forEach((t) => addToQueue(t));
  };

  const regionLabel =
    REGIONS.find((r) => r.id === region)?.label || 'Global';
  const windowLabel =
    WINDOWS.find((w) => w.id === chartWindow)?.label || 'This week';

  return (
    <div className="p-5 md:p-10 max-w-[1600px] mx-auto pb-12">
      {/* Editorial masthead */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
      >
        <span>{masthead}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink-3">✦</span>
          <span>The Harmony Hub Daily · Charts</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Top 100</span>
      </div>

      {/* Page header */}
      <motion.div {...fadeUp} className="mb-10 grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-end">
        <div>
          <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
            <span className="w-6 h-px bg-track" />
            Top 100
          </p>
          <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
            <span>
              The charts,{' '}
              <em className="font-editorial text-track not-italic">measured.</em>
            </span>
          </h1>
          <p className="font-editorial text-[15px] text-ink-3 mt-4 max-w-xl leading-snug">
            What the world is playing right now —{' '}
            <em>{regionLabel.toLowerCase()}</em>,{' '}
            <em>{windowLabel.toLowerCase()}</em>.
          </p>
        </div>
        <div className="flex items-center gap-3 pb-2">
          <Button
            onClick={handlePlayAll}
            disabled={!charts.length}
            size="lg"
            leftIcon={<Play className="w-4 h-4 fill-current" />}
          >
            Play the top 50
          </Button>
        </div>
      </motion.div>

      {/* Issue-pill filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <span className="issue-pill">Region</span>
        <Tabs items={REGIONS} value={region} onValueChange={setRegion} variant="pill" />
        <span className="hidden md:inline-block w-px h-5 bg-white/10" aria-hidden="true" />
        <span className="issue-pill">Window</span>
        <Tabs items={WINDOWS} value={chartWindow} onValueChange={setChartWindow} variant="pill" />
      </div>

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Charts unavailable"
          description="We couldn't reach the catalog service. Please try again in a moment."
        />
      ) : (
        <motion.div
          variants={staggerChildren(0.025)}
          initial="initial"
          animate="animate"
          className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-[3rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">
            <span className="text-center">Rank</span>
            <span aria-hidden="true" />
            <span>Title</span>
            <span className="hidden md:block text-right">Plays</span>
            <span className="w-8" aria-hidden="true" />
            <span className="text-right">
              <Clock className="w-3.5 h-3.5 inline" />
            </span>
          </div>

          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <ChartRowSkeleton key={i} />)
            : charts.map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <motion.div
                    variants={fadeUp}
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={cn(
                      'group grid grid-cols-[3rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3.5',
                      'items-center cursor-pointer transition-colors border-b border-white/[0.05] last:border-0',
                      isCurrent ? 'bg-track/[0.08]' : 'hover:bg-white/[0.035]',
                    )}
                  >
                    <div className="text-center">
                      {isCurrent && isPlaying ? (
                        <div className="flex justify-center">
                          <NowPlayingBars />
                        </div>
                      ) : (
                        <p
                          className={cn(
                            'font-display italic text-[26px] leading-none tabular-nums',
                            isCurrent ? 'text-accent' : 'text-ink',
                          )}
                        >
                          {track.rank}
                        </p>
                      )}
                      <div className="mt-1 flex justify-center">
                        <RankDelta current={track.rank} prev={track.prev} />
                      </div>
                    </div>
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="w-12 h-12 rounded-sharp object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0">
                      <h4
                        className={cn(
                          'text-[14px] font-medium truncate',
                          isCurrent ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {track.title}
                      </h4>
                      <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
                        by {track.artist}
                      </p>
                    </div>
                    <span className="hidden md:block font-mono text-[12px] text-ink-3 tabular-nums text-right tracking-tight">
                      {formatPlays(track.plays)}
                    </span>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <HeartButton track={track} size="sm" />
                    </div>
                    <span className="font-mono text-[12px] text-ink-4 tabular-nums tracking-tight">
                      {track.duration}
                    </span>
                  </motion.div>
                );
              })}
        </motion.div>
      )}

      {/* End-of-charts marker */}
      {!isLoading && !isError && charts.length > 0 ? (
        <div className="mt-10 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
          <span className="flex-1 h-px bg-white/[0.08]" />
          <span>
            End of chart · {charts.length} ranked · {regionLabel} · {windowLabel}
          </span>
          <span className="flex-1 h-px bg-white/[0.08]" />
        </div>
      ) : null}
    </div>
  );
};

export default ChartsPage;
