import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Loader2, ChevronRight, BarChart3 } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import Tabs from '@/components/ui-v2/Tabs';
import Button from '@/components/ui-v2/Button';
import Skeleton from '@/components/ui-v2/Skeleton';
import EmptyState from '@/components/ui-v2/EmptyState';
import SmartImage from '@/components/SmartImage';
import ChartsTabs from '@/components/charts/ChartsTabs';
import { getChartsArtists, getArtist } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { useArtistPrefetchProps } from '@/hooks/use-route-prefetch';
import { usePageError } from '@/hooks/use-page-error';
import { formatPlays } from '@/lib/player-format';
import { fadeUp, staggerChildren } from '@/design/motion';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';

// Region/window options mirror the songs chart. Duplicated rather than
// imported from ChartsPage so the two pages stay decoupled — if one needs to
// diverge later (e.g. a region the artists endpoint doesn't yet support),
// neither has to wait for the other.
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

const VALID_REGIONS = new Set(REGIONS.map((r) => r.id));
const VALID_WINDOWS = new Set(WINDOWS.map((w) => w.id));

const ArtistRowSkeleton = () => (
  <div className="grid grid-cols-[3rem_3rem_1fr_auto_auto] gap-4 px-4 py-3.5 items-center border-b border-white/[0.05] last:border-0">
    <Skeleton className="h-7 w-6 mx-auto" />
    <Skeleton className="w-12 h-12 rounded-full" />
    <div>
      <Skeleton className="h-4 w-1/3 mb-2" />
      <Skeleton className="h-3 w-1/5" />
    </div>
    <Skeleton className="w-8 h-8 rounded-full" />
    <Skeleton className="w-4 h-4" />
  </div>
);

const ChartsArtistsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { playTracksInOrder } = usePlayer();
  const { masthead } = useEditorialMeta();

  // Region + window persist to the URL so deep links keep selections.
  const [searchParams, setSearchParams] = useSearchParams();
  const region = VALID_REGIONS.has(searchParams.get('region'))
    ? searchParams.get('region')
    : 'global';
  const chartWindow = VALID_WINDOWS.has(searchParams.get('window'))
    ? searchParams.get('window')
    : 'weekly';
  const setRegion = (next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'global') params.delete('region');
      else params.set('region', next);
      return params;
    }, { replace: true });
  };
  const setChartWindow = (next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'weekly') params.delete('window');
      else params.set('window', next);
      return params;
    }, { replace: true });
  };

  const {
    data: chartsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.chartsArtists(region, chartWindow, 50),
    queryFn: () => getChartsArtists({ region, window: chartWindow, limit: 50 }),
    ...cachePolicy.chartsArtists,
    placeholderData: keepPreviousData,
  });
  const pageError = usePageError(error, { resource: 'the artist chart' });

  const artists = useMemo(() => {
    if (Array.isArray(chartsResponse)) return chartsResponse;
    if (Array.isArray(chartsResponse?.items)) return chartsResponse.items;
    return [];
  }, [chartsResponse]);

  const meta = chartsResponse?.meta || null;
  const isLiveSource = meta?.source === 'live';

  // Per-row spinner state for the inline Play button. Tracks which artist
  // id is mid-fetch so we don't re-fire on rapid double-clicks.
  const [loadingPlayId, setLoadingPlayId] = useState(null);

  const regionLabel = REGIONS.find((r) => r.id === region)?.label || 'Global';
  const windowLabel = WINDOWS.find((w) => w.id === chartWindow)?.label || 'This week';

  const goToArtist = (a) => {
    const slug = a.humanSlug || a.slug;
    if (slug) navigate(`/artist/${slug}`);
  };

  const handlePlay = async (a) => {
    if (loadingPlayId) return;
    const slug = a.slug || a.humanSlug;
    if (!slug) {
      notify.error("Couldn't find that artist");
      return;
    }
    setLoadingPlayId(a.id);
    try {
      // Share cache with the ArtistPage so the subsequent route is instant.
      const detail = await queryClient.fetchQuery({
        queryKey: queryKeys.artist(slug),
        queryFn: () => getArtist(slug),
        ...cachePolicy.artist,
      });
      const tracks = detail?.topTracks || [];
      if (tracks.length === 0) {
        notify.error(`No tracks available for ${a.name}`);
        return;
      }
      playTracksInOrder(tracks, { replaceQueue: true, forceSequential: false });
      notify.info(`Playing · ${a.name}`);
    } catch (err) {
      notify.error(`Couldn't start ${a.name}`);
      console.error('[ChartsArtistsPage] play failed', a.slug, err);
    } finally {
      setLoadingPlayId(null);
    }
  };

  return (
    <div className="p-5 md:p-10 max-w-[1600px] mx-auto pb-12">
      {/* Section tabs */}
      <ChartsTabs className="mb-6" />

      {/* Editorial masthead */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
      >
        <span>{masthead}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink-3">✦</span>
          <span>The Octavia Daily · Artists</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Top 50</span>
      </div>

      {/* Page header */}
      <motion.div
        {...fadeUp}
        className="mb-10 grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-end"
      >
        <div>
          <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
            <span className="w-6 h-px bg-track" />
            Top 50 · Artists
          </p>
          <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
            <span>
              The artists,{' '}
              <em className="font-editorial text-track not-italic">ranked.</em>
            </span>
          </h1>
          <p className="font-editorial text-[15px] text-ink-3 mt-4 max-w-xl leading-snug">
            Who the world is listening to right now —{' '}
            <em>{regionLabel.toLowerCase()}</em>,{' '}
            <em>{windowLabel.toLowerCase()}</em>.
          </p>
          {meta?.source ? (
            <p
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4"
              aria-live="polite"
            >
              <span
                className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full',
                  isLiveSource ? 'bg-success' : 'bg-amber-400/80',
                )}
                aria-hidden="true"
              />
              {isLiveSource ? 'Live data' : `Curated · ${meta.source}`}
            </p>
          ) : null}
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
      ) : !isLoading && artists.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={`No artist chart for ${regionLabel.toLowerCase()} \u00b7 ${windowLabel.toLowerCase()}`}
          description="Try a different region or time window — or refresh in a moment."
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
          <div className="grid grid-cols-[3rem_3rem_1fr_auto_auto] gap-4 px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">
            <span className="text-center">Rank</span>
            <span aria-hidden="true" />
            <span>Artist</span>
            <span className="w-8" aria-hidden="true" />
            <span className="w-4" aria-hidden="true" />
          </div>

          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <ArtistRowSkeleton key={i} />)
            : artists.map((a) => (
                <ChartsArtistRow
                  key={a.id}
                  artist={a}
                  onOpen={() => goToArtist(a)}
                  onPlay={() => handlePlay(a)}
                  loading={loadingPlayId === a.id}
                />
              ))}
        </motion.div>
      )}

      {/* End-of-chart marker */}
      {!isLoading && !isError && artists.length > 0 ? (
        <div className="mt-10 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
          <span className="flex-1 h-px bg-white/[0.08]" />
          <span>
            End of chart · {artists.length} artists ranked · {regionLabel} · {windowLabel}
          </span>
          <span className="flex-1 h-px bg-white/[0.08]" />
        </div>
      ) : null}
    </div>
  );
};

