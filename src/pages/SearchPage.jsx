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
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import HeartButton from '@/components/HeartButton';
import EmptyState from '@/components/ui-v2/EmptyState';
import Input from '@/components/ui-v2/Input';
import Skeleton from '@/components/ui-v2/Skeleton';
import Kbd from '@/components/ui-v2/Kbd';
import Button from '@/components/ui-v2/Button';
import SectionRule from '@/components/ui-v2/SectionRule';
import SmartImage from '@/components/SmartImage';
import { fadeUp, staggerChildren } from '@/design/motion';
import { parseQuery } from '@/lib/search-rank';
import { useRankedSearch } from '@/hooks/use-ranked-search';
import { artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { useHoverPrefetch } from '@/hooks/use-route-prefetch';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { usePersonalizationSignals } from '@/hooks/use-personalization-signals';
import { SearchFilters } from '@/components/search/SearchFilters';
import { ActiveFilterChips } from '@/components/search/ActiveFilterChips';
import { RelatedRail } from '@/components/search/RelatedRail';
import SearchHighlight from '@/components/SearchHighlight';
import VoiceSearchButton from '@/components/search/VoiceSearchButton';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'octavia.recent-searches.v1';

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

const OPERATOR_HINTS = [
  { label: 'artist:"..."', value: 'artist:""' },
  { label: 'album:"..."', value: 'album:""' },
  { label: 'type:song', value: 'type:song' },
  { label: 'year>=2020', value: 'year>=2020' },
  { label: 'duration<3:30', value: 'duration<3:30' },
  { label: '-live', value: '-live' },
];

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

const itemIdentity = (item) =>
  item?.videoId || item?.id || `${item?.title || item?.name || ''}::${item?.artist || ''}`;

const resultKind = (item) => {
  if (!item) return 'song';
  const explicit = (item._kind || item.type || '').toLowerCase();
  if (explicit === 'album' || explicit === 'artist' || explicit === 'song') return explicit;
  if (item.name && !item.title) return 'artist';
  return 'song';
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [filter, setFilter] = useState('all');
  const [recents, setRecents] = useState(() => readRecents());
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const { playTrack, addToQueue, history, currentTrack } = usePlayer();
  const { list: favorites } = useFavorites();
  const { playlists } = usePlaylists();
  const { masthead } = useEditorialMeta();
  const { onAlbum: prefetchAlbumRoute, onArtist: prefetchArtistRoute } = useHoverPrefetch();
  const { historyArtistCounts, recentSearchTerms } = usePersonalizationSignals();

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

  const parsedQuery = useMemo(() => parseQuery(debouncedQuery), [debouncedQuery]);
  const highlightTokens = parsedQuery.tokens || [];
  const chipType = filter === 'playlist' ? null : filter;
  const operatorType = parsedQuery.filters?.type || null;
  const serverType = chipType === null ? null : operatorType || chipType;
  const serverQuery =
    parsedQuery.terms ||
    parsedQuery.filters?.artist ||
    parsedQuery.filters?.album ||
    '';
  const shouldFetchServer = Boolean(serverQuery) && serverType !== null;

  // SearchPage requests the richer 60-row payload so its 5-up grids fill in.
  // The TopBar's typing-pause prefetch in `useInstantSearch` warms exactly
  // this key so the page renders instantly when you press Enter / View all.
  const SEARCH_LIMIT = 60;
  const {
    data: results = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.search(serverQuery, serverType || 'all', SEARCH_LIMIT),
    queryFn: () =>
      searchMusic(serverQuery, serverType || 'all', { limit: SEARCH_LIMIT }),
    enabled: shouldFetchServer,
    ...cachePolicy.search,
    // v5: keep the prior results painted while the next query resolves so the
    // list never flashes to empty as the user types / switches filters.
    placeholderData: keepPreviousData,
  });

  // Real YTM autocomplete. Used to power a richer "Did you mean?" banner
  // that prefers YTM's official suggestion over our local Levenshtein
  // fallback (better at handling typos / partials / phonetic variations).
  const { suggestions: serverSuggestions } = useSearchSuggestions(debouncedQuery, {
    enabled: Boolean(debouncedQuery),
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

  const rankParams = useMemo(() => {
    const displayFilter = filter === 'playlist' ? filter : operatorType || filter;
    const includeLibrary = displayFilter === 'all' || displayFilter === 'song';
    return {
      query: parsedQuery,
      serverResults: results,
      favorites: includeLibrary ? favorites : [],
      history: includeLibrary ? history : [],
      playlists: includeLibrary ? playlists : [],
      currentArtist: currentTrack?.artist || '',
      // Higher than the upstream payload (60) so library + history + playlists
      // can layer on without crowding out server hits.
      limit: 120,
      historyArtistCounts,
      recentSearchTerms,
    };
  }, [
    filter,
    operatorType,
    parsedQuery,
    results,
    favorites,
    history,
    playlists,
    currentTrack?.artist,
    historyArtistCounts,
    recentSearchTerms,
  ]);

  // Worker-backed ranker. Falls back to sync `rankAndMerge` for small
  // payloads and in environments without Worker support (jsdom tests).
  const ranked = useRankedSearch(rankParams);

  const displayFilter = filter === 'playlist' ? filter : operatorType || filter;

  const grouped = useMemo(() => {
    if (displayFilter === 'song') {
      return {
        songs: ranked.songs,
        songExact: ranked.songExact,
        songRelated: ranked.songRelated,
        artists: [],
        albums: [],
        playlists: [],
        library: ranked.library,
        didYouMean: ranked.didYouMean,
        top: ranked.songs[0] || ranked.top || null,
      };
    }
    if (displayFilter === 'artist') {
      return {
        songs: [],
        songExact: [],
        songRelated: [],
        artists: ranked.artists,
        albums: [],
        playlists: [],
        library: [],
        didYouMean: ranked.didYouMean,
        top: ranked.artists[0] || null,
      };
    }
    if (displayFilter === 'album') {
      return {
        songs: [],
        songExact: [],
        songRelated: [],
        artists: [],
        albums: ranked.albums,
        playlists: [],
        library: [],
        didYouMean: ranked.didYouMean,
        top: ranked.albums[0] || null,
      };
    }
    return {
      songs: ranked.songs,
      songExact: ranked.songExact,
      songRelated: ranked.songRelated,
      artists: ranked.artists,
      albums: ranked.albums,
      playlists: [],
      library: ranked.library,
      didYouMean: ranked.didYouMean,
      top: ranked.top,
    };
  }, [displayFilter, ranked]);

  const topResult = grouped.top || grouped.songs[0] || grouped.artists[0] || grouped.albums[0] || null;
  const topSongIdentity = resultKind(topResult) === 'song' ? itemIdentity(topResult) : null;
  const exactSongs = useMemo(
    () => grouped.songExact.filter((song) => itemIdentity(song) !== topSongIdentity),
    [grouped.songExact, topSongIdentity],
  );
  const relatedSongs = useMemo(
    () => grouped.songRelated.filter((song) => itemIdentity(song) !== topSongIdentity),
    [grouped.songRelated, topSongIdentity],
  );
  const songs = useMemo(() => [...exactSongs, ...relatedSongs], [exactSongs, relatedSongs]);

  const appendOperator = (snippet) => {
    setQuery((prev) => {
      const base = prev.trimEnd();
      return base ? `${base} ${snippet}` : snippet;
    });
    inputRef.current?.focus();
  };

  useEffect(() => {
    setSelectedIdx(0);
  }, [debouncedQuery, displayFilter]);

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
  const totalHits =
    grouped.songs.length +
    grouped.artists.length +
    grouped.albums.length +
    grouped.library.length;
  const isEmpty = hasSearched && !isLoading && totalHits === 0;
  const isPlaylistFilter = filter === 'playlist';

  // Suggestion strip: top 5 YTM autocompletes (excluding the current query).
  // The first hit also drives the "Did you mean?" banner when the local
  // Levenshtein fallback wouldn't otherwise show one.
  const lowerQuery = debouncedQuery.toLowerCase();
  const filteredSuggestions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const raw of serverSuggestions) {
      const trimmed = String(raw || '').trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (key === lowerQuery) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= 5) break;
    }
    return out;
  }, [serverSuggestions, lowerQuery]);

  const topResultScore = grouped.top?._score ?? 0;
  const showSuggestionStrip =
    filteredSuggestions.length > 0 &&
    (totalHits === 0 || topResultScore < 220);
  const didYouMean = grouped.didYouMean || filteredSuggestions[0] || null;
  const librarySourceLabel = (entry) => {
    const sources = entry?._librarySources || [];
    if (sources.includes('favorite') && sources.includes('history')) {
      return 'Saved + recently played';
    }
    if (sources.includes('favorite')) return 'Saved in favorites';
    if (sources.includes('history')) return 'From listening history';
    if (sources.includes('playlist')) return 'From your playlists';
    return 'From your library';
  };

  const renderSongRow = (track, globalIndex) => (
    <motion.div
      variants={fadeUp}
      key={`${track.id || track.videoId || globalIndex}-${globalIndex}`}
      onClick={() => playTrack(toTrack(track))}
      onMouseEnter={() => setSelectedIdx(globalIndex)}
      className={cn(
        'group flex items-center gap-4 p-3 cursor-pointer border-b border-white/[0.05] last:border-0',
        // Active row keeps its accent fill; idle rows pick up the
        // universal `.row-hover` slide-in.
        selectedIdx === globalIndex ? 'bg-track/[0.10]' : 'row-hover',
      )}
    >
      <div className="relative w-12 h-12 flex-shrink-0">
        <SmartImage
          src={track.thumbnail}
          alt=""
          kind="track"
          rounded="rounded-sharp"
          className="w-12 h-12 ring-1 ring-white/10"
          imgClassName="object-cover"
        />
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-sharp">
          <Play className="w-4 h-4 text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[14px] font-medium truncate',
            selectedIdx === globalIndex ? 'text-accent' : 'text-ink',
          )}
        >
          <SearchHighlight text={track.title} tokens={highlightTokens} />
        </p>
        <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
          by{' '}
          {(() => {
            const slug = artistSlugOf(track);
            const artistName = track.artist || 'Unknown artist';
            return isUsableArtistSlug(slug) ? (
              <Link
                to={`/artist/${slug}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-ink hover:underline underline-offset-2 focus-ring rounded-sharp"
              >
                <SearchHighlight text={artistName} tokens={highlightTokens} />
              </Link>
            ) : (
              <SearchHighlight text={artistName} tokens={highlightTokens} />
            );
          })()}
        </p>
      </div>
      {selectedIdx === globalIndex ? (
        <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-ink-3">
          <CornerDownLeft className="w-3 h-3" />
        </span>
      ) : null}
      <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <HeartButton track={toTrack(track)} size="sm" />
      </div>
      {track.duration ? (
        <span className="font-mono text-[12px] text-ink-4 tabular-nums hidden sm:inline tracking-tight">
          {track.duration}
        </span>
      ) : null}
    </motion.div>
  );

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
          <span>The Octavia Daily · Search</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>The index</span>
      </div>

      <motion.div {...fadeUp} className="mb-7">
        <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
          <span className="w-6 h-px bg-track" />
          The index
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise headline-balance">
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
          rightIcon={
            <div className="flex items-center gap-1.5">
              <VoiceSearchButton
                size="sm"
                onTranscript={(text) => {
                  setQuery(text);
                  inputRef.current?.focus();
                }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-ink-3 hover:text-ink focus-ring rounded-sharp p-1"
                  aria-label="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          }
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

      <div className="mb-7 flex flex-wrap items-center gap-1.5">
        <SearchFilters
          query={query}
          parsed={parsedQuery}
          onChange={(next) => setQuery(next)}
        />
        <span className="ml-2 mr-1 text-[10px] font-mono uppercase tracking-[0.14em] text-ink-4">
          Power operators
        </span>
        {OPERATOR_HINTS.map((hint) => (
          <button
            key={hint.label}
            type="button"
            onClick={() => appendOperator(hint.value)}
            className="rounded-sharp border border-white/[0.10] bg-white/[0.02] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.08em] text-ink-3 transition-colors hover:border-white/[0.24] hover:bg-white/[0.06] hover:text-ink focus-ring"
          >
            {hint.label}
          </button>
        ))}
      </div>

      <div className="mb-7 empty:hidden">
        <ActiveFilterChips
          query={query}
          parsed={parsedQuery}
          onChange={(next) => setQuery(next)}
        />
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
              action={
                <Button onClick={() => refetch()} size="md">
                  Try again
                </Button>
              }
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
              <h2 className="eyebrow">Recent searches</h2>
              <button
                type="button"
                onClick={() => { setRecents([]); writeRecents([]); }}
                className="eyebrow hover:text-ink focus-ring rounded-sharp px-2 py-1 transition-colors"
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
          <motion.div key="empty" {...fadeUp} className="space-y-5">
            <EmptyState
              icon={SearchIcon}
              title={`No results for "${query}"`}
              description="Try a different spelling, or broaden your filter."
            />
            {filteredSuggestions.length > 0 ? (
              <div>
                <p className="eyebrow mb-3">Did you mean</p>

                <div className="flex flex-wrap gap-2">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setQuery(s);
                        inputRef.current?.focus();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sharp border border-white/[0.10] bg-white/[0.02] text-[13px] text-ink-2 hover:text-ink hover:bg-white/[0.06] hover:border-white/[0.22] transition-colors focus-ring"
                    >
                      <SearchIcon className="w-3 h-3 text-ink-3" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : hasSearched ? (
          <motion.div
            key="results"
            variants={staggerChildren(0.03)}
            initial="initial"
            animate="animate"
            className="space-y-12"
          >
            {didYouMean ? (
              <motion.div variants={fadeUp} className="rounded-sharp border border-track/25 bg-track/[0.08] px-4 py-3">
                <p className="text-[13px] text-ink-2">
                  Did you mean{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(didYouMean);
                      inputRef.current?.focus();
                    }}
                    className="text-accent hover:underline underline-offset-2 focus-ring rounded-sharp"
                  >
                    {didYouMean}
                  </button>
                  ?
                </p>
              </motion.div>
            ) : null}

            {showSuggestionStrip ? (
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
                <span className="eyebrow mr-1">Try</span>

                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sharp border border-white/[0.10] bg-white/[0.02] text-[12.5px] text-ink-2 hover:text-ink hover:bg-white/[0.06] hover:border-white/[0.22] transition-colors focus-ring"
                  >
                    <SearchIcon className="w-3 h-3 text-ink-3" />
                    {s}
                  </button>
                ))}
              </motion.div>
            ) : null}

            {(filter === 'all' || filter === 'song') && grouped.library.length > 0 ? (
              <div>
                <SectionRule ordinal="01" label="From your library" className="mb-3 mt-0" />
                <div className="rounded-sharp border border-white/[0.06] bg-surface-2/35 backdrop-blur-md overflow-hidden">
                  {grouped.library.map((r, i) => (
                    <motion.div
                      variants={fadeUp}
                      key={`lib-${r.id || r.videoId}-${i}`}
                      onClick={() => playTrack(toTrack(r))}
                      className="group flex items-center gap-4 p-3 cursor-pointer border-b border-white/[0.05] last:border-0 row-hover"
                    >
                      <div className="relative w-11 h-11 flex-shrink-0">
                        <SmartImage
                          src={r.thumbnail}
                          alt=""
                          kind="track"
                          rounded="rounded-sharp"
                          className="w-11 h-11 ring-1 ring-white/10"
                          imgClassName="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-sharp">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate text-ink">
                          <SearchHighlight text={r.title} tokens={highlightTokens} />
                        </p>
                        <p className="text-[12px] text-ink-3 truncate mt-0.5">
                          {librarySourceLabel(r)}
                        </p>
                      </div>
                      <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <HeartButton track={toTrack(r)} size="sm" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Top result + songs grid */}
            {songs.length > 0 || topResult ? (
              <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8', songs.length === 0 && 'lg:grid-cols-1')}>
                {topResult ? (
                  <motion.div variants={fadeUp} className="lg:col-span-1">
                    <SectionRule ordinal="02" label="Top result" tone="accent" className="mb-3 mt-0" />

                    <TopResultCard
                      result={topResult}
                      tokens={highlightTokens}
                      onPlay={() =>
                        topResult.type === 'song' || !topResult.type
                          ? playTrack(toTrack(topResult))
                          : navigate(
                              topResult.type === 'artist'
                                ? `/artist/${topResult.slug}`
                                : `/album/${topResult.id}?from=search&autoplay=1`,
                            )
                      }
                      onNavigate={(to) => navigate(to)}
                    />
                    <RelatedRail topResult={topResult} />
                  </motion.div>
                ) : null}

                {songs.length > 0 ? (
                  <div className="lg:col-span-2 min-w-0 space-y-5">
                    <SectionRule
                      ordinal="03"
                      label="Songs"
                      className="mb-3 mt-0"
                      trailing={
                        <div className="hidden md:flex items-center gap-3 text-[11px] text-ink-4">
                          <span className="inline-flex items-center gap-1">
                            <Kbd keys={['\u2191']} />
                            <Kbd keys={['\u2193']} />
                            <span className="font-editorial italic text-ink-3 ml-1">navigate</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Kbd keys={['Enter']} />
                            <span className="font-editorial italic text-ink-3 ml-1">play</span>
                          </span>
                        </div>
                      }
                    />
                    {exactSongs.length > 0 ? (
                      <div>
                        <h3 className="eyebrow mb-2 px-1">Exact matches</h3>
                        <div className="rounded-sharp border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden">
                          {exactSongs.map((song, i) => renderSongRow(song, i))}
                        </div>
                      </div>
                    ) : null}

                    {relatedSongs.length > 0 ? (
                      <div>
                        <h3 className="eyebrow mb-2 px-1">Related songs</h3>
                        <div className="rounded-sharp border border-white/[0.06] bg-surface-2/35 backdrop-blur-md overflow-hidden">
                          {relatedSongs.map((song, i) => renderSongRow(song, exactSongs.length + i))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Artists */}
            {grouped.artists.length > 0 ? (
              <div>
                <SectionRule ordinal="04" label="Artists" className="mb-4 mt-0" />

                <motion.div
                  variants={staggerChildren(0.03)}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                >
                  {grouped.artists.map((a) => {
                    const slug = a.slug || a.artistSlug;
                    return (
                      <motion.div variants={fadeUp} key={a.id}>
                        <Link
                          to={isUsableArtistSlug(slug) ? `/artist/${slug}` : '#'}
                          aria-disabled={!isUsableArtistSlug(slug)}
                          onMouseEnter={() => prefetchArtistRoute(slug)}
                          onFocus={() => prefetchArtistRoute(slug)}
                          className="group block text-center rounded-sharp p-4 hover:bg-white/[0.03] transition-colors focus-ring lift press"
                        >
                          <SmartImage
                            src={a.thumbnail}
                            alt={a.name}
                            kind="artist"
                            rounded="rounded-full"
                            className="w-full aspect-square ring-1 ring-white/[0.08] mb-3 group-hover:ring-track/50 transition-all shadow-elev-1 group-hover:shadow-elev-3"
                            imgClassName="object-cover"
                          />
                          <p className="text-[13.5px] font-medium truncate text-ink">
                            <SearchHighlight text={a.name} tokens={highlightTokens} />
                          </p>
                          <p className="font-editorial text-[11.5px] text-ink-3">Artist</p>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            ) : null}

            {/* Albums */}
            {grouped.albums.length > 0 ? (
              <div>
                <SectionRule ordinal="05" label="Albums" className="mb-4 mt-0" />

                <motion.div
                  variants={staggerChildren(0.03)}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                >
                  {grouped.albums.map((a) => (
                    <motion.div variants={fadeUp} key={a.id}>
                      <Link
                        to={`/album/${a.id}?from=search&autoplay=1`}
                        onMouseEnter={() => prefetchAlbumRoute(a.id)}
                        onFocus={() => prefetchAlbumRoute(a.id)}
                        className="group block rounded-sharp overflow-hidden focus-ring border border-white/[0.06] hover:border-white/[0.18] transition-colors lift press"
                      >
                        <div className="aspect-square overflow-hidden">
                          <SmartImage
                            src={a.thumbnail}
                            alt={a.title}
                            kind="album"
                            rounded="rounded-none"
                            className="w-full h-full"
                            imgClassName="object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-[13.5px] font-medium truncate text-ink">
                            <SearchHighlight text={a.title} tokens={highlightTokens} />
                          </p>
                          <p className="font-editorial text-[12px] text-ink-3 truncate mt-0.5">
                            by{' '}
                            <SearchHighlight text={a.artist || ''} tokens={highlightTokens} />
                            {a.year ? ` \u00b7 ${a.year}` : ''}
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

const TopResultCard = ({ result, tokens = [], onPlay, onNavigate }) => {
  const isSong = result.type === 'song' || !result.type;
  const isArtist = result.type === 'artist';
  const isAlbum = result.type === 'album';

  const subtype = isSong ? 'Song' : isArtist ? 'Artist' : isAlbum ? 'Album' : '';
  const title = isArtist ? result.name : result.title;
  const thumbnail = result.thumbnail;
  const target = isArtist ? `/artist/${result.slug}`
    : isAlbum ? `/album/${result.id}?from=search&autoplay=1`
    : null;

  return (
    <button
      type="button"
      onClick={() => {
        if (target && !isSong) onNavigate(target);
        else onPlay();
      }}
      className="relative group block w-full text-left p-5 rounded-sharp bg-surface-2/40 backdrop-blur-md border border-white/[0.06] hover:border-white/[0.18] transition-colors focus-ring shadow-elev-2 hover:shadow-elev-3 lift press"
    >
      <SmartImage
        src={thumbnail}
        alt=""
        kind={isArtist ? 'artist' : isAlbum ? 'album' : 'track'}
        rounded={isArtist ? 'rounded-full' : 'rounded-sharp'}
        className={`w-24 h-24 shadow-elev-3 mb-4 ring-1 ring-white/10`}
        imgClassName="object-cover"
      />
      <p className="eyebrow mb-2">{subtype}</p>
      <p className="font-display text-2xl text-ink leading-tight truncate headline-balance">
        <SearchHighlight text={title} tokens={tokens} />
      </p>
      {!isArtist ? (
        <p className="font-editorial text-[13px] text-ink-3 mt-1 truncate">
          by <SearchHighlight text={result.artist || ''} tokens={tokens} />
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
