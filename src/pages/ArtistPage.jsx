import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  Shuffle,
  UserPlus,
  MoreHorizontal,
  CheckCircle2,
  User,
  AlertTriangle,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import Button from '@/components/ui-v2/Button';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import EmptyState from '@/components/ui-v2/EmptyState';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import { getArtist, isNotFoundError } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { formatPlays } from '@/lib/player-format';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useHoverPrefetch } from '@/hooks/use-route-prefetch';
import { cn } from '@/lib/utils';

const ArtistPageSkeleton = () => (
  <div className="pb-12">
    <div className="relative h-[48vh] min-h-[320px] max-h-[480px] overflow-hidden">
      <div className="absolute inset-0 bg-surface-2/40" />
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-10 max-w-[1600px] mx-auto flex items-end gap-5 md:gap-8">
        <Skeleton className="w-36 h-36 md:w-56 md:h-56 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
    <div className="px-5 md:px-10 max-w-[1600px] mx-auto mb-10 flex items-center gap-3">
      <Skeleton className="h-12 w-28 rounded-sharp" />
      <Skeleton className="h-12 w-28 rounded-sharp" />
    </div>
    <section className="px-5 md:px-10 max-w-[1600px] mx-auto mb-12">
      <Skeleton className="h-6 w-24 mb-5" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton className="w-12 h-12 rounded-sharp" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </section>
  </div>
);

const ArtistPage = () => {
  const { slug } = useParams();
  const { playTrack, addToQueue, currentTrack, isPlaying } = usePlayer();
  const { onAlbum: prefetchAlbumRoute } = useHoverPrefetch();

  const { data: artist, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.artist(slug),
    queryFn: () => getArtist(slug),
    enabled: Boolean(slug),
    ...cachePolicy.artist,
  });

  if (isLoading) return <ArtistPageSkeleton />;

  if (isError) {
    const notFound = isNotFoundError(error);
    return (
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
        <EmptyState
          icon={notFound ? User : AlertTriangle}
          title={notFound ? 'Artist not found' : 'Could not load this artist'}
          description={
            notFound
              ? "We don't have a page for this artist yet."
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

  if (!artist) return null;

  const handlePlayAll = () => {
    if (!artist.topTracks?.length) return;
    playTrack(artist.topTracks[0]);
    artist.topTracks.slice(1).forEach((t) => addToQueue(t));
  };

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="relative h-[48vh] min-h-[320px] max-h-[480px] overflow-hidden">
        <SmartImage
          src={artist.cover || artist.thumbnail}
          alt=""
          kind="artist"
          loading="eager"
          fetchpriority="high"
          aria-hidden="true"
          rounded="rounded-none"
          className="absolute inset-0 w-full h-full"
          imgClassName="object-cover scale-110 blur-2xl opacity-45"
        />
        {/* Triple-pass gradient — top fade, bottom paper, hairline catch */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/45 via-transparent to-background/25" />

        {/* Top dateline */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 px-5 md:px-10 max-w-[1600px] mx-auto pt-5 md:pt-6 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-bone/60"
        >
          <span>The Profile</span>
          <span className="text-bone/40">✦</span>
          <span>Side B</span>
        </div>

        <motion.div
          {...fadeUp}
          className="absolute inset-x-0 bottom-0 p-5 md:p-10 max-w-[1600px] mx-auto flex items-end gap-5 md:gap-8"
        >
          <SmartImage
            src={artist.cover || artist.thumbnail}
            alt={artist.name}
            kind="artist"
            loading="eager"
            rounded="rounded-full"
            className="w-36 h-36 md:w-56 md:h-56 shadow-elev-5 ring-1 ring-white/15 flex-shrink-0"
            imgClassName="object-cover"
          />
          <div className="min-w-0 pb-2 flex-1">
            <div className="flex items-center gap-3 mb-3">
              <p className="eyebrow eyebrow-accent">Artist profile</p>
              {artist.verified ? (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-info">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Verified
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-display-xl md:text-display-2xl text-ink leading-[0.86] mask-rise">
              <span>{artist.name}</span>
            </h1>
            {artist.monthly ? (
              <p className="font-editorial text-[15px] text-ink-2 mt-4 leading-snug">
                {artist.monthly}
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>

      {/* Actions + meta side-strip */}
      <div className="px-5 md:px-10 max-w-[1600px] mx-auto -mt-2 mb-12 flex items-center gap-3 flex-wrap">
        <Button
          size="lg"
          onClick={handlePlayAll}
          disabled={!artist.topTracks?.length}
          leftIcon={<Play className="w-4 h-4 fill-current" />}
        >
          Play
        </Button>
        <Button variant="ghost" size="lg" leftIcon={<Shuffle className="w-4 h-4" />}>
          Shuffle
        </Button>
        <Button
          variant="editorial"
          size="lg"
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Follow
        </Button>
        <Button variant="ghost" size="icon" aria-label="More options">
          <MoreHorizontal className="w-5 h-5" />
        </Button>

        {/* Hairline meta side-strip */}
        <div className="hidden lg:flex ml-auto items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
          <span className="flex items-center gap-2">
            <span>Top tracks</span>
            <span className="text-ink font-sans normal-case tracking-normal text-[13px] font-medium">
              {artist.topTracks?.length || 0}
            </span>
          </span>
          <span aria-hidden="true">✦</span>
          <span className="flex items-center gap-2">
            <span>Albums</span>
            <span className="text-ink font-sans normal-case tracking-normal text-[13px] font-medium">
              {artist.albums?.length || 0}
            </span>
          </span>
        </div>
      </div>

      {/* Top tracks */}
      <section className="px-5 md:px-10 max-w-[1600px] mx-auto mb-14">
        <SectionHeader
          ordinal={1}
          eyebrow="Most-played"
          title="Popular"
          subtitle="The tracks listeners reach for first."
        />
        <motion.div
          variants={staggerChildren(0.03)}
          initial="initial"
          animate="animate"
          className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
        >
          {!artist.topTracks?.length ? (
            <p className="p-6 font-editorial italic text-ink-3 text-sm">No tracks yet.</p>
          ) : (
            artist.topTracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <motion.div
                  variants={fadeUp}
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={cn(
                    'group grid grid-cols-[2.5rem_3rem_1fr_auto_auto] gap-4 px-4 py-3.5',
                    'items-center cursor-pointer transition-colors border-b border-white/[0.05] last:border-0',
                    isCurrent ? 'bg-track/[0.08]' : 'hover:bg-white/[0.035]',
                  )}
                >
                  <span
                    className={cn(
                      'flex justify-center font-display italic text-2xl leading-none tabular-nums',
                      isCurrent ? 'text-accent' : 'text-ink-3 group-hover:text-ink',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <SmartImage
                    src={track.thumbnail}
                    alt=""
                    kind="track"
                    rounded="rounded-sharp"
                    className="w-12 h-12 ring-1 ring-white/10"
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
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HeartButton track={track} size="sm" />
                  </div>
                  <span className="font-mono text-[12px] text-ink-4 tabular-nums tracking-tight">
                    {track.duration}
                  </span>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </section>

      {/* Discography */}
      {artist.albums?.length > 0 && (
        <section className="px-5 md:px-10 max-w-[1600px] mx-auto">
          <SectionHeader
            ordinal={2}
            eyebrow="Discography"
            title="The records"
            subtitle="Albums, EPs, and singles."
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {artist.albums.map((a, i) => (
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
        </section>
      )}
    </div>
  );
};

export default ArtistPage;
