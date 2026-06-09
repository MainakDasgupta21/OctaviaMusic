import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import Button from '@/components/ui-v2/Button';
import EmptyState from '@/components/ui-v2/EmptyState';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import HeroCard, { HeroSkeleton } from '@/components/home/HeroCard';
import HorizontalRail from '@/components/home/HorizontalRail';
import TileCard, { TileSkeleton } from '@/components/home/TileCard';
import ArtistCircle from '@/components/home/ArtistCircle';
import DiscoverRibbon from '@/components/home/DiscoverRibbon';
import SpotlightArtist, {
  SpotlightArtistSkeleton,
} from '@/components/home/SpotlightArtist';
import WorldStrip from '@/components/home/WorldStrip';
import {
  getArtist,
  getCharts,
  getExploreRadio,
  getGenres,
  getHomeFeed,
  isNetworkError,
} from '@/lib/api';
import { usePageError } from '@/hooks/use-page-error';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { sanitizeTrack } from '@/lib/media-sanitize';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { useHomeSections } from '@/hooks/use-home-sections';
import { EXPLORE_MOODS } from '@/lib/explore-recommendations';
import notify from '@/lib/notify';
import {
  addSurpriseSeenTrack,
  buildSurpriseSeed,
  filterUnseenSurpriseTracks,
  getSurpriseSeenSet,
  pickRandomItem,
  shuffleRandomItems,
  surpriseTrackId,
} from '@/lib/surprise-random';
import { cn } from '@/lib/utils';

// Bumped from 20 → 40 so Home can carve a deeper "Rising now" rail (rows
// 21-40) on top of the existing Top 12 + Fresh finds rails. The unified
// `/api/home` endpoint clamps to 100 so the higher ask is safe.
const TRENDING_LIMIT = 40;
const CHARTS_FETCH_LIMIT = 50;
const CHARTS_RAIL_LIMIT = 12;
const HOME_SURPRISE_FETCH_LIMIT = 60;
const HOME_SURPRISE_FETCH_ATTEMPTS = 3;

// Inline error block that picks up the same visual voice as `EmptyState`
// (so Home matches Charts / Trending / Artist / Album), with an optional
// retry action and a sensible icon for the network-offline case.
const InlineIssue = ({
  title,
  description,
  icon: Icon = AlertTriangle,
  onRetry,
}) => (
  <div className="rounded-soft border border-white/[0.08] bg-surface-2/40 backdrop-blur-md">
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : null
      }
      className="py-10"
    />
  </div>
);

