import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import Button from '@/components/ui-v2/Button';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import SectionRule from '@/components/ui-v2/SectionRule';
import SmartImage from '@/components/SmartImage';
import HeroCard, { HeroSkeleton } from '@/components/home/HeroCard';
import HorizontalRail from '@/components/home/HorizontalRail';
import TileCard, { TileSkeleton } from '@/components/home/TileCard';
import ArtistCircle from '@/components/home/ArtistCircle';
import { getHomeFeed, isNetworkError } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { sanitizeTrack } from '@/lib/media-sanitize';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { useHomeSections } from '@/hooks/use-home-sections';

const TRENDING_LIMIT = 20;

const InlineIssue = ({ title, description, onRetry }) => (
  <div className="rounded-soft border border-white/[0.08] bg-surface-2/40 p-5 md:p-6">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-track mt-0.5" />
      <div>
        <h3 className="font-display text-xl text-ink leading-tight">{title}</h3>
        <p className="font-editorial text-sm text-ink-3 mt-2 max-w-xl">{description}</p>
        {onRetry ? (
          <Button
            variant="editorial"
            className="mt-4"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  </div>
);

const HomePage = () => {
  const queryClient = useQueryClient();
  const { history, playTrack, currentTrack } = usePlayer();
  const { list: favorites } = useFavorites();
  const { settings } = useSettings();

  const { greeting, masthead, issueNum } = useEditorialMeta({ includeGreeting: true });
  const firstName = (settings.displayName || '').split(' ')[0] || 'there';

  const homeQuery = useQuery({
    queryKey: queryKeys.homeFeed(TRENDING_LIMIT),
    queryFn: () => getHomeFeed({ limit: TRENDING_LIMIT }),
    ...cachePolicy.homeFeed,
  });

  const featured = homeQuery.data?.featured ?? [];
  const trending = homeQuery.data?.trending ?? [];

  useEffect(() => {
    if (trending.length > 0) {
      queryClient.setQueryData(queryKeys.trending(TRENDING_LIMIT), trending);
    }
  }, [queryClient, trending]);

  const { hero, trendingPreview, dailyMixes, topArtists, ordinals } = useHomeSections({
    featured,
    trending,
    history,
    favorites,
  });

  const backendOffline = homeQuery.isError && isNetworkError(homeQuery.error);
  const heroTrack = sanitizeTrack(hero?.track, { requirePlayable: true });

  return (
    <div className="p-5 md:p-10 max-w-[1600px] mx-auto">
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
            title="Catalog service is unreachable"
            description="Home cannot reach the backend right now. Check your API/CORS configuration and try again."
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
                <div className="w-full min-w-[320px] max-w-2xl">
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
                  <div className="w-full min-w-[280px] rounded-sharp border border-white/[0.08] p-5">
                    <p className="font-editorial text-sm text-ink-3">
                      No trending tracks are available right now.
                    </p>
                  </div>
                  )}
        </HorizontalRail>
      </section>

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
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
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

      <SectionRule
        ordinal={ordinals.dailyMixes && ordinals.topArtists ? '05' : '04'}
        label="The world today"
        tone="accent"
        className="mb-6"
      />
      <section className="mb-12">
        <Link
          to="/charts"
          className="relative block rounded-soft overflow-hidden p-7 md:p-10 group focus-ring ring-1 ring-white/[0.07] hover:ring-track/40 transition-all duration-med"
          style={{
            background:
              'radial-gradient(ellipse 80% 100% at 0% 0%, hsl(var(--track-accent) / 0.30), transparent 60%), radial-gradient(ellipse 60% 60% at 100% 100%, hsl(var(--oxblood) / 0.50), transparent 60%), hsl(var(--surface-2))',
          }}
        >
          <div className="relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-accent" strokeWidth={2} />
                <span className="eyebrow eyebrow-accent">What the world plays</span>
              </div>
              <p className="font-display text-3xl md:text-[44px] text-ink leading-[1.02] tracking-tight">
                Millions of listeners <br />
                <span className="font-editorial text-bone">shape the charts every day.</span>
              </p>
              <p className="font-editorial text-[14px] text-ink-2 mt-4 max-w-md leading-relaxed body-pretty">
                Charts update every hour — sorted by region, genre, and the window of time that
                matters to you.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="eyebrow text-ink-3">Open the charts</span>
              <ArrowRight className="w-5 h-5 text-ink-3 group-hover:text-accent group-hover:translate-x-1 transition-all duration-short" />
            </div>
          </div>
        </Link>
      </section>

      <div className="mt-16 pt-6 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
        <span>End of feed · {masthead}</span>
        <span className="hidden md:inline">Octavia · An editorial product</span>
      </div>

      {history.length === 0 && favorites.length === 0 ? (
        <p className="font-editorial text-[13px] text-ink-3 text-center mt-6">
          Like a few songs and the page will tailor itself to your taste.
        </p>
      ) : null}
    </div>
  );
};

export default HomePage;
