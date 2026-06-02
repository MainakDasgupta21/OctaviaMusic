import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  Music,
  User,
  Disc,
  ListMusic,
  Play,
  X,
  CornerDownLeft,
  AlertTriangle,
} from 'lucide-react';
import { searchMusic } from '@/lib/api';
import { usePlayer } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import EmptyState from '@/components/ui-v2/EmptyState';
import Input from '@/components/ui-v2/Input';
import Skeleton from '@/components/ui-v2/Skeleton';
import Kbd from '@/components/ui-v2/Kbd';
import { fadeUp, staggerChildren } from '@/design/motion';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'harmony.recent-searches.v1';

const readRecents = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeRecents = (arr) => {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 8)));
  } catch {
    /* noop */
  }
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'song', label: 'Songs', icon: Music },
  { id: 'artist', label: 'Artists', icon: User },
  { id: 'album', label: 'Albums', icon: Disc },
  { id: 'playlist', label: 'Playlists', icon: ListMusic },
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

// Debounced state hook — used by the input to avoid a fetch per keystroke.
const useDebouncedValue = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const toTrack = (r) => ({
  id: r.id,
  videoId: r.videoId,
  title: r.title,
  artist: r.artist,
  thumbnail: r.thumbnail,
  duration: r.duration,
});

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [filter, setFilter] = useState('all');
  const [recents, setRecents] = useState(() => readRecents());
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const { playTrack, addToQueue } = usePlayer();
  const masthead = useMemo(() => formatMasthead(), []);

  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  useEffect(() => {
    const current = searchParams.get('q') || '';
    if (query === current) return;
    const next = new URLSearchParams(searchParams);
    if (query) next.set('q', query);
    else next.delete('q');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const fromUrl = searchParams.get('q') || '';
    if (fromUrl !== query) setQuery(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('q')]);

  const serverType = filter === 'playlist' ? null : filter;

  const {
    data: results = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['search', debouncedQuery, serverType],
    queryFn: () => searchMusic(debouncedQuery, serverType),
    enabled: Boolean(debouncedQuery) && serverType !== null,
    // v5: keep the prior results painted while the next query resolves so the
    // list never flashes to empty as the user types / switches filters.
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!debouncedQuery) return;
    setRecents((prev) => {
      const next = [
        debouncedQuery,
        ...prev.filter((x) => x.toLowerCase() !== debouncedQuery.toLowerCase()),
      ].slice(0, 8);
      writeRecents(next);
      return next;
    });
  }, [debouncedQuery]);

  const grouped = useMemo(() => {
    const songs = [];
    const artists = [];
    const albums = [];
    for (const r of results) {
      if (r.type === 'song' || !r.type) songs.push(r);
      else if (r.type === 'artist') artists.push(r);
      else if (r.type === 'album') albums.push(r);
    }
    return { songs, artists, albums, playlists: [] };
  }, [results]);

  const topResult = grouped.songs[0] || grouped.artists[0] || grouped.albums[0] || null;
  const songs = grouped.songs;

  useEffect(() => { setSelectedIdx(0); }, [results, filter]);

  useEffect(() => {
    const onKey = (e) => {
      if (!songs.length) return;
      if (document.activeElement !== inputRef.current && !document.activeElement?.matches('body')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(songs.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const t = songs[selectedIdx];
        if (t) playTrack(toTrack(t));
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const t = songs[selectedIdx];
        if (t) addToQueue(toTrack(t));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [songs, selectedIdx, playTrack, addToQueue]);

  const hasSearched = Boolean(debouncedQuery);
  const showRecents = !query.trim() && recents.length > 0;
  const isEmpty = hasSearched && !isLoading && results.length === 0;
  const isPlaylistFilter = filter === 'playlist';

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
          <span>The Harmony Hub Daily · Search</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>The index</span>
      </div>

      <motion.div {...fadeUp} className="mb-7">
        <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
          <span className="w-6 h-px bg-track" />
          The index
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
          <span>
            What do you{' '}
            <em className="font-editorial text-track not-italic">want to hear?</em>
          </span>
        </h1>
      </motion.div>

      <motion.div {...fadeUp} className="mb-5 max-w-3xl">
        <Input
          ref={inputRef}
          autoFocus
          size="xl"
          variant="editorial"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Songs, artists, albums, lyrics…"
          leftIcon={<SearchIcon className="w-4 h-4" />}
          rightIcon={query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="text-ink-3 hover:text-ink focus-ring rounded-sharp p-1"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        />
      </motion.div>

      {/* Editorial filter chips */}
      <div className="flex items-center gap-2 mb-9 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sharp text-[12px] font-mono uppercase tracking-[0.18em] whitespace-nowrap focus-ring transition-colors duration-short',
                active
                  ? 'bg-track/15 text-accent border border-track/40'
                  : 'bg-transparent border border-white/[0.10] text-ink-3 hover:text-ink hover:border-white/25 hover:bg-white/[0.04]',
              )}
            >
              {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
              {f.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {isLoading && hasSearched ? (
          <motion.div key="loading" {...fadeUp} className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-sharp border border-white/[0.05] bg-surface-2/40"
              >
                <Skeleton className="w-14 h-14 rounded-sharp" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="w-12 h-3" />
              </div>
            ))}
          </motion.div>
        ) : isError ? (
          <motion.div key="error" {...fadeUp}>
            <EmptyState
              icon={AlertTriangle}
              title="Search is offline"
              description="We couldn't reach the catalog service. Try again in a moment."
            />
          </motion.div>
        ) : isPlaylistFilter ? (
          <motion.div key="playlists-empty" {...fadeUp}>
            <EmptyState
              icon={ListMusic}
              title="Playlists live in your library"
              description="Search doesn't cover community playlists yet. Browse the ones you've created on the Library page."
            />
          </motion.div>
        ) : showRecents ? (
          <motion.div key="recents" {...fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4">
                Recent searches
              </h2>
              <button
                type="button"
                onClick={() => { setRecents([]); writeRecents([]); }}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-2 py-1"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recents.map((r) => (
                <div
                  key={r}
                  className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-sharp bg-transparent border border-white/[0.10] text-[13px] hover:border-white/25 hover:bg-white/[0.04] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => { setQuery(r); inputRef.current?.focus(); }}
                    className="focus-ring rounded-sharp text-ink-2 hover:text-ink"
                  >
                    {r}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = recents.filter((x) => x !== r);
                      setRecents(next);
                      writeRecents(next);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink focus-ring rounded-sharp p-0.5"
                    aria-label={`Remove ${r}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : isEmpty ? (
          <motion.div key="empty" {...fadeUp}>
            <EmptyState
              icon={SearchIcon}
              title={`No results for "${query}"`}
              description="Try a different spelling, or broaden your filter."
            />
          </motion.div>
        ) : hasSearched ? (
          <motion.div
            key="results"
            variants={staggerChildren(0.03)}
            initial="initial"
            animate="animate"
            className="space-y-12"
          >
            {/* Top result + songs grid */}
            {grouped.songs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {topResult ? (
                  <motion.div variants={fadeUp} className="lg:col-span-1">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 mb-3 flex items-center gap-2">
                      <span className="w-4 h-px bg-ink-4/40" />
                      Top result
                    </h2>
                    <TopResultCard
                      result={topResult}
                      onPlay={() => topResult.type === 'song' || !topResult.type
                        ? playTrack(toTrack(topResult))
                        : navigate(topResult.type === 'artist'
                          ? `/artist/${topResult.slug}`
                          : `/album/${topResult.id}`)}
                      onNavigate={(to) => navigate(to)}
                    />
                  </motion.div>
                ) : null}

                <div className="lg:col-span-2 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 flex items-center gap-2">
                      <span className="w-4 h-px bg-ink-4/40" />
                      Songs
                    </h2>
                    <div className="flex items-center gap-3 text-[11px] text-ink-4">
                      <span className="hidden md:inline-flex items-center gap-1">
                        <Kbd keys={['\u2191']} />
                        <Kbd keys={['\u2193']} />
                        <span className="font-editorial italic text-ink-3 ml-1">navigate</span>
                      </span>
                      <span className="hidden md:inline-flex items-center gap-1">
                        <Kbd keys={['Enter']} />
                        <span className="font-editorial italic text-ink-3 ml-1">play</span>
                      </span>
                    </div>
                  </div>
                  <div className="rounded-sharp border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden">
                    {grouped.songs.map((r, i) => (
                      <motion.div
                        variants={fadeUp}
                        key={`${r.id}-${i}`}
                        onClick={() => playTrack(toTrack(r))}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className={cn(
                          'group flex items-center gap-4 p-3 cursor-pointer border-b border-white/[0.05] last:border-0 transition-colors',
                          selectedIdx === i ? 'bg-track/[0.10]' : 'hover:bg-white/[0.035]',
                        )}
                      >
                        <div className="relative w-12 h-12 rounded-sharp overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                          <img src={r.thumbnail} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 text-white fill-current" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-[14px] font-medium truncate',
                              selectedIdx === i ? 'text-accent' : 'text-ink',
                            )}
                          >
                            {r.title}
                          </p>
                          <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
                            by{' '}
                            {r.artistSlug ? (
                              <Link
                                to={`/artist/${r.artistSlug}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-ink hover:underline underline-offset-2 focus-ring rounded-sharp"
                              >
                                {r.artist}
                              </Link>
                            ) : (
                              r.artist
                            )}
                          </p>
                        </div>
                        {selectedIdx === i ? (
                          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-ink-3">
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        ) : null}
                        <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <HeartButton track={toTrack(r)} size="sm" />
                        </div>
                        {r.duration ? (
                          <span className="font-mono text-[12px] text-ink-4 tabular-nums hidden sm:inline tracking-tight">
                            {r.duration}
                          </span>
                        ) : null}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Artists */}
            {grouped.artists.length > 0 ? (
              <div>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-ink-4/40" />
                  Artists
                </h2>
                <motion.div
                  variants={staggerChildren(0.03)}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                >
                  {grouped.artists.map((a) => (
                    <motion.div variants={fadeUp} key={a.id}>
                      <Link
                        to={`/artist/${a.slug}`}
                        className="group block text-center rounded-sharp p-4 hover:bg-white/[0.03] transition-colors focus-ring"
                      >
                        <img
                          src={a.thumbnail}
                          alt={a.name}
                          className="w-full aspect-square rounded-full object-cover ring-1 ring-white/[0.08] mb-3 group-hover:ring-track/50 transition-all shadow-elev-1 group-hover:shadow-elev-3"
                        />
                        <p className="text-[13.5px] font-medium truncate text-ink">{a.name}</p>
                        <p className="font-editorial text-[11.5px] text-ink-3">Artist</p>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ) : null}

            {/* Albums */}
            {grouped.albums.length > 0 ? (
              <div>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-ink-4/40" />
                  Albums
                </h2>
                <motion.div
                  variants={staggerChildren(0.03)}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                >
                  {grouped.albums.map((a) => (
                    <motion.div variants={fadeUp} key={a.id}>
                      <Link
                        to={`/album/${a.id}`}
                        className="group block rounded-sharp overflow-hidden focus-ring border border-white/[0.06] hover:border-white/[0.18] transition-colors"
                      >
                        <div className="aspect-square overflow-hidden">
                          <img
                            src={a.thumbnail}
                            alt={a.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-[13.5px] font-medium truncate text-ink">{a.title}</p>
                          <p className="font-editorial text-[12px] text-ink-3 truncate mt-0.5">
                            by {a.artist}{a.year ? ` \u00b7 ${a.year}` : ''}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div key="browse" {...fadeUp}>
            <EmptyState
              icon={Music}
              title="Search the catalog"
              description="Type a song, artist, album, or lyric. Use arrow keys to navigate, Enter to play."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TopResultCard = ({ result, onPlay, onNavigate }) => {
  const isSong = result.type === 'song' || !result.type;
  const isArtist = result.type === 'artist';
  const isAlbum = result.type === 'album';

  const subtype = isSong ? 'Song' : isArtist ? 'Artist' : isAlbum ? 'Album' : '';
  const title = isArtist ? result.name : result.title;
  const thumbnail = result.thumbnail;
  const target = isArtist ? `/artist/${result.slug}`
    : isAlbum ? `/album/${result.id}`
    : null;

  return (
    <button
      type="button"
      onClick={() => {
        if (target && !isSong) onNavigate(target);
        else onPlay();
      }}
      className="relative group block w-full text-left p-5 rounded-sharp bg-surface-2/40 backdrop-blur-md border border-white/[0.06] hover:border-white/[0.18] transition-colors focus-ring shadow-elev-2 hover:shadow-elev-3"
    >
      <img
        src={thumbnail}
        alt=""
        className={`w-24 h-24 ${isArtist ? 'rounded-full' : 'rounded-sharp'} object-cover shadow-elev-3 mb-4 ring-1 ring-white/10`}
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 mb-2">
        {subtype}
      </p>
      <p className="font-display text-2xl text-ink leading-tight truncate">{title}</p>
      {!isArtist ? (
        <p className="font-editorial text-[13px] text-ink-3 mt-1 truncate">
          by {result.artist}
        </p>
      ) : null}
      {isSong ? (
        <span
          className="absolute bottom-5 right-5 w-12 h-12 rounded-full text-track-fg flex items-center justify-center shadow-accent ring-1 ring-white/15 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-short"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.22), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
          }}
        >
          <Play className="w-5 h-5 fill-current" />
        </span>
      ) : null}
    </button>
  );
};

export default SearchPage;