const HomePage = () => {
  const queryClient = useQueryClient();
  const { history, playTrack, playTracksInOrder, currentTrack } = usePlayer();
  const { list: favorites } = useFavorites();
  const { settings } = useSettings();
  const [homeSurpriseLoading, setHomeSurpriseLoading] = useState(false);

  const { greeting, masthead, issueNum } = useEditorialMeta({ includeGreeting: true });
  const firstName = (settings.displayName || '').split(' ')[0] || 'there';

  const homeQuery = useQuery({
    queryKey: queryKeys.homeFeed(TRENDING_LIMIT),
    queryFn: ({ signal }) => getHomeFeed({ limit: TRENDING_LIMIT, signal }),
    ...cachePolicy.homeFeed,
  });

  const chartsKey = queryKeys.charts('global', 'this_week', CHARTS_FETCH_LIMIT);
  const hasWarmGenresCache = Boolean(queryClient.getQueryData(queryKeys.genres()));
  const hasWarmChartsCache = Boolean(queryClient.getQueryData(chartsKey));
  const shouldDeferSecondaryQueries =
    homeQuery.isPending && !homeQuery.data && !hasWarmGenresCache && !hasWarmChartsCache;

  // Genres feed the on-Home "Browse genres" rail. Independent query so it
  // caches & retries on its own without coupling to the home feed.
  const genresQuery = useQuery({
    queryKey: queryKeys.genres(),
    queryFn: ({ signal }) => getGenres({ signal }),
    enabled: !shouldDeferSecondaryQueries || hasWarmGenresCache,
    ...cachePolicy.genres,
  });

  // Top Charts rail — distinct from "trending". Charts give us the absolute
  // most-played list, ordered by rank. /api/charts returns { items, meta }.
  const chartsQuery = useQuery({
    queryKey: chartsKey,
    queryFn: ({ signal }) =>
      getCharts({
        region: 'global',
        window: 'this_week',
        limit: CHARTS_FETCH_LIMIT,
        signal,
      }),
    enabled: !shouldDeferSecondaryQueries || hasWarmChartsCache,
    select: (payload) => ({
      ...payload,
      items: Array.isArray(payload?.items)
        ? payload.items.slice(0, CHARTS_RAIL_LIMIT)
        : [],
    }),
    ...cachePolicy.charts,
  });

  const featured = homeQuery.data?.featured ?? [];
  const trending = homeQuery.data?.trending ?? [];
  const charts = chartsQuery.data?.items ?? [];
  const genres = genresQuery.data ?? [];
  const homeSurpriseLocalPool = useMemo(() => {
    const merged = [...trending, ...charts, ...featured];
    const seen = new Set();
    return merged.filter((track) => {
      const trackId = surpriseTrackId(track);
      if (!trackId || seen.has(trackId)) return false;
      seen.add(trackId);
      return true;
    });
  }, [trending, charts, featured]);

  useEffect(() => {
    if (trending.length > 0) {
      queryClient.setQueryData(queryKeys.trending(TRENDING_LIMIT), trending);
    }
  }, [queryClient, trending]);

  const {
    hero,
    trendingPreview,
    freshFinds,
    risingNow,
    spotlightSeed,
    dailyMixes,
    topArtists,
    coldStart,
    ordinals,
  } = useHomeSections({
    featured,
    trending,
    charts,
    history,
    favorites,
  });

  useEffect(() => {
    if (!spotlightSeed?.slug) return;
    queryClient
      .prefetchQuery({
        queryKey: queryKeys.artist(spotlightSeed.slug),
        queryFn: ({ signal }) => getArtist(spotlightSeed.slug, { signal }),
        ...cachePolicy.artist,
      })
      .catch(() => {
        /* best-effort prefetch; spotlight query retries on render */
      });
  }, [queryClient, spotlightSeed?.slug]);

  // Spotlight artist — only fetched once we have a seed with a resolvable
  // slug. The `enabled` guard prevents a wasted call before charts/trending
  // arrive. Uses the same cache policy as ArtistPage so a follow-up visit
  // to /artist/<slug> hits a warm cache.
  const spotlightArtistQuery = useQuery({
    queryKey: queryKeys.artist(spotlightSeed?.slug || ''),
    queryFn: ({ signal }) => getArtist(spotlightSeed.slug, { signal }),
    enabled: Boolean(spotlightSeed?.slug),
    ...cachePolicy.artist,
  });

  const spotlightArtist = spotlightArtistQuery.data;
  const showSpotlight =
    Boolean(spotlightSeed?.slug) && (spotlightArtistQuery.isLoading || spotlightArtist?.topTracks?.length >= 3);

  const backendOffline = homeQuery.isError && isNetworkError(homeQuery.error);
  const pageError = usePageError(homeQuery.error, { resource: 'the home feed' });
  const heroTrack = sanitizeTrack(hero?.track, { requirePlayable: true });
  const handleHomeSurprise = useCallback(async () => {
    if (homeSurpriseLoading) return;
    setHomeSurpriseLoading(true);
    try {
      let pick = null;

      for (let attempt = 0; attempt < HOME_SURPRISE_FETCH_ATTEMPTS; attempt += 1) {
        const randomMood = pickRandomItem(EXPLORE_MOODS);
        const randomGenre = pickRandomItem(genres);
        try {
          const radio = await getExploreRadio({
            mood: randomMood?.id || '',
            genre: randomGenre?.label || '',
            seed: buildSurpriseSeed(),
            diversity: 'high',
            limit: HOME_SURPRISE_FETCH_LIMIT,
          });
          const fetchedItems = Array.isArray(radio?.items) ? radio.items : [];
          const unseenFromFetch = filterUnseenSurpriseTracks(
            shuffleRandomItems(fetchedItems),
            { seenSet: getSurpriseSeenSet() },
          );
          pick = pickRandomItem(unseenFromFetch);
          if (pick) break;
        } catch {
          /* retry with fresh surprise seed */
        }
      }

      if (!pick) {
        const unseenLocalPool = filterUnseenSurpriseTracks(homeSurpriseLocalPool, {
          seenSet: getSurpriseSeenSet(),
        });
        pick = pickRandomItem(shuffleRandomItems(unseenLocalPool));
      }

      if (!pick) {
        notify.info('No new surprise songs left this session. Try again later.');
        return;
      }

      addSurpriseSeenTrack(pick);
      playTrack(pick);
    } finally {
      setHomeSurpriseLoading(false);
    }
  }, [homeSurpriseLoading, genres, homeSurpriseLocalPool, playTrack]);

  return (
    <div className="page-shell pt-5 md:pt-10">
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
      >
        <span>{masthead}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink-3">✦</span>
          <span>The Octavia Daily</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Vol. 01 · No. {issueNum}</span>
      </div>

      <motion.div
        {...fadeUp}
        className="mb-10 grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-end"
      >
        <div>
          <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
            <span className="w-6 h-px bg-track" />
            {greeting}, {firstName}
          </p>
          <h1 className="font-display text-display-xl text-ink leading-[0.92] headline-balance">
            Today, the music <span className="font-editorial text-track">listens back.</span>
          </h1>
        </div>
        <div className="hidden md:flex items-baseline gap-3 pb-2">
          <span className="editorial-num text-7xl">{issueNum}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 pb-2">
            Issue
          </span>
        </div>
      </motion.div>

      {backendOffline ? (
        <div className="mb-8">
          <InlineIssue
            icon={WifiOff}
            title={pageError?.title || "You're offline"}
            description={
              pageError?.description ||
              'Home cannot reach the backend right now. Check your connection and try again.'
            }
            onRetry={() => homeQuery.refetch()}
          />
        </div>
      ) : null}

      <div className="mb-14">
        {homeQuery.isLoading && !homeQuery.data ? (
          <HeroSkeleton />
        ) : homeQuery.isError && !hero ? (
          <InlineIssue
            title="Featured section unavailable"
            description="We could not load today's cover story. Retry to fetch the latest feature."
            onRetry={() => homeQuery.refetch()}
          />
        ) : hero ? (
          <HeroCard
            feature={hero}
            issueNum={issueNum}
            isPlayable={Boolean(heroTrack)}
            onPlay={() => {
              if (heroTrack) playTrack(heroTrack);
            }}
          />
        ) : (
          <InlineIssue
            title="No feature available yet"
            description="No editorial feature is currently available. Please check back shortly."
          />
        )}
      </div>

      <DiscoverRibbon
        trending={trending}
        onPlayTrack={playTrack}
        onPlayTracks={playTracksInOrder}
        onSurprise={handleHomeSurprise}
        surpriseLoading={homeSurpriseLoading}
        isLoading={homeQuery.isLoading && !homeQuery.data}
      />

      {coldStart ? <ColdStartRail /> : null}

      <GenresRail
        genres={genres}
        isLoading={genresQuery.isLoading && !genresQuery.data}
        isError={genresQuery.isError && genres.length === 0}
        onRetry={() => genresQuery.refetch()}
      />

      {showSpotlight ? (
        spotlightArtistQuery.isLoading && !spotlightArtist ? (
          <SpotlightArtistSkeleton />
        ) : (
          <SpotlightArtist
            artist={spotlightArtist}
            fallbackImage={spotlightSeed?.sample}
            onPlayTrack={playTrack}
            onPlayAll={(tracks) =>
              playTracksInOrder(tracks, { replaceQueue: true, forceSequential: false })
            }
          />
        )
      ) : null}

      {history.length > 0 && (
        <section className="mb-14" aria-labelledby="home-jump-back-in">
          <SectionHeader
            id="home-jump-back-in"
            ordinal={ordinals.history}
            eyebrow="Continued"
            title="Pick up where you left off"
            subtitle="Recent tracks, ready to resume — exactly where the needle lifted."
            to="/library"
          />
          <HorizontalRail ariaLabel="Recently played tracks">
            {history.slice(0, 12).map((track, index) => (
              <TileCard
                key={track.id}
                track={track}
                index={index}
                onPlay={() => playTrack(track)}
                isCurrent={currentTrack?.id === track.id}
              />
            ))}
          </HorizontalRail>
        </section>
      )}

      <section className="mb-14" aria-labelledby="home-trending">
        <SectionHeader
          id="home-trending"
          ordinal={ordinals.trending}
          eyebrow="Trending"
          title="The world's on rotation"
          subtitle="Hot tracks rising right now, refreshed every hour."
          to="/trending"
        />
        <HorizontalRail ariaLabel="Trending tracks">
          {homeQuery.isLoading && !homeQuery.data
            ? Array.from({ length: 8 }).map((_, index) => <TileSkeleton key={index} />)
            : homeQuery.isError && trendingPreview.length === 0
              ? (
                <div className="w-full min-w-[min(320px,100%)] max-w-2xl">
                  <InlineIssue
                    title="Trending feed unavailable"
                    description="Trending tracks could not be loaded. Retry to reconnect."
                    onRetry={() => homeQuery.refetch()}
                  />
                </div>
                )
              : trendingPreview.length > 0
                ? trendingPreview.map((track, index) => (
                    <TileCard
                      key={track.id}
                      track={track}
                      index={index}
                      onPlay={() => playTrack(track)}
                      isCurrent={currentTrack?.id === track.id}
                    />
                  ))
                : (
                  <div className="w-full min-w-[min(280px,100%)] rounded-sharp border border-white/[0.08] p-5">
                    <p className="font-editorial text-sm text-ink-3">
                      No trending tracks are available right now.
                    </p>
                  </div>
                  )}
        </HorizontalRail>
      </section>

      {(chartsQuery.isLoading || charts.length > 0 || chartsQuery.isError) && (
        <section className="mb-14" aria-labelledby="home-top-charts">
          <SectionHeader
            id="home-top-charts"
            ordinal={ordinals.topCharts}
            eyebrow="Top Charts"
            title="The biggest songs right now"
            subtitle="Ranked by total plays across the week."
            to="/charts"
          />
          <HorizontalRail ariaLabel="Top chart tracks">
            {chartsQuery.isLoading && charts.length === 0
              ? Array.from({ length: 8 }).map((_, index) => <TileSkeleton key={index} />)
              : chartsQuery.isError && charts.length === 0
                ? (
                  <div className="w-full min-w-[min(320px,100%)] max-w-2xl">
                    <InlineIssue
                      title="Charts unavailable"
                      description="The charts feed could not be loaded. Retry to reconnect."
                      onRetry={() => chartsQuery.refetch()}
                    />
                  </div>
                  )
                : charts.map((track, index) => (
                    <TileCard
                      key={track.id}
                      track={track}
                      index={index}
                      onPlay={() => playTrack(track)}
                      isCurrent={currentTrack?.id === track.id}
                    />
                  ))}
          </HorizontalRail>
        </section>
      )}

      {freshFinds.length > 0 && (
        <section className="mb-14" aria-labelledby="home-fresh-finds">
          <SectionHeader
            id="home-fresh-finds"
            ordinal={ordinals.freshFinds}
            eyebrow="Fresh finds"
            title="Stranger to your ear"
            subtitle="The next slice of the rotation — picks the Top 12 didn't cover."
            to="/trending"
          />
          <HorizontalRail ariaLabel="Fresh finds tracks">
            {freshFinds.map((track, index) => (
              <TileCard
                key={track.id}
                track={track}
                index={index + 12}
                onPlay={() => playTrack(track)}
                isCurrent={currentTrack?.id === track.id}
              />
            ))}
          </HorizontalRail>
        </section>
      )}

      {risingNow.length > 0 && (
        <section className="mb-14" aria-labelledby="home-rising-now">
          <SectionHeader
            id="home-rising-now"
            ordinal={ordinals.risingNow}
            eyebrow="Rising now"
            title="Gaining steam this hour"
            subtitle="Tracks the rotation is starting to lean on — twenty more, refreshed live."
            to="/trending"
          />
          <HorizontalRail ariaLabel="Rising now tracks">
            {risingNow.map((track, index) => (
              <TileCard
                key={track.id}
                track={track}
                index={index + 20}
                onPlay={() => playTrack(track)}
                isCurrent={currentTrack?.id === track.id}
              />
            ))}
          </HorizontalRail>
        </section>
      )}

      {dailyMixes.length > 0 && (
        <section className="mb-14" aria-labelledby="home-daily-mixes">
          <SectionHeader
            id="home-daily-mixes"
            ordinal={ordinals.dailyMixes}
            eyebrow="Made for you"
            title="The mixes that know your habits"
            subtitle="Built from your listening history. Open one to keep the mood going."
            to="/explore"
          />
          <motion.div
            variants={staggerChildren(0.05)}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
          >
            {dailyMixes.map((mix, index) => (
              <motion.div variants={fadeUp} key={mix.id} className="relative">
                <Link
                  to={mix.to}
                  className="relative block aspect-square rounded-sharp overflow-hidden lift press focus-ring group"
                  style={{
                    boxShadow:
                      'inset 0 1px 0 hsl(var(--ink-primary)/0.07), var(--shadow-2), inset 0 0 0 1px hsl(var(--ink-primary)/0.05)',
                  }}
                >
                  <SmartImage
                    src={mix.thumbnail}
                    alt={mix.label}
                    loading="lazy"
                    rounded="rounded-none"
                    className="absolute inset-0 w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <span
                    aria-hidden="true"
                    className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.2em] text-white/70"
                  >
                    №{String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4 pr-12">
                    <p className="font-display text-xl leading-tight text-white">{mix.label}</p>
                    <p className="font-editorial text-[12px] text-white/70 truncate mt-0.5">
                      built around {mix.artist}
                    </p>
                  </div>
                  <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/35 border border-white/20 text-white/80 group-hover:text-white flex items-center justify-center">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {topArtists.length > 0 && (
        <section className="mb-14" aria-labelledby="home-top-artists">
          <SectionHeader
            id="home-top-artists"
            ordinal={ordinals.topArtists}
            eyebrow="Your rotation"
            title="The voices in your year"
            subtitle="Aggregated from your recent listening history."
          />
          <HorizontalRail ariaLabel="Your top artists">
            {topArtists.map((artist) => (
              <ArtistCircle
                key={artist.key}
                artist={artist.artist}
                sample={artist.sample}
                slug={artist.slug}
              />
            ))}
          </HorizontalRail>
        </section>
      )}

      <WorldStrip
        onPlayTracks={(tracks, opts) => playTracksInOrder(tracks, opts)}
      />

      <div className="mt-16 pt-6 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
        <span>End of feed · {masthead}</span>
        <span className="hidden md:inline">Octavia · An editorial product</span>
      </div>
    </div>
  );
};

// ColdStartRail — three "starter destinations" for first-time visitors.
// Renders directly under DiscoverRibbon (which already covers moods + play
// actions), so this block intentionally focuses on browseable destinations
// (Trending, Charts, Genres). Search is deliberately omitted — the entire
// goal of this row is "discover without typing".
const COLD_START_STARTERS = [
  {
    id: 'starter-trending',
    to: '/trending',
    eyebrow: 'Right now',
    title: 'Trending Top 20',
    subtitle: "What everyone's playing this hour",
  },
  {
    id: 'starter-charts',
    to: '/charts',
    eyebrow: 'Established',
    title: 'The Top 50 chart',
    subtitle: 'Region-by-region, week over week',
  },
  {
    id: 'starter-genres',
    to: '/genres',
    eyebrow: 'Browse',
    title: 'The atlas of genres',
    subtitle: 'Pick a feel, dive in head-first',
  },
];

const ColdStartRail = () => (
  <section className="mb-14" aria-labelledby="home-first-stop">
    <div className="flex items-end justify-between mb-5 gap-4">
      <div>
        <p className="eyebrow eyebrow-accent mb-2 inline-flex items-center gap-2">
          <Sparkles className="w-3 h-3" /> First stop
        </p>
        <h2
          id="home-first-stop"
          className="font-display text-2xl md:text-3xl text-ink leading-tight"
        >
          Three doorways in.
        </h2>
      </div>
    </div>

    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
      {COLD_START_STARTERS.map((p) => (
        <Link
          key={p.id}
          to={p.to}
          className="group block rounded-sharp border border-white/[0.08] bg-surface-2/40 backdrop-blur-md p-5 hover:border-white/25 hover:bg-surface-2/60 focus-ring transition-all"
        >
          <p className="eyebrow text-ink-3 mb-2">{p.eyebrow}</p>
          <h3 className="font-display text-xl text-ink leading-tight group-hover:text-accent transition-colors">
            {p.title}
          </h3>
          <p className="font-editorial text-[13px] text-ink-3 mt-2 leading-snug">
            {p.subtitle}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-3 group-hover:text-accent transition-colors">
            Open
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      ))}
    </div>
  </section>
);

// GenresRail — six genre tiles drawn from /api/genres. Always visible on
// Home so a brand-new user can jump into a corner of music with one tap.
const GenresRail = ({ genres = [], isLoading, isError, onRetry }) => {
  if (isError) {
    return (
      <section className="mb-14" aria-labelledby="home-genres">
        <SectionHeader
          id="home-genres"
          eyebrow="Browse"
          title="The atlas of genres"
          subtitle="Pick a feel, dive in head-first."
          to="/genres"
        />
        <InlineIssue
          title="Genres unavailable"
          description="We couldn't reach the genre catalog. Try again in a moment."
          onRetry={onRetry}
        />
      </section>
    );
  }

  return (
    <section className="mb-14" aria-labelledby="home-genres">
      <SectionHeader
        id="home-genres"
        eyebrow="Browse"
        title="The atlas of genres"
        subtitle="Pick a feel, dive in head-first."
        to="/genres"
      />
      <motion.div
        variants={staggerChildren(0.04)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[5/3] rounded-sharp" />
            ))
          : genres.slice(0, 6).map((g) => (
              <motion.div variants={fadeUp} key={g.id}>
                <Link
                  to={`/genres?genre=${g.id}`}
                  className="relative block aspect-[5/3] rounded-sharp overflow-hidden p-4 border border-white/[0.08] hover:border-white/25 focus-ring transition-colors group"
                >
                  {g.thumbnail ? (
                    <SmartImage
                      src={g.thumbnail}
                      alt=""
                      kind="genre"
                      rounded="rounded-none"
                      className="absolute inset-0 w-full h-full opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-long ease-emphasis"
                      imgClassName="object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        'absolute inset-0 bg-gradient-to-br opacity-80',
                        g.from || 'from-violet-500/40',
                        g.to || 'to-fuchsia-700/40',
                      )}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
                  <div className="relative">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                      Genre
                    </p>
                    <p className="font-display text-xl text-white drop-shadow mt-1">
                      {g.label}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
      </motion.div>
    </section>
  );
};

export default HomePage;
