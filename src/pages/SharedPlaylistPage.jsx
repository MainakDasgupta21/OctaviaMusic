import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, Shuffle, ListMusic, Music2, Plus, User } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui-v2/Button';
import EmptyState from '@/components/ui-v2/EmptyState';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import { getSharedPlaylist } from '@/lib/api';
import { usePageError } from '@/hooks/use-page-error';
import { shuffleArray } from '@/lib/shuffle';
import notify from '@/lib/notify';
import { fadeUp, staggerChildren } from '@/design/motion';
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

// 4-up cover collage built from the first 4 tracks' thumbnails (or fewer).
const CollageCover = ({ tracks }) => {
  const thumbs = tracks.slice(0, 4).map((t) => t.thumbnail).filter(Boolean);
  if (thumbs.length === 0) {
    return (
      <div className="w-48 h-48 md:w-64 md:h-64 rounded-sharp overflow-hidden shadow-elev-5 ring-1 ring-white/15 bg-surface-2 flex items-center justify-center">
        <ListMusic className="w-16 h-16 text-ink-3" strokeWidth={1.25} />
      </div>
    );
  }
  if (thumbs.length === 1) {
    return (
      <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-sharp overflow-hidden shadow-elev-5 ring-1 ring-white/15">
        <SmartImage
          src={thumbs[0]}
          alt=""
          kind="mix"
          rounded="rounded-none"
          className="w-full h-full"
          imgClassName="object-cover"
        />
      </div>
    );
  }
  const filled = [...thumbs];
  while (filled.length < 4) filled.push(thumbs[filled.length % thumbs.length]);
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-sharp overflow-hidden shadow-elev-5 ring-1 ring-white/15 grid grid-cols-2 grid-rows-2 gap-px bg-white/[0.06]">
      {filled.slice(0, 4).map((src, i) => (
        <SmartImage
          key={i}
          src={src}
          alt=""
          kind="mix"
          rounded="rounded-none"
          className="w-full h-full"
          imgClassName="object-cover"
        />
      ))}
    </div>
  );
};

const SharedPlaylistSkeleton = () => (
  <div className="pb-12">
    <div className="page-shell-content pt-10 md:pt-14 pb-10">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10">
        <Skeleton className="w-48 h-48 md:w-64 md:h-64 rounded-sharp" />
        <div className="flex-1 w-full">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
    <div className="page-shell-content mb-8 flex items-center gap-3">
      <Skeleton className="h-12 w-28 rounded-sharp" />
      <Skeleton className="h-12 w-28 rounded-sharp" />
    </div>
  </div>
);