// Row is its own component so the artist-detail prefetch hook can run per-row
// without pulling the (variable-length) artist list through React's hooks
// rules in the parent.
const ChartsArtistRow = ({ artist, onOpen, onPlay, loading }) => {
  const prefetchProps = useArtistPrefetchProps(artist.humanSlug || artist.slug);
  const tracksLabel =
    typeof artist.tracks === 'number'
      ? `${artist.tracks} ${artist.tracks === 1 ? 'track' : 'tracks'} on chart`
      : null;
  const playsLabel =
    Number.isFinite(artist.plays) && artist.plays > 0
      ? `${formatPlays(artist.plays)} plays`
      : null;
  const meta = [tracksLabel, playsLabel].filter(Boolean).join(' · ');

  return (
    <motion.div
      variants={fadeUp}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      {...prefetchProps}
      className="group grid grid-cols-[3rem_3rem_1fr_auto_auto] gap-4 px-4 py-3.5 items-center cursor-pointer transition-colors border-b border-white/[0.05] last:border-0 hover:bg-white/[0.035] focus-ring"
    >
      <div className="text-center">
        <p className="font-display italic text-[26px] leading-none tabular-nums text-ink">
          {artist.rank}
        </p>
      </div>
      <SmartImage
        src={artist.thumbnail}
        alt=""
        kind="artist"
        rounded="rounded-full"
        className="w-12 h-12 ring-1 ring-white/10"
        imgClassName="object-cover"
      />
      <div className="min-w-0">
        <h4 className="text-[14px] font-medium truncate text-ink">{artist.name}</h4>
        {meta ? (
          <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
            {meta}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!loading) onPlay();
        }}
        disabled={loading}
        aria-label={loading ? `Loading ${artist.name}` : `Play ${artist.name}`}
        className={cn(
          'w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors focus-ring',
          'bg-white/[0.04] border border-white/[0.08] text-ink-2',
          'hover:bg-track hover:text-track-fg hover:border-transparent',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          loading && 'opacity-100 cursor-wait',
        )}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current" />
        )}
      </button>
      <ChevronRight
        className="w-4 h-4 text-ink-4 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      />
    </motion.div>
  );
};

export default ChartsArtistsPage;
