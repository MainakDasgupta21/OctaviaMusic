import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import Button from '@/components/ui-v2/Button';
import EmptyState from '@/components/ui-v2/EmptyState';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import { getTrending } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { usePageError } from '@/hooks/use-page-error';
import { formatPlays } from '@/lib/player-format';
import { cn } from '@/lib/utils';

const TRENDING_SHARED_LIMIT = 40;
const TRENDING_PAGE_LIMIT = 20;

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

const TrendingRowSkeleton = () => (
  <div className="grid grid-cols-[2.5rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center border-b border-white/[0.06] last:border-0">
    <Skeleton className="h-7 w-7 mx-auto" />
    <Skeleton className="w-12 h-12 rounded-sharp" />
    <div className="flex-1">
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
    <Skeleton className="hidden md:block w-20 h-3" />
    <Skeleton className="w-6 h-6 rounded-full" />
    <Skeleton className="w-12 h-3" />
  </div>
);

const TrendingPage = () => {
  const { playTrack, currentTrack, isPlaying, addToQueue } = usePlayer();
  const { masthead, issueNum } = useEditorialMeta();

  const { data: trending = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.trending(TRENDING_SHARED_LIMIT),
    queryFn: ({ signal }) => getTrending({ limit: TRENDING_SHARED_LIMIT, signal }),
    select: (rows) => (Array.isArray(rows) ? rows.slice(0, TRENDING_PAGE_LIMIT) : []),
    ...cachePolicy.trending,
  });
  const pageError = usePageError(error, { resource: 'trending' });

  const handlePlayAll = () => {
    if (!trending.length) return;
    playTrack(trending[0]);
    trending.slice(1).forEach((t) => addToQueue(t));
  };

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
          <span>The Octavia Daily · Trending</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Vol. 01 · No. {issueNum}</span>
      </div>

      {/* Page header */}
      <motion.div {...fadeUp} className="mb-10 grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-end">
        <div>
          <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
            <span className="w-6 h-px bg-track" />
            <TrendingUp className="w-3.5 h-3.5" />
            On the rise
          </p>
          <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
            <span>
              The world is{' '}
              <em className="font-editorial text-track not-italic">on rotation.</em>
            </span>
          </h1>
          <p className="font-editorial text-[15px] text-ink-3 mt-4 max-w-xl leading-snug">
            Twenty tracks climbing the charts right now — refreshed every hour, from every corner.
          </p>
        </div>
        <div className="flex items-center gap-3 pb-2">
          <Button
            onClick={handlePlayAll}
            disabled={!trending.length}
            size="lg"
            leftIcon={<Play className="w-4 h-4 fill-current" />}
          >
            Play the whole feed
          </Button>
        </div>
      </motion.div>

      {isError && pageError ? (
        <EmptyState
          icon={pageError.icon}
          title={pageError.title}
          description={pageError.description}
          action={
            <Button onClick={() => refetch()} size="md">
              Try again
            </Button>
          }
        />
      ) : !isLoading && trending.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="The feed is quiet"
          description="Nothing is trending right now. Try again in a few minutes."
          action={
            <Button onClick={() => refetch()} size="md" variant="secondary">
              Refresh
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={staggerChildren(0.025)}
          initial="initial"
          animate="animate"
          className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-[2.5rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">
            <span className="text-center">№</span>
            <span aria-hidden />
            <span>Title</span>
            <span className="hidden md:block text-right">Plays</span>
            <span className="w-8" aria-hidden />
            <span className="text-right">
              <Clock className="w-3.5 h-3.5 inline" />
            </span>
          </div>

          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <TrendingRowSkeleton key={i} />)
            : trending.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <motion.div
                    variants={fadeUp}
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={cn(
                      'group grid grid-cols-[2.5rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3.5',
                      'items-center cursor-pointer transition-colors border-b border-white/[0.05] last:border-0',
                      isCurrent ? 'bg-track/[0.08]' : 'hover:bg-white/[0.035]',
                    )}
                  >
                    {/* Ordinal number — italic serif, editorial */}
                    <span className="flex justify-center items-center">
                      {isCurrent && isPlaying ? (
                        <NowPlayingBars />
                      ) : (
                        <span
                          className={cn(
                            'font-display italic text-2xl leading-none tabular-nums',
                            isCurrent ? 'text-accent' : 'text-ink-3 group-hover:text-ink',
                          )}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      )}
                    </span>

                    {/* Artwork */}
                    <div className="relative">
                      <SmartImage
                        src={track.thumbnail}
                        alt={track.title}
                        kind="track"
                        rounded="rounded-sharp"
                        className="w-12 h-12 ring-1 ring-white/10"
                        imgClassName="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-sharp">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>

                    {/* Title + artist */}
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
                        by {track.artist || 'Unknown artist'}
                      </p>
                    </div>

                    {/* Plays */}
                    <span className="hidden md:block w-20 text-right font-mono text-[12px] text-ink-3 tabular-nums tracking-tight">
                      {formatPlays(track.plays)}
                    </span>

                    {/* Heart */}
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-8 flex justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HeartButton track={track} size="sm" />
                    </div>

                    {/* Duration */}
                    <span className="w-12 text-right font-mono text-[12px] text-ink-4 tabular-nums tracking-tight">
                      {track.duration}
                    </span>
                  </motion.div>
                );
              })}
        </motion.div>
      )}

      {/* End-of-feed marker */}
      {!isLoading && !isError && trending.length > 0 ? (
        <div className="mt-10 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
          <span className="flex-1 h-px bg-white/[0.08]" />
          <span>End of trending · {trending.length} tracks</span>
          <span className="flex-1 h-px bg-white/[0.08]" />
        </div>
      ) : null}
    </div>
  );
};

export default TrendingPage;
