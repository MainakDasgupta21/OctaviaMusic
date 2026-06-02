import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Clock, X, Shuffle } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import HeartButton from '@/components/HeartButton';
import TrackContextMenu from '@/components/TrackContextMenu';
import Button from '@/components/ui-v2/Button';
import EmptyState from '@/components/ui-v2/EmptyState';
import Tabs from '@/components/ui-v2/Tabs';
import Kbd from '@/components/ui-v2/Kbd';
import { useListNavigation } from '@/hooks/use-list-navigation';
import notify from '@/lib/notify';
import { fadeUp, staggerChildren } from '@/design/motion';
import { cn } from '@/lib/utils';

const SORTS = {
  recent: { label: 'Recent', fn: (a, b) => (b.addedAt || 0) - (a.addedAt || 0) },
  title: { label: 'Title', fn: (a, b) => a.title.localeCompare(b.title) },
  artist: { label: 'Artist', fn: (a, b) => a.artist.localeCompare(b.artist) },
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

const FavoritesPage = () => {
  const { playTrack, currentTrack, isPlaying, addToQueue } = usePlayer();
  const { list, removeFavorite, toggleFavorite } = useFavorites();
  const [sort, setSort] = useState('recent');

  const sorted = useMemo(() => [...list].sort(SORTS[sort].fn), [list, sort]);

  const { selectedIndex, setSelectedIndex } = useListNavigation({
    items: sorted,
    onSelect: (track) => playTrack(track),
    onQueue: (track) => {
      addToQueue(track);
      notify.added(track.title);
    },
    onLike: (track) => {
      toggleFavorite(track);
      notify.unliked(track.title);
    },
  });

  const handlePlayAll = () => {
    if (sorted.length > 0) {
      playTrack(sorted[0]);
      sorted.slice(1).forEach((track) => addToQueue(track));
    }
  };

  const handleShuffle = () => {
    if (sorted.length === 0) return;
    const shuffled = [...sorted].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]);
    shuffled.slice(1).forEach((track) => addToQueue(track));
  };

  return (
    <div className="p-5 md:p-10 max-w-[1600px] mx-auto pb-12">
      <motion.div
        {...fadeUp}
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10"
      >
        <div>
          <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
            <span className="w-5 h-px bg-track" />
            <Heart className="w-3.5 h-3.5 fill-current" />
            Loved
          </p>
          <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
            <span>
              Songs you've{' '}
              <em className="font-editorial text-track not-italic">kept.</em>
            </span>
          </h1>
          <p className="font-editorial text-[15px] text-ink-3 mt-4 max-w-xl leading-snug">
            {sorted.length === 0
              ? 'Songs you like will appear here.'
              : `${sorted.length} ${sorted.length === 1 ? 'song' : 'songs'} you love, always within reach.`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs
            items={Object.entries(SORTS).map(([id, { label }]) => ({ id, label }))}
            value={sort}
            onValueChange={setSort}
            variant="pill"
          />
          <Button
            onClick={handlePlayAll}
            disabled={sorted.length === 0}
            leftIcon={<Play className="w-4 h-4 fill-current" />}
          >
            Play all
          </Button>
          <Button
            variant="editorial"
            onClick={handleShuffle}
            disabled={sorted.length === 0}
            leftIcon={<Shuffle className="w-3.5 h-3.5" />}
          >
            Shuffle
          </Button>
        </div>
      </motion.div>

      {sorted.length > 0 ? (
        <>
          <motion.div
            variants={staggerChildren(0.025)}
            initial="initial"
            animate="animate"
            className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
          >
            {/* Table header */}
            <div className="grid grid-cols-[2.5rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">
              <span className="text-center">№</span>
              <span aria-hidden="true" />
              <span>Title</span>
              <span aria-hidden="true" className="w-8" />
              <span className="hidden md:block text-right">
                <Clock className="w-3.5 h-3.5 inline" />
              </span>
              <span className="w-8" aria-hidden="true" />
            </div>

            {sorted.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isSelected = selectedIndex === index;
              return (
                <TrackContextMenu key={track.id} track={track}>
                  <motion.div
                    variants={fadeUp}
                    onClick={() => playTrack(track)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'group grid grid-cols-[2.5rem_3rem_1fr_auto_auto_auto] gap-4 px-4 py-3.5',
                      'items-center cursor-pointer transition-colors border-b border-white/[0.05] last:border-0',
                      isCurrentTrack && 'bg-track/[0.10]',
                      isSelected && !isCurrentTrack && 'bg-white/[0.05]',
                      !isSelected && !isCurrentTrack && 'hover:bg-white/[0.035]',
                    )}
                  >
                    <span className="flex justify-center">
                      {isCurrentTrack && isPlaying ? (
                        <NowPlayingBars />
                      ) : (
                        <span
                          className={cn(
                            'font-display italic text-2xl leading-none tabular-nums',
                            isCurrentTrack ? 'text-accent' : 'text-ink-3 group-hover:text-ink',
                          )}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      )}
                    </span>

                    <div className="relative">
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="w-12 h-12 rounded-sharp object-cover ring-1 ring-white/10"
                      />
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-sharp">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          'text-[14px] font-medium truncate',
                          isCurrentTrack ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {track.title}
                      </h4>
                      <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
                        by {track.artist}
                      </p>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <HeartButton track={track} size="sm" />
                    </div>

                    <div className="hidden md:flex items-center justify-end gap-2 text-ink-4">
                      <span className="font-mono text-[12px] tabular-nums tracking-tight">
                        {track.duration || '\u2014'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(track.id);
                        notify.unliked(track.title);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-sharp text-ink-3 hover:text-danger hover:bg-danger/10 transition-all focus-ring"
                      aria-label="Remove from favorites"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                </TrackContextMenu>
              );
            })}
          </motion.div>

          {/* Keyboard hint strip */}
          <div className="mt-5 flex items-center gap-4 flex-wrap text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys={['j', 'k']} />
              <span className="font-editorial italic">navigate</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys={['Enter']} />
              <span className="font-editorial italic">play</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys={['Q']} />
              <span className="font-editorial italic">queue</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys={['L']} />
              <span className="font-editorial italic">like</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd keys={['Right click']} />
              <span className="font-editorial italic">menu</span>
            </span>
          </div>
        </>
      ) : (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Tap the heart on any song to save it here."
        />
      )}
    </div>
  );
};

export default FavoritesPage;
