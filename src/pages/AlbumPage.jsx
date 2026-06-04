import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Heart,
  Share2,
  MoreHorizontal,
  Clock,
  Music2,
  AlertTriangle,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import Button from '@/components/ui-v2/Button';
import EmptyState from '@/components/ui-v2/EmptyState';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import { getAlbum, isNotFoundError } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { isUsableArtistSlug } from '@/lib/slug';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useArtistPrefetchProps } from '@/hooks/use-route-prefetch';
import { cn } from '@/lib/utils';

const sumDuration = (tracks) => {
  let total = 0;
  for (const t of tracks) {
    const [m = 0, s = 0] = (t.duration || '0:00').split(':').map(Number);
    total += m * 60 + s;
  }
  const mins = Math.floor(total / 60);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs > 0) return `${hrs} hr ${rem} min`;
  return `${mins} min`;
};

const AlbumPageSkeleton = () => (
  <div className="pb-12">
    <div className="pt-12 pb-8 px-5 md:px-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
        <Skeleton className="w-48 h-48 md:w-64 md:h-64 rounded-sharp" />
        <div className="flex-1 w-full">
          <Skeleton className="h-3 w-16 mb-3" />
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
    <div className="px-5 md:px-10 max-w-[1600px] mx-auto mb-8 flex items-center gap-3">
      <Skeleton className="h-12 w-28 rounded-sharp" />
      <Skeleton className="h-12 w-12 rounded-sharp" />
    </div>
    <section className="px-5 md:px-10 max-w-[1600px] mx-auto">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_auto] gap-4 px-4 py-3 items-center">
          <Skeleton className="h-4 w-4 mx-auto" />
          <div>
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </section>
  </div>
);

const AlbumPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playTracksInOrder, currentTrack, isPlaying } = usePlayer();
  const autoplayHandledRef = useRef(false);

  const { data: album, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.album(id),
    queryFn: () => getAlbum(id),
    enabled: Boolean(id),
    ...cachePolicy.album,
  });

  // Hooks must be called unconditionally — pass undefined when the album is
  // still loading, which the helper handles by returning {}.
  const artistPrefetchProps = useArtistPrefetchProps(album?.artistSlug);

  const totalRunTime = useMemo(
    () => (album?.tracks ? sumDuration(album.tracks) : '0 min'),
    [album],
  );

  const shouldAutoplayFromSearch =
    searchParams.get('from') === 'search' && searchParams.get('autoplay') === '1';

  const handlePlay = useCallback(
    (startIndex = 0) => {
      if (!album?.tracks?.length) return false;
      return playTracksInOrder(album.tracks, {
        replaceQueue: true,
        startIndex,
        forceSequential: true,
      });
    },
    [album?.tracks, playTracksInOrder],
  );

  useEffect(() => {
    autoplayHandledRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!shouldAutoplayFromSearch) return;
    if (!album?.tracks?.length) return;
    if (autoplayHandledRef.current) return;

    const didStart = handlePlay(0);
    if (!didStart) return;

    autoplayHandledRef.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('from');
    next.delete('autoplay');
    setSearchParams(next, { replace: true });
  }, [handlePlay, shouldAutoplayFromSearch, album?.tracks, searchParams, setSearchParams]);

  if (isLoading) return <AlbumPageSkeleton />;

  if (isError) {
    const notFound = isNotFoundError(error);
    return (
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        <EmptyState
          icon={notFound ? Music2 : AlertTriangle}
          title={notFound ? 'Album not found' : 'Could not load this album'}
          description={
            notFound
              ? "We couldn't find an album with that id."
              : 'The catalog service is unreachable. Check your connection and try again.'
          }
          action={
            notFound ? null : (
              <Button onClick={() => refetch()} size="md">
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  }

  if (!album || !album.tracks?.length) {
    return (
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        <EmptyState
          icon={Music2}
          title="No tracks here yet"
          description="This album exists but has no tracks listed."
        />
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Hero — editorial cover spread */}
      <div className="relative pt-10 md:pt-14 pb-10 px-5 md:px-10 max-w-[1600px] mx-auto">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 30% 0%, hsl(var(--track-accent) / 0.22) 0%, transparent 55%)',
          }}
        />

        {/* Top dateline */}
        <div
          aria-hidden="true"
          className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
        >
          <span>The Record</span>
          <span className="flex items-center gap-3">
            <span className="text-ink-3">✦</span>
            <span>
              {album.artist || 'Unknown artist'}
              {album.year ? ` · ${album.year}` : ''}
            </span>
            <span className="text-ink-3">✦</span>
          </span>
          <span>LP</span>
        </div>

        <motion.div
          {...fadeUp}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10"
        >
          <div className="relative shrink-0">
            <SmartImage
              src={album.cover || album.thumbnail}
              alt={album.title}
              kind="album"
              loading="eager"
              fetchpriority="high"
              rounded="rounded-sharp"
              className="w-48 h-48 md:w-64 md:h-64 shadow-elev-5 ring-1 ring-white/15"
              imgClassName="object-cover"
            />
            {/* Subtle inner shadow vignette to enhance physicality */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-sharp pointer-events-none"
              style={{
                boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.08), inset 0 -8px 24px hsl(0 0% 0% / 0.18)',
              }}
            />
          </div>
          <div className="text-center md:text-left flex-1 min-w-0">
            <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2 justify-center md:justify-start">
              <span className="w-5 h-px bg-track" />
              Album
            </p>
            <h1 className="font-display text-display-xl md:text-display-2xl text-ink leading-[0.86] mask-rise">
              <span>{album.title}</span>
            </h1>
            <p className="font-editorial text-[16px] text-ink-2 mt-4 leading-snug">
              by{' '}
              {isUsableArtistSlug(album.artistSlug) ? (
                <Link
                  to={`/artist/${album.artistSlug}`}
                  {...artistPrefetchProps}
                  className="text-ink hover:text-accent focus-ring rounded-sharp underline-offset-2 hover:underline"
                >
                  {album.artist || 'Unknown artist'}
                </Link>
              ) : (
                <span className="text-ink">{album.artist || 'Unknown artist'}</span>
              )}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="px-5 md:px-10 max-w-[1600px] mx-auto mb-8 flex items-center gap-3">
        <Button
          size="lg"
          onClick={() => handlePlay(0)}
          leftIcon={<Play className="w-4 h-4 fill-current" />}
        >
          Play album
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label="Like album">
          <Heart className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label="Share">
          <Share2 className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon-lg" aria-label="More options">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Tracklist masthead strip */}
      <section className="px-5 md:px-10 max-w-[1600px] mx-auto">
        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-4 mb-5 text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 border-b border-white/[0.08] pb-3"
        >
          <span className="flex items-center gap-3">
            <span>§01</span>
            <span className="w-4 h-px bg-ink-4/40" />
            <span>Tracklist</span>
          </span>
          <span className="flex items-center gap-3">
            <span>
              {album.tracks.length}{' '}
              {album.tracks.length === 1 ? 'track' : 'tracks'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{totalRunTime}</span>
            {album.year ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{album.year}</span>
              </>
            ) : null}
          </span>
        </div>

        <div className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto] gap-4 px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">
            <span className="text-center">№</span>
            <span>Title</span>
            <span className="w-8" aria-hidden="true" />
            <span className="text-right">
              <Clock className="w-3.5 h-3.5 inline" />
            </span>
          </div>
          <motion.div
            variants={staggerChildren(0.03)}
            initial="initial"
            animate="animate"
          >
            {album.tracks.map((track, i) => {
              const isCurrent = currentTrack?.id === track.id;
              const isPlayable = track.playable !== false && Boolean(track.videoId || track.id);
              return (
                <motion.div
                  variants={fadeUp}
                  key={track.id || `${track.title}-${i}`}
                  onClick={() => isPlayable && handlePlay(i)}
                  aria-disabled={!isPlayable}
                  className={cn(
                    'group grid grid-cols-[2.5rem_1fr_auto_auto] gap-4 px-4 py-3.5',
                    'items-center transition-colors border-b border-white/[0.05] last:border-0',
                    isPlayable ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
                    isCurrent ? 'bg-track/[0.08]' : isPlayable ? 'hover:bg-white/[0.035]' : '',
                  )}
                >
                  <span
                    className={cn(
                      'flex justify-center font-display italic text-2xl leading-none tabular-nums',
                      isCurrent ? 'text-accent' : 'text-ink-3 group-hover:text-ink',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-[14px] font-medium truncate',
                        isCurrent ? 'text-accent' : 'text-ink',
                      )}
                    >
                      {track.title || 'Untitled'}
                    </p>
                    <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
                      by {track.artist || album.artist || 'Unknown artist'}
                      {!isPlayable ? ' · unavailable' : isCurrent && isPlaying ? ' · now playing' : ''}
                    </p>
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isPlayable ? <HeartButton track={track} size="sm" /> : <span className="w-7 h-7 inline-block" aria-hidden />}
                  </div>
                  <span className="font-mono text-[12px] text-ink-4 tabular-nums tracking-tight">
                    {track.duration || '—'}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* End of record marker */}
        <div className="mt-10 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
          <span className="flex-1 h-px bg-white/[0.08]" />
          <span>End of side · {totalRunTime}</span>
          <span className="flex-1 h-px bg-white/[0.08]" />
        </div>
      </section>
    </div>
  );
};

export default AlbumPage;
