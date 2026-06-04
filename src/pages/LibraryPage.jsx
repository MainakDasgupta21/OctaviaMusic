import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Library as LibraryIcon,
  Heart,
  History,
  Play,
  Search,
  Clock,
  Trash2,
  Music2,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import HeartButton from '@/components/HeartButton';
import Button from '@/components/ui-v2/Button';
import Stat from '@/components/ui-v2/Stat';
import Tabs from '@/components/ui-v2/Tabs';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import EmptyState from '@/components/ui-v2/EmptyState';
import SmartImage from '@/components/SmartImage';
import { fadeUp, staggerChildren } from '@/design/motion';
import { artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'octavia.recent-searches.v1';

const readRecentSearches = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeRecentSearches = (arr) => {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(arr));
  } catch {
    /* noop */
  }
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: LibraryIcon },
  { id: 'recent', label: 'Recently played', icon: History },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'searches', label: 'Searches', icon: Search },
];

const formatMasthead = () => {
  const d = new Date();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d).toUpperCase();
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

const LibraryPage = () => {
  const navigate = useNavigate();
  const { history, playTrack, addToQueue, currentTrack, isPlaying } = usePlayer();
  const { list: favorites } = useFavorites();
  const [tab, setTab] = useState('overview');
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches());
  const masthead = useMemo(() => formatMasthead(), []);
  const issueNum = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 0);
    return String(Math.floor((Date.now() - start.getTime()) / 86_400_000)).padStart(3, '0');
  }, []);

  useEffect(() => {
    if (tab === 'searches' || tab === 'overview') {
      setRecentSearches(readRecentSearches());
    }
  }, [tab]);

  const topArtists = useMemo(() => {
    const counts = new Map();
    [...history, ...favorites].forEach((t) => {
      if (!t?.artist) return;
      counts.set(t.artist, (counts.get(t.artist) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([artist, count]) => {
        const sample =
          favorites.find((t) => t.artist === artist) ||
          history.find((t) => t.artist === artist);
        const slug = sample ? artistSlugOf(sample) : '';
        return { artist, count, thumbnail: sample?.thumbnail, slug };
      });
  }, [history, favorites]);

  const handlePlayAll = (tracks) => {
    if (!tracks.length) return;
    playTrack(tracks[0]);
    tracks.slice(1).forEach((t) => addToQueue(t));
  };

  const handleClearSearches = () => {
    setRecentSearches([]);
    writeRecentSearches([]);
  };

  const isEmpty =
    history.length === 0 && favorites.length === 0 && recentSearches.length === 0;

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
          <span>The Octavia Daily · Library</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Vol. 01 · No. {issueNum}</span>
      </div>

      {/* Page header */}
      <motion.div {...fadeUp} className="mb-10">
        <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
          <span className="w-6 h-px bg-track" />
          A personal archive
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
          <span>
            Your{' '}
            <em className="font-editorial text-track not-italic">listening,</em>{' '}
            collected.
          </span>
        </h1>
        <p className="font-editorial text-[15px] text-ink-3 mt-4 max-w-xl leading-snug">
          Everything you've played, loved, and searched for — kept close, ready to revisit.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="mb-8">
        <Tabs items={TABS} value={tab} onValueChange={setTab} variant="pill" />
      </div>

      {isEmpty ? (
        <LibraryEmptyState navigate={navigate} />
      ) : tab === 'overview' ? (
        <Overview
          history={history}
          favorites={favorites}
          topArtists={topArtists}
          recentSearches={recentSearches}
          playTrack={playTrack}
          handlePlayAll={handlePlayAll}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
        />
      ) : tab === 'recent' ? (
        <TrackList
          tracks={history}
          emptyMessage="Nothing played yet. Play a song and it will show up here."
          onPlay={playTrack}
          onPlayAll={() => handlePlayAll(history)}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
        />
      ) : tab === 'favorites' ? (
        <TrackList
          tracks={favorites}
          emptyMessage="Tap the heart on any song to add it here."
          onPlay={playTrack}
          onPlayAll={() => handlePlayAll(favorites)}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
        />
      ) : (
        <RecentSearches
          searches={recentSearches}
          onPick={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
          onClear={handleClearSearches}
        />
      )}
    </div>
  );
};

// ============================================================================
// Overview tab
// ============================================================================

const Overview = ({
  history,
  favorites,
  topArtists,
  recentSearches,
  playTrack,
  handlePlayAll,
  currentTrack,
  isPlaying,
}) => (
  <div className="space-y-12">
    {/* Stats spread */}
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat label="Recently played" value={history.length} icon={History} />
      <Stat label="Favorites" value={favorites.length} icon={Heart} />
      <Stat label="Top artists" value={topArtists.length} icon={Music2} />
      <Stat label="Recent searches" value={recentSearches.length} icon={Search} />
    </section>

    {history.length > 0 && (
      <section>
        <SectionHeader
          ordinal={1}
          eyebrow="Continued"
          title="Pick up where you left off"
          subtitle="The last few tracks you played, ready to resume."
          action={
            history.length > 6 ? (
              <Button
                variant="editorial"
                size="sm"
                onClick={() => handlePlayAll(history)}
              >
                Play all
              </Button>
            ) : null
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.slice(0, 6).map((track, i) => (
            <CompactTrack
              key={track.id}
              track={track}
              index={i}
              onPlay={() => playTrack(track)}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      </section>
    )}

    {topArtists.length > 0 && (
      <section>
        <SectionHeader
          ordinal={2}
          eyebrow="Your rotation"
          title="The voices on repeat"
          subtitle="Aggregated from your recent listening."
        />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-5">
          {topArtists.map((a) => (
            <Link
              key={a.artist}
              to={isUsableArtistSlug(a.slug) ? `/artist/${a.slug}` : '#'}
              aria-disabled={!isUsableArtistSlug(a.slug)}
              className="group block text-center focus-ring rounded-sharp"
            >
              <div className="aspect-square mb-3 bg-surface-2 group-hover:ring-track/50 transition-all shadow-elev-1 group-hover:shadow-elev-3">
                <SmartImage
                  src={a.thumbnail}
                  alt={a.artist || 'Artist'}
                  kind="artist"
                  rounded="rounded-full"
                  className="w-full h-full ring-1 ring-white/[0.08]"
                  imgClassName="object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
                />
              </div>
              <p className="text-[13px] font-medium truncate text-ink">{a.artist || 'Unknown artist'}</p>
              <p className="font-editorial text-[11.5px] text-ink-3">
                {a.count} {a.count === 1 ? 'play' : 'plays'}
              </p>
            </Link>
          ))}
        </div>
      </section>
    )}

    {favorites.length > 0 && (
      <section>
        <SectionHeader
          ordinal={3}
          eyebrow="Loved"
          title="Songs you've kept"
          action={
            favorites.length > 6 ? (
              <Link to="/favorites">
                <Button variant="editorial" size="sm">
                  See all
                </Button>
              </Link>
            ) : null
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {favorites.slice(0, 6).map((track, i) => (
            <CompactTrack
              key={track.id}
              track={track}
              index={i}
              onPlay={() => playTrack(track)}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      </section>
    )}
  </div>
);

// ============================================================================
// Pieces
// ============================================================================

const CompactTrack = ({ track, index, onPlay, isCurrent, isPlaying }) => (
  <motion.button
    variants={fadeUp}
    type="button"
    onClick={onPlay}
    className={cn(
      'group flex items-center gap-3 p-2.5 pr-4 rounded-sharp',
      'border border-white/[0.06] bg-surface-2/50 backdrop-blur-md',
      'hover:bg-surface-2 hover:border-white/[0.12] transition-colors text-left focus-ring',
      isCurrent && 'ring-1 ring-track/50 border-track/40',
    )}
  >
    <div className="relative flex-shrink-0">
      <SmartImage
        src={track.thumbnail}
        alt=""
        kind="track"
        rounded="rounded-sharp"
        className="w-14 h-14 ring-1 ring-white/10"
        imgClassName="object-cover"
      />
      {typeof index === 'number' ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -left-1 font-display italic text-base leading-none text-bone mix-blend-difference opacity-90 group-hover:opacity-0 transition-opacity"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      ) : null}
    </div>
    <div className="min-w-0 flex-1">
      <p className={cn('text-[14px] font-medium truncate', isCurrent ? 'text-accent' : 'text-ink')}>
        {track.title}
      </p>
      <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
        by {track.artist || 'Unknown artist'}
      </p>
    </div>
    <div className="w-9 h-9 rounded-full flex items-center justify-center transition-colors text-ink-3 group-hover:text-accent">
      {isCurrent && isPlaying ? <NowPlayingBars /> : <Play className="w-4 h-4 fill-current" />}
    </div>
  </motion.button>
);

const TrackList = ({
  tracks,
  emptyMessage,
  onPlay,
  onPlayAll,
  currentTrack,
  isPlaying,
}) => {
  if (!tracks.length) {
    return (
      <EmptyState
        icon={Music2}
        title="Nothing here yet"
        description={emptyMessage}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-editorial text-[13px] text-ink-3">
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
        </p>
        <Button onClick={onPlayAll} size="sm" leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}>
          Play all
        </Button>
      </div>
      <motion.div
        variants={staggerChildren(0.025)}
        initial="initial"
        animate="animate"
        className="rounded-soft border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
      >
        {tracks.map((track, index) => {
          const isCurrent = currentTrack?.id === track.id;
          return (
            <motion.div
              variants={fadeUp}
              key={track.id}
              onClick={() => onPlay(track)}
              className={cn(
                'group grid grid-cols-[2.5rem_3rem_1fr_auto_auto] gap-4 px-4 py-3.5',
                'items-center cursor-pointer transition-colors border-b border-white/[0.05] last:border-0',
                isCurrent ? 'bg-track/[0.08]' : 'hover:bg-white/[0.035]',
              )}
            >
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
                  by {track.artist || 'Unknown artist'}
                </p>
              </div>
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <HeartButton track={track} size="sm" />
              </div>
              {track.duration ? (
                <div className="hidden md:flex items-center gap-2 text-ink-4">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono text-[12px] tabular-nums tracking-tight">
                    {track.duration}
                  </span>
                </div>
              ) : (
                <span className="hidden md:inline-block w-12" aria-hidden />
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

const RecentSearches = ({ searches, onPick, onClear }) => {
  if (!searches.length) {
    return (
      <EmptyState
        icon={Search}
        title="No recent searches yet"
        description="Your search history will appear here once you start looking."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="font-editorial text-[13px] text-ink-3">
          {searches.length} {searches.length === 1 ? 'search' : 'searches'}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sharp text-[12px] text-ink-3 hover:text-danger hover:bg-danger/10 transition-colors focus-ring"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="px-3.5 py-1.5 rounded-sharp text-[13px] border border-white/[0.10] text-ink-2 hover:text-ink hover:border-white/25 hover:bg-white/[0.04] transition-colors focus-ring"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

const LibraryEmptyState = ({ navigate }) => (
  <EmptyState
    icon={LibraryIcon}
    title="Your library is empty"
    description="Play a song, save a favorite, or run a search to start building your library."
    action={
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Button leftIcon={<Search className="w-4 h-4" />} onClick={() => navigate('/search')}>
          Start searching
        </Button>
        <Button
          variant="editorial"
          onClick={() => navigate('/trending')}
        >
          Browse trending
        </Button>
      </div>
    }
  />
);

export default LibraryPage;
