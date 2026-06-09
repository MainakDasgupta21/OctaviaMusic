import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Shuffle,
  UserPlus,
  UserCheck,
  MoreHorizontal,
  Share2,
  Copy,
  Radio,
  Music2,
  User,
  ChevronDown,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFollowedArtists } from '@/contexts/FollowedArtistsContext';
import HeartButton from '@/components/HeartButton';
import AddToPlaylistButton from '@/components/playlist/AddToPlaylistButton';
import Button from '@/components/ui-v2/Button';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import EmptyState from '@/components/ui-v2/EmptyState';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getArtist } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { formatPlays } from '@/lib/player-format';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useHoverPrefetch } from '@/hooks/use-route-prefetch';
import { useScopedArtistAccent } from '@/hooks/use-color-extraction';
import { usePageError } from '@/hooks/use-page-error';
import { shuffleArray, shareOrCopy } from '@/lib/shuffle';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';

// =============================================================================
// Artist page — editorial profile.
// Vocabulary borrowed from AlbumPage: track-accent radial backdrop, masthead
// dateline, ornamented section headers, end-of-side marker. Plus artist-only
// affordances: scroll-driven sticky action bar, expand-on-demand top tracks,
// year-grouped discography.
//
// Data is constrained by `toArtistDetailDTO` (server/lib/mappers.js): name,
// cover/thumbnail, topTracks (≤8 w/ plays + duration), albums (LPs+singles,
// year-sorted). `verified` is always false, `monthly` and `bio` are null —
// no UI is wired for those today.
// =============================================================================

const POPULAR_INITIAL = 5;
const STICKY_TOP_PX = 60; // matches TopBar height (see src/components/layout/TopBar.jsx)

// Tiny equalizer used to mark the currently-playing row in Popular. Pattern
// from QueuePanel (src/components/player/QueuePanel.jsx lines 162-171).
const NowPlayingBars = () => (
  <span aria-hidden="true" className="inline-flex items-end gap-0.5 h-4">
    <span className="sidebar-playing-bar [animation-delay:-0.3s]" />
    <span className="sidebar-playing-bar [animation-delay:-0.15s]" />
    <span className="sidebar-playing-bar" />
  </span>
);

const ArtistPageSkeleton = () => (
  <div className="pb-12">
    {/* Hero */}
    <div className="page-shell-content pt-10 md:pt-14 pb-8">
      <Skeleton className="h-3 w-72 mb-8 hidden md:block" />
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10">
        <Skeleton className="w-44 h-44 md:w-56 md:h-56 rounded-soft" />
        <div className="flex-1 w-full text-center md:text-left">
          <Skeleton className="h-3 w-16 mb-3 mx-auto md:mx-0" />
          <Skeleton className="h-12 w-2/3 mb-4 mx-auto md:mx-0" />
          <Skeleton className="h-4 w-1/3 mx-auto md:mx-0" />
        </div>
      </div>
    </div>
    {/* Actions + stat strip */}
    <div className="page-shell-content mb-6 flex items-center gap-3">
      <Skeleton className="h-12 w-28 rounded-sharp" />
      <Skeleton className="h-12 w-28 rounded-sharp" />
      <Skeleton className="h-12 w-28 rounded-sharp" />
    </div>
    <div className="page-shell-content mb-12">
      <Skeleton className="h-4 w-full md:w-1/2" />
    </div>
    {/* Popular */}
    <section className="page-shell-content mb-12">
      <Skeleton className="h-6 w-24 mb-5" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="w-8 h-4" />
          <Skeleton className="w-12 h-12 rounded-sharp" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </section>
    {/* Discography */}
    <section className="page-shell-content">
      <Skeleton className="h-6 w-28 mb-5" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-sharp" />
        ))}
      </div>
    </section>
  </div>
);