const SharedPlaylistPage = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const { playTracksInOrder, currentTrack } = usePlayer();
  const { importSharedPlaylist } = usePlaylists();
  const { isAuthenticated } = useAuth();
  const [saving, setSaving] = useState(false);

  const { data: playlist, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['playlists', 'shared', shareId],
    queryFn: () => getSharedPlaylist(shareId),
    enabled: Boolean(shareId),
    staleTime: 60_000,
  });

  const tracks = playlist?.tracks || [];
  const totalRunTime = useMemo(() => sumDuration(tracks), [tracks]);

  const pageError = usePageError(error, {
    resource: 'this playlist',
    notFoundCopy: {
      title: 'Playlist unavailable',
      description: "This shared playlist doesn't exist anymore or was made private.",
    },
  });

  const handlePlayAll = () => {
    if (!tracks.length) return;
    playTracksInOrder(tracks, { replaceQueue: true, startIndex: 0, forceSequential: true });
  };

  const handleShuffle = () => {
    if (!tracks.length) return;
    playTracksInOrder(shuffleArray(tracks), {
      replaceQueue: true,
      startIndex: 0,
      forceSequential: false,
    });
    notify.info(`Shuffling \u00b7 ${playlist.name}`);
  };

  const handlePlayFromIndex = (index) => {
    if (!tracks.length) return;
    playTracksInOrder(tracks, { replaceQueue: true, startIndex: index, forceSequential: true });
  };

  const handleSaveCopy = async () => {
    if (!isAuthenticated) {
      notify.signInRequired('save shared playlists');
      return;
    }
    setSaving(true);
    const newId = await importSharedPlaylist(shareId);
    setSaving(false);
    if (newId) {
      notify.added(`Playlist \u2014 ${playlist.name}`);
      navigate(`/playlist/${newId}`);
    }
  };

  if (isLoading) return <SharedPlaylistSkeleton />;

  if (isError && pageError) {
    return (
      <div className="page-shell-content pt-6 md:pt-10">
        <EmptyState
          icon={pageError.kind === 'not-found' ? Music2 : pageError.icon}
          title={pageError.title}
          description={pageError.description}
          action={
            pageError.kind === 'not-found' ? (
              <Button onClick={() => navigate('/')}>Back home</Button>
            ) : (
              <Button onClick={() => refetch()}>Try again</Button>
            )
          }
        />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="page-shell-content pt-6 md:pt-10">
        <EmptyState
          icon={Music2}
          title="Playlist unavailable"
          description="This shared playlist doesn't exist anymore or was made private."
          action={<Button onClick={() => navigate('/')}>Back home</Button>}
        />
      </div>
    );
  }

  const ownerName = playlist.owner?.displayName || 'A listener';

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="page-shell-content relative pt-10 md:pt-14 pb-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            background:
              'radial-gradient(ellipse at 30% 0%, hsl(var(--track-accent) / 0.20) 0%, transparent 55%)',
          }}
        />

        <div
          aria-hidden="true"
          className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
        >
          <span>Shared Collection</span>
          <span className="flex items-center gap-3">
            <span className="text-ink-3">✦</span>
            <span>Shared with you</span>
            <span className="text-ink-3">✦</span>
          </span>
          <span>Public</span>
        </div>

        <motion.div
          {...fadeUp}
          className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10"
        >
          <CollageCover tracks={tracks} />
          <div className="text-center md:text-left flex-1 min-w-0">
            <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2 justify-center md:justify-start">
              <span className="w-5 h-px bg-track" />
              Shared playlist
            </p>
            <h1 className="font-display text-display-xl md:text-display-2xl text-ink leading-[0.88] mask-rise">
              <span>{playlist.name}</span>
            </h1>
            {playlist.description ? (
              <p className="mt-4 font-editorial text-[15px] text-ink-2 leading-snug">
                {playlist.description}
              </p>
            ) : null}
            <p className="mt-4 font-editorial text-[13.5px] text-ink-3 flex items-center gap-1.5 justify-center md:justify-start">
              <User className="w-3.5 h-3.5" />
              Shared by <span className="text-ink">{ownerName}</span>
            </p>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-4">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              {tracks.length > 0 ? ` · ${totalRunTime}` : ''}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="page-shell-content mb-8 flex items-center gap-3 flex-wrap">
        <Button
          size="lg"
          onClick={handlePlayAll}
          leftIcon={<Play className="w-4 h-4 fill-current" />}
          disabled={!tracks.length}
        >
          Play
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleShuffle}
          leftIcon={<Shuffle className="w-4 h-4" />}
          disabled={!tracks.length}
        >
          Shuffle
        </Button>
        <Button
          variant="editorial"
          size="lg"
          onClick={handleSaveCopy}
          disabled={saving}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          {saving ? 'Saving…' : 'Save to your library'}
        </Button>
      </div>

      {/* Tracks (read-only) */}
      <section className="page-shell-content">
        {tracks.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="Empty playlist"
            description="This shared playlist has no songs yet."
          />
        ) : (
          <motion.div
            variants={staggerChildren(0.03)}
            initial="initial"
            animate="animate"
            className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
          >
            <div
              aria-hidden="true"
              className="grid grid-cols-[2rem_3rem_minmax(0,1fr)_auto] gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4"
            >
              <span className="text-center">№</span>
              <span aria-hidden="true" />
              <span>Title</span>
              <span aria-hidden="true" />
            </div>
            {tracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <motion.div
                  variants={fadeUp}
                  key={track.id || `${track.title}-${index}`}
                  onClick={() => handlePlayFromIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handlePlayFromIndex(index);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  className={cn(
                    'group row-hover grid grid-cols-[2rem_3rem_minmax(0,1fr)_auto] gap-2.5 sm:gap-3 px-2.5 sm:px-3 py-3 items-center cursor-pointer transition-colors border-b border-white/[0.04] last:border-0',
                    isCurrent ? 'bg-track/[0.08]' : 'hover:bg-white/[0.035]',
                  )}
                >
                  <span
                    className={cn(
                      'flex justify-center font-display italic text-xl leading-none tabular-nums',
                      isCurrent ? 'text-accent' : 'text-ink-3',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <SmartImage
                    src={track.thumbnail}
                    alt=""
                    kind="track"
                    rounded="rounded-sharp"
                    className="w-10 h-10 ring-1 ring-white/10"
                    imgClassName="object-cover"
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-[14px] font-medium truncate',
                        isCurrent ? 'text-accent' : 'text-ink',
                      )}
                    >
                      {track.title}
                    </p>
                    <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
                      by {track.artist || 'Unknown artist'}
                    </p>
                  </div>
                  <span className="font-mono text-[12px] text-ink-4 tabular-nums tracking-tight justify-self-end">
                    {track.duration || '\u2014'}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default SharedPlaylistPage;