const ArtistPage = () => {
  const { slug } = useParams();
  const { playTrack, playTracksInOrder, currentTrack, isPlaying } = usePlayer();
  const { onAlbum: prefetchAlbumRoute } = useHoverPrefetch();
  const { isFollowing, toggleFollow } = useFollowedArtists();

  const { data: artist, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.artist(slug),
    queryFn: () => getArtist(slug),
    enabled: Boolean(slug),
    ...cachePolicy.artist,
  });

  const pageError = usePageError(error, {
    resource: 'this artist',
    notFoundCopy: {
      title: 'Artist not found',
      description: "We don't have a page for this artist yet.",
    },
  });

  const portraitSrc = artist?.cover || artist?.thumbnail || '';
  // Local page accent extracted from the portrait. Applied as inline CSS var
  // on the page wrapper so it doesn't fight the root `--track-accent` that
  // FooterPlayer drives from the currently-playing track.
  const accent = useScopedArtistAccent(portraitSrc);

  // Sticky condensed header — appears once the user scrolls past the hero.
  const heroEndRef = useRef(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  useEffect(() => {
    const el = heroEndRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      // Trigger as the bottom of the hero crosses just under the TopBar.
      { rootMargin: `-${STICKY_TOP_PX}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [artist?.id]);

  const [popularExpanded, setPopularExpanded] = useState(false);

  // Group discography by year — albums arrive year-sorted from the server
  // (mappers.js line 284) so we just walk them and bucket. Undated entries
  // collapse into a single "Undated" group rendered last.
  const albumsByYear = useMemo(() => {
    const albums = artist?.albums || [];
    const groups = [];
    let current = null;
    for (const a of albums) {
      const year = a.year || 'Undated';
      if (!current || current.year !== year) {
        current = { year, albums: [] };
        groups.push(current);
      }
      current.albums.push(a);
    }
    return groups;
  }, [artist?.albums]);

  if (isLoading) return <ArtistPageSkeleton />;

  if (isError && pageError) {
    return (
      <div className="page-shell-content pt-6 md:pt-10">
        <EmptyState
          icon={pageError.kind === 'not-found' ? User : pageError.icon}
          title={pageError.title}
          description={pageError.description}
          action={
            pageError.kind === 'not-found' ? null : (
              <Button onClick={() => refetch()} size="md">
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  }

  if (!artist) return null;

  const topTracks = artist.topTracks || [];
  const albums = artist.albums || [];
  const visibleTopTracks = popularExpanded ? topTracks : topTracks.slice(0, POPULAR_INITIAL);
  const hiddenCount = Math.max(0, topTracks.length - POPULAR_INITIAL);
  const topPlays = topTracks.reduce((max, t) => {
    if (!Number.isFinite(t.plays)) return max;
    return Math.max(max, t.plays);
  }, 0);

  const handlePlayAll = () => {
    if (!topTracks.length) return;
    playTracksInOrder(topTracks, { replaceQueue: true, forceSequential: true });
  };

  const handleShuffle = () => {
    if (!topTracks.length) return;
    const shuffled = shuffleArray(topTracks);
    playTracksInOrder(shuffled, {
      replaceQueue: true,
      startIndex: 0,
      forceSequential: false,
    });
    notify.info('Shuffling top tracks');
  };

  const handleToggleFollow = () => {
    const added = toggleFollow({
      slug: artist.slug || slug,
      id: artist.id || slug,
      name: artist.name,
      thumbnail: artist.thumbnail || artist.cover,
    });
    if (added) notify.added(`Following ${artist.name}`);
    else notify.removed(`Unfollowed ${artist.name}`);
  };

  const handleShare = async () => {
    const result = await shareOrCopy({
      title: artist.name,
      text: `${artist.name} on Octavia`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
    if (result === 'copied') notify.copied('Artist link');
    else if (result === 'error') notify.error("Couldn't share");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify.copied('Artist link');
    } catch {
      notify.error("Couldn't copy");
    }
  };

  const handleStartRadio = () => {
    if (!topTracks.length) {
      notify.error('No tracks to start a radio');
      return;
    }
    const pool = shuffleArray(topTracks);
    playTracksInOrder(pool, {
      replaceQueue: true,
      startIndex: 0,
      forceSequential: false,
    });
    notify.info(`Radio · ${artist.name}`);
  };

  const following = isFollowing(artist.slug || slug);

  // Wrapper carries the per-page accent. `--artist-accent` falls back to the
  // root `--track-accent` when extraction hasn't finished (or returned nothing),
  // so the page never sits with a flat backdrop.
  const wrapperStyle = accent.ready
    ? { '--artist-accent': `${accent.h} ${accent.s}% ${accent.l}%` }
    : { '--artist-accent': 'var(--track-accent)' };

  return (
    <div className="pb-12" style={wrapperStyle}>
      {/* Hero */}
      <div className="page-shell-content relative pt-10 md:pt-14 pb-10 overflow-hidden">
        {/* Backdrop: blurred portrait + accent radial + complementary cool */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <SmartImage
            src={portraitSrc}
            alt=""
            kind="artist"
            loading="eager"
            fetchpriority="high"
            rounded="rounded-none"
            className="absolute inset-0 w-full h-full"
            imgClassName="object-cover scale-125 blur-3xl opacity-25"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 90% at 0% 0%, hsl(var(--artist-accent) / 0.28), transparent 60%),'
                + ' radial-gradient(ellipse 60% 80% at 100% 100%, hsl(var(--iris) / 0.18), transparent 65%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Top dateline — dynamic, real-data */}
        <div
          aria-hidden="true"
          className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
        >
          <span>The Profile</span>
          <span className="flex items-center gap-3">
            <span className="text-ink-3">✦</span>
            <span>{artist.name}</span>
            <span className="text-ink-3">✦</span>
          </span>
          <span>Side A</span>
        </div>

        <motion.div
          {...fadeUp}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10"
        >
          <div className="relative shrink-0">
            <SmartImage
              src={portraitSrc}
              alt={artist.name}
              kind="artist"
              loading="eager"
              fetchpriority="high"
              rounded="rounded-soft"
              className="w-44 h-44 md:w-56 md:h-56 shadow-elev-5 ring-1 ring-white/15"
              imgClassName="object-cover"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-soft pointer-events-none"
              style={{
                boxShadow:
                  'inset 0 1px 0 hsl(0 0% 100% / 0.10), inset 0 -8px 24px hsl(0 0% 0% / 0.22)',
              }}
            />
          </div>
          <div className="text-center md:text-left flex-1 min-w-0 pb-1">
            <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2 justify-center md:justify-start">
              <span className="w-5 h-px bg-track" />
              Artist
            </p>
            <h1 className="font-display text-display-md md:text-display-2xl text-ink leading-[0.86] mask-rise">
              <span>{artist.name}</span>
            </h1>
            {(topTracks.length > 0 || albums.length > 0) ? (
              <p className="font-editorial text-[14px] md:text-[15px] text-ink-2 mt-4 leading-snug">
                {[
                  topTracks.length > 0
                    ? `${topTracks.length} top ${topTracks.length === 1 ? 'track' : 'tracks'}`
                    : null,
                  albums.length > 0
                    ? `${albums.length} ${albums.length === 1 ? 'release' : 'releases'}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        </motion.div>

        {/* Sentinel — IntersectionObserver flips the sticky bar once this
            point scrolls under the TopBar. */}
        <div ref={heroEndRef} aria-hidden="true" className="absolute bottom-0 left-0 h-px w-px" />
      </div>

      {/* Sticky condensed action bar (desktop only) */}
      <motion.div
        initial={false}
        animate={{
          opacity: stickyVisible ? 1 : 0,
          y: stickyVisible ? 0 : -8,
          pointerEvents: stickyVisible ? 'auto' : 'none',
        }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:block sticky z-30 -mt-px"
        style={{ top: `${STICKY_TOP_PX}px` }}
        aria-hidden={!stickyVisible}
      >
        <div className="bg-background/85 backdrop-blur-xl border-b border-white/[0.07]">
          <div className="page-shell-content py-2.5 flex items-center gap-4">
            <SmartImage
              src={portraitSrc}
              alt=""
              kind="artist"
              rounded="rounded-full"
              className="w-9 h-9 ring-1 ring-white/15 flex-shrink-0"
              imgClassName="object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] text-ink truncate leading-none">
                {artist.name}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 mt-1.5">
                Artist
              </p>
            </div>
            <Button
              size="md"
              onClick={handlePlayAll}
              disabled={!topTracks.length}
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            >
              Play
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={handleShuffle}
              disabled={!topTracks.length}
              leftIcon={<Shuffle className="w-3.5 h-3.5" />}
            >
              Shuffle
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="page-shell-content mb-5 mt-2 flex items-center gap-3 flex-wrap">
        <Button
          size="lg"
          onClick={handlePlayAll}
          disabled={!topTracks.length}
          leftIcon={<Play className="w-4 h-4 fill-current" />}
        >
          Play
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleShuffle}
          disabled={!topTracks.length}
          leftIcon={<Shuffle className="w-4 h-4" />}
        >
          Shuffle
        </Button>
        <Button
          variant="editorial"
          size="lg"
          onClick={handleToggleFollow}
          aria-pressed={following}
          leftIcon={
            following ? (
              <UserCheck className="w-3.5 h-3.5 text-accent" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )
          }
        >
          {following ? 'Following' : 'Follow'}
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={handleShare}
          aria-label="Share artist"
        >
          <Share2 className="w-5 h-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" aria-label="More options">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-surface-3/95 backdrop-blur-xl border-white/10"
          >
            <DropdownMenuItem onClick={handleStartRadio}>
              <Radio className="w-4 h-4 mr-2" /> Start artist radio
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> Share artist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" /> Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stat strip — scannable masthead-style row of real numbers. */}
      <div
        aria-hidden="true"
        className="page-shell-content mb-12 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 border-b border-white/[0.06] pb-4"
      >
        <span className="flex items-center gap-2">
          <span>§01 — Popular</span>
          <span className="text-ink font-sans normal-case tracking-normal text-[13px] font-medium">
            {topTracks.length} {topTracks.length === 1 ? 'track' : 'tracks'}
          </span>
        </span>
        <span className="text-ink-4/60">✦</span>
        <span className="flex items-center gap-2">
          <span>§02 — Discography</span>
          <span className="text-ink font-sans normal-case tracking-normal text-[13px] font-medium">
            {albums.length} {albums.length === 1 ? 'release' : 'releases'}
          </span>
        </span>
        {topPlays > 0 ? (
          <>
            <span className="text-ink-4/60">✦</span>
            <span className="flex items-center gap-2">
              <span>Top plays</span>
              <span className="text-ink font-sans normal-case tracking-normal text-[13px] font-medium">
                {formatPlays(topPlays)}
              </span>
            </span>
          </>
        ) : null}
      </div>

      {/* Popular */}
      <section className="page-shell-content mb-14">
        <SectionHeader
          ordinal={1}
          eyebrow="Most-played"
          title="Popular"
          subtitle="The tracks listeners reach for first."
        />
        {!topTracks.length ? (
          <div className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md">
            <EmptyState
              icon={Music2}
              title="No top tracks yet"
              description={`No tracks indexed for ${artist.name} yet. Check the discography below.`}
              className="py-12"
            />
          </div>
        ) : (
          <>
            <motion.div
              variants={staggerChildren(0.03)}
              initial="initial"
              animate="animate"
              className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
            >
              {visibleTopTracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <motion.div
                    variants={fadeUp}
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={cn(
                      'group grid grid-cols-[2.1rem_2.5rem_minmax(0,1fr)_auto] sm:grid-cols-[2.4rem_3rem_minmax(0,1fr)_auto_auto] gap-2.5 sm:gap-4 px-3 sm:px-4 py-3.5',
                      'items-center cursor-pointer transition-colors border-b border-white/[0.05] last:border-0',
                      isCurrent
                        ? 'bg-[hsl(var(--artist-accent)/0.12)]'
                        : 'hover:bg-[hsl(var(--artist-accent)/0.08)]',
                    )}
                  >
                    <span className="flex justify-center">
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
                    <SmartImage
                      src={track.thumbnail}
                      alt=""
                      kind="track"
                      rounded="rounded-sharp"
                      className="w-10 h-10 sm:w-12 sm:h-12 ring-1 ring-white/10"
                      imgClassName="object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          'text-[14px] font-medium truncate',
                          isCurrent ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {track.title}
                      </h4>
                      <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
                        {Number.isFinite(track.plays) ? `${formatPlays(track.plays)} plays` : '\u2014'}
                        {isCurrent && isPlaying ? ' · now playing' : ''}
                      </p>
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="touch-action-visible opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <AddToPlaylistButton
                        track={track}
                        className="p-1.5"
                        buttonLabel={`Add ${track.title || 'track'} to playlist`}
                      />
                      <HeartButton track={track} size="sm" />
                    </div>
                    <span className="hidden sm:inline font-mono text-[12px] text-ink-4 tabular-nums tracking-tight">
                      {track.duration}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>

            {hiddenCount > 0 ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setPopularExpanded((v) => !v)}
                  aria-expanded={popularExpanded}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-surface-2/40 backdrop-blur-md text-[12px] font-mono uppercase tracking-[0.18em] text-ink-3 hover:text-ink hover:border-white/[0.18] transition-colors focus-ring"
                >
                  <span>
                    {popularExpanded ? 'Show less' : `Show ${hiddenCount} more`}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform',
                      popularExpanded && 'rotate-180',
                    )}
                  />
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Discography — grouped by year */}
      {albums.length > 0 && (
        <section className="page-shell-content">
          <SectionHeader
            ordinal={2}
            eyebrow="Discography"
            title="The records"
            subtitle="Albums, EPs, and singles."
          />
          <div className="space-y-10">
            {albumsByYear.map((group) => (
              <div key={String(group.year)}>
                <div
                  aria-hidden="true"
                  className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4"
                >
                  <span className="w-4 h-px bg-ink-4/40" />
                  <span>{group.year}</span>
                  <span className="flex-1 h-px bg-white/[0.06]" />
                  <span>
                    {group.albums.length} {group.albums.length === 1 ? 'release' : 'releases'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {group.albums.map((a, i) => (
                    <Link
                      key={a.id}
                      to={`/album/${a.id}`}
                      onMouseEnter={() => prefetchAlbumRoute(a.id)}
                      onFocus={() => prefetchAlbumRoute(a.id)}
                      className="group block rounded-sharp overflow-hidden border border-white/[0.06] hover:border-white/[0.18] transition-colors focus-ring shadow-elev-2 hover:shadow-elev-3"
                    >
                      <div className="aspect-square overflow-hidden relative">
                        <SmartImage
                          src={a.thumbnail}
                          alt={a.title}
                          kind="album"
                          rounded="rounded-none"
                          className="w-full h-full"
                          imgClassName="object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
                        />
                        <span className="absolute top-2 left-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 mix-blend-difference">
                          №{String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-[13.5px] font-medium truncate text-ink">{a.title}</p>
                        <p className="font-editorial text-[12px] text-ink-3 mt-0.5">
                          {a.year || '—'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* End of catalogue marker — matches AlbumPage's "End of side" rule. */}
          <div className="mt-12 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
            <span className="flex-1 h-px bg-white/[0.08]" />
            <span>
              End of catalogue · {albums.length} {albums.length === 1 ? 'release' : 'releases'}
            </span>
            <span className="flex-1 h-px bg-white/[0.08]" />
          </div>
        </section>
      )}
    </div>
  );
};

export default ArtistPage;
