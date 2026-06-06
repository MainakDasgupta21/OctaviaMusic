import {
  useCallback,
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
  Play,
  X,
  CornerDownLeft,
  AlertTriangle,
  ListMusic,
  History,
  Sparkles,
} from 'lucide-react';
import { searchMusic } from '@/lib/api';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { useSettings } from '@/contexts/SettingsContext';
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
import {
  EMPTY_FILTERS,
  composeQuery,
  filtersFromSearchParams,
  hasAnyFilter,
  writeFiltersToSearchParams,
} from '@/lib/search-filter-state';
import { useRankedSearch } from '@/hooks/use-ranked-search';
import { artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { useHoverPrefetch } from '@/hooks/use-route-prefetch';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { usePersonalizationSignals } from '@/hooks/use-personalization-signals';
import { FilterChipBar } from '@/components/search/FilterChipBar';
import { QuickPresets } from '@/components/search/QuickPresets';
import { SearchRelatedRail } from '@/components/search/RelatedRail';
import SearchHighlight from '@/components/SearchHighlight';
import KindBadge from '@/components/ui-v2/KindBadge';
import TrendingChips from '@/components/search/TrendingChips';
import { useTrendingSearches } from '@/hooks/use-trending-searches';
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

const VALID_FILTERS = new Set(['all', 'song', 'album', 'artist', 'playlist']);

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Two completely separate states. `userText` is the *visible* search input
  // value — only ever what the user typed. `filters` is the structured filter
  // shape. The two are merged into a synthetic operator string for the
  // ranker, but the synthetic string is never shown.
  const [userText, setUserText] = useState(() => searchParams.get('q') || '');
  const [filters, setFilters] = useState(() => filtersFromSearchParams(searchParams));

  const initialType = (() => {
    const fromUrl = searchParams.get('type');
    return fromUrl && VALID_FILTERS.has(fromUrl) ? fromUrl : 'all';
  })();
  const [filter, setFilter] = useState(initialType);
  const [recents, setRecents] = useState(() => readRecents());
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const { playTrack, addToQueue, history, currentTrack } = usePlayer();
  const { list: favorites } = useFavorites();
  const { playlists } = usePlaylists();
  const { settings } = useSettings();
  const vimNav = Boolean(settings?.vimNavigation);
  const { masthead } = useEditorialMeta();
  const { onAlbum: prefetchAlbumRoute, onArtist: prefetchArtistRoute } = useHoverPrefetch();
  const { historyArtistCounts, recentSearchTerms } = usePersonalizationSignals();
  const { terms: trendingTerms } = useTrendingSearches();

  // The synthetic operator string the existing parseQuery() ranker pipeline
  // expects. Built from userText + structured filters — internal only.
  const composedQuery = useMemo(
    () => composeQuery(userText, filters),
    [userText, filters],
  );
  const debouncedQuery = useDebouncedValue(composedQuery.trim(), 250);

  // ---- URL sync: userText <-> ?q= ----
  useEffect(() => {
    const current = searchParams.get('q') || '';
    if (userText === current) return;
    const next = new URLSearchParams(searchParams);
    if (userText) next.set('q', userText);
    else next.delete('q');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userText]);

  useEffect(() => {
    const fromUrl = searchParams.get('q') || '';
    if (fromUrl !== userText) setUserText(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('q')]);

  // ---- URL sync: filters <-> ?sort=, ?yearFrom=, ?yearTo=, ?duration=,
  //                            ?artist=, ?album=, ?clean=, ?mood=, ?exclude= ----
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    writeFiltersToSearchParams(next, filters);
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // External URL changes (back/forward, deep links) seed local state.
  useEffect(() => {
    const fromUrl = filtersFromSearchParams(searchParams);
    setFilters((prev) =>
      JSON.stringify(prev) === JSON.stringify(fromUrl) ? prev : fromUrl,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams.get('sort'),
    searchParams.get('yearFrom'),
    searchParams.get('yearTo'),
    searchParams.get('duration'),
    searchParams.get('artist'),
    searchParams.get('album'),
    searchParams.get('clean'),
    searchParams.get('mood'),
    searchParams.get('exclude'),
  ]);

  // ---- URL sync: type tab <-> ?type= ----
  useEffect(() => {
    const current = searchParams.get('type') || '';
    const desired = filter === 'all' ? '' : filter;
    if (current === desired) return;
    const next = new URLSearchParams(searchParams);
    if (desired) next.set('type', desired);
    else next.delete('type');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const fromUrl = searchParams.get('type') || 'all';
    const next = VALID_FILTERS.has(fromUrl) ? fromUrl : 'all';
    if (next !== filter) setFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('type')]);

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

  // Stable helper so callers (Enter handler, suggestion click, recent click,
  // result row activation) can commit a term to recents without leaking
  // half-typed debounce noise into the list.
  const commitRecent = useCallback((term) => {
    const trimmed = String(term || '').trim();
    if (!trimmed) return;
    setRecents((prev) => {
      const next = [
        trimmed,
        ...prev.filter((x) => x.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, 8);
      writeRecents(next);
      return next;
    });
  }, []);

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

  useEffect(() => {
    setSelectedIdx(0);
  }, [debouncedQuery, displayFilter]);

  // Keep the keyboard-focused row in view as the user arrows through the
  // list. `scrollIntoView({ block: 'nearest' })` is the cheapest, least
  // jumpy variant — the viewport only scrolls when the row is actually
  // outside it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const node = document.getElementById(`search-result-${selectedIdx}`);
    if (node) {
      node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [selectedIdx]);

  useEffect(() => {
    const onKey = (e) => {
      if (!songs.length) return;
      if (document.activeElement !== inputRef.current && !document.activeElement?.matches('body')) return;
      // Vim keys are alphanumeric — never hijack them while the user is
      // actively typing in the search input, even with the setting on.
      const focusInsideInput = document.activeElement === inputRef.current;
      const allowVim = vimNav && !focusInsideInput;
      const isDown = e.key === 'ArrowDown' || (allowVim && e.key === 'j');
      const isUp = e.key === 'ArrowUp' || (allowVim && e.key === 'k');
      const isFirst = allowVim && e.key === 'g' && !e.shiftKey;
      const isLast = allowVim && e.key === 'G' && e.shiftKey;
      if (isDown) {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(songs.length - 1, i + 1));
      } else if (isUp) {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (isFirst) {
        e.preventDefault();
        setSelectedIdx(0);
      } else if (isLast) {
        e.preventDefault();
        setSelectedIdx(songs.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const t = songs[selectedIdx];
        if (t) {
          playTrack(toTrack(t));
          commitRecent(userText);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const t = songs[selectedIdx];
        if (t) {
          addToQueue(toTrack(t));
          commitRecent(userText);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [songs, selectedIdx, playTrack, addToQueue, commitRecent, userText, vimNav]);

  // The visible idle state is "no typed text AND no structured filter".
  // (If the user has filters but no text, we still want to surface the
  // filtered library/server results, so we treat that as a searched state.)
  const hasSearched = Boolean(debouncedQuery);
  const isIdle = !userText.trim() && !hasAnyFilter(filters);
  const showRecents = isIdle && recents.length > 0;
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
      id={`search-result-${globalIndex}`}
      role="option"
      aria-selected={selectedIdx === globalIndex}
      onClick={() => { playTrack(toTrack(track)); commitRecent(userText); }}
      onMouseEnter={() => setSelectedIdx(globalIndex)}
      className={cn(
        'group relative flex items-center gap-4 p-3.5 cursor-pointer border-b border-white/[0.05] last:border-0',
        // Active row keeps its accent fill; idle rows pick up the
        // universal `.row-hover` slide-in.
        selectedIdx === globalIndex
          ? "bg-track/[0.10] before:content-[''] before:absolute before:left-0 before:inset-y-2 before:w-0.5 before:bg-track before:rounded-full"
          : "row-hover hover:before:content-[''] hover:before:absolute hover:before:left-0 hover:before:inset-y-2 hover:before:w-0.5 hover:before:bg-track/40 hover:before:rounded-full",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'hidden md:inline-flex w-7 shrink-0 justify-end font-mono text-[10px] tabular-nums transition-colors',
          selectedIdx === globalIndex
            ? 'text-accent'
            : 'text-ink-4 group-hover:text-ink-3',
        )}
      >
        {String(globalIndex + 1).padStart(2, '0')}
      </span>
      <div className="relative w-12 h-12 flex-shrink-0">
        <SmartImage
          src={track.thumbnail}
          alt=""
          kind="track"
          rounded="rounded-sharp"
          className="w-12 h-12 ring-1 ring-white/10"
          imgClassName="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/65 via-black/45 to-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-sharp">
          <Play className="w-5 h-5 text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[14px] font-medium truncate inline-flex items-center gap-2 w-full',
            selectedIdx === globalIndex ? 'text-accent' : 'text-ink',
          )}
        >
          <span className="truncate">
            <SearchHighlight text={track.title} tokens={highlightTokens} />
          </span>
          <KindBadge kind={track.kind} />
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
      <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">
        <HeartButton track={toTrack(track)} size="sm" />
      </div>
      {track.duration ? (
        <span className="font-mono text-[12px] text-ink-4 tabular-nums hidden sm:inline tracking-tight min-w-[44px] text-right">
          {track.duration}
        </span>
      ) : null}
    </motion.div>
  );

  return (
    <div className="relative isolate p-5 md:p-10 max-w-[1600px] mx-auto pb-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-[720px] h-[720px] -z-10 opacity-60 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, hsl(var(--track-accent) / 0.10), transparent 65%)',
        }}
      />
      {/* Editorial masthead */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-10 pb-3 border-b border-white/[0.08]"
      >
        <span>{masthead}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink-3">✦</span>
          <span>The Octavia Daily · Search</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>The index</span>
      </div>

      <motion.div {...fadeUp} className="mb-6">
        <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
          <span className="w-8 h-px bg-track" />
          The index
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.88] tracking-[-0.01em] mask-rise headline-balance">
          <span>
            What do you{' '}
            <em className="font-editorial text-track not-italic">want to hear?</em>
          </span>
        </h1>
      </motion.div>

      <motion.div {...fadeUp} className="mb-5 max-w-3xl">
        <label htmlFor="search-page-input" className="sr-only">
          Search songs, artists, albums and lyrics
        </label>
        <Input
          id="search-page-input"
          ref={inputRef}
          autoFocus
          size="xl"
          variant="editorial"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Songs, artists, albums, lyrics…"
          leftIcon={<SearchIcon className="w-4 h-4" />}
          aria-label="Search songs, artists, albums and lyrics"
          className="shadow-elev-1 focus:shadow-elev-2 transition-shadow duration-short"
          // Combobox semantics so screen readers announce result count +
          // the currently focused row via `aria-activedescendant` (the row
          // ids are stamped on the song rows below).
          role="combobox"
          aria-expanded={songs.length > 0}
          aria-controls="search-results-list"
          aria-autocomplete="list"
          aria-activedescendant={
            songs.length > 0 ? `search-result-${selectedIdx}` : undefined
          }
          rightIcon={
            <div className="flex items-center gap-1">
              <VoiceSearchButton
                size="sm"
                onTranscript={(text) => {
                  setUserText(text);
                  inputRef.current?.focus();
                }}
              />
              {userText ? (
                <button
                  type="button"
                  onClick={() => {
                    setUserText('');
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

      {hasSearched && !isLoading ? (
        <motion.p
          {...fadeUp}
          className="mb-5 -mt-2 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4"
        >
          <span className="text-ink-3 tabular-nums">{songs.length}</span> songs
          <span className="mx-2 text-ink-4/40">·</span>
          <span className="text-ink-3 tabular-nums">{grouped.artists.length}</span> artists
          <span className="mx-2 text-ink-4/40">·</span>
          <span className="text-ink-3 tabular-nums">{grouped.albums.length}</span> albums
        </motion.p>
      ) : null}

      <div className="mb-9">
        <FilterChipBar
          filters={filters}
          type={filter}
          onFiltersChange={setFilters}
          onTypeChange={setFilter}
        />
      </div>

      <AnimatePresence mode="wait">
        {isLoading && hasSearched ? (
          <motion.div key="loading" {...fadeUp} className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3.5 rounded-sharp border border-white/[0.05] bg-surface-2/40"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Skeleton className="w-12 h-12 rounded-sharp" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/4 mt-2" />
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
        ) : isIdle ? (
          // Idle state: presets + recents + trending. Presets write through
          // structured filter state so the search input stays untouched and
          // chips appear above as soon as one is picked.
          <motion.div key="idle" {...fadeUp} className="space-y-10">
            <QuickPresets
              filters={filters}
              onFiltersChange={(next) => {
                setFilters(next);
                inputRef.current?.focus();
              }}
            />

            {showRecents ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 inline-flex items-center gap-1.5">
                    <History className="w-3 h-3" />
                    Recent searches
                  </p>
                  <button
                    type="button"
                    onClick={() => { setRecents([]); writeRecents([]); }}
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 hover:text-ink focus-ring rounded-sharp px-2 py-1 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recents.map((r) => (
                    <div
                      key={r}
                      className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-sharp border border-white/[0.10] bg-gradient-to-b from-white/[0.04] to-white/[0.01] text-[13px] hover:from-white/[0.07] hover:to-white/[0.02] hover:border-white/25 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => { setUserText(r); inputRef.current?.focus(); }}
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
              </div>
            ) : null}

            {trendingTerms.length > 0 ? (
              <TrendingChips
                terms={trendingTerms}
                title="Trending right now"
                onPick={(term) => {
                  setUserText(term);
                  commitRecent(term);
                  inputRef.current?.focus();
                }}
              />
            ) : null}
          </motion.div>
        ) : isEmpty ? (
          <motion.div key="empty" {...fadeUp} className="space-y-5">
            <EmptyState
              icon={SearchIcon}
              title={userText ? `No results for "${userText}"` : 'No results match those filters'}
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
                        setUserText(s);
                        commitRecent(s);
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
            variants={staggerChildren(0.045)}
            initial="initial"
            animate="animate"
            className="space-y-14"
          >
            {didYouMean ? (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                className="rounded-sharp border border-track/25 bg-track/[0.08] px-5 py-3.5"
              >
                <p className="text-[13px] text-ink-2 inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    Did you mean{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setUserText(didYouMean);
                        commitRecent(didYouMean);
                        inputRef.current?.focus();
                      }}
                      className="text-accent hover:underline underline-offset-2 focus-ring rounded-sharp"
                    >
                      {didYouMean}
                    </button>
                    ?
                  </span>
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
                      setUserText(s);
                      commitRecent(s);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sharp border border-white/[0.10] bg-white/[0.03] text-[12.5px] text-ink-2 hover:text-ink hover:bg-white/[0.07] hover:border-white/[0.22] transition-colors focus-ring"
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
                    <SearchRelatedRail topResult={topResult} />
                  </motion.div>
                ) : null}

                {songs.length > 0 ? (
                  <div className="lg:col-span-2 min-w-0 space-y-5">
                    <SectionRule
                      ordinal="03"
                      label="Songs"
                      className="mb-3 mt-0"
                      trailing={
                        <div className="hidden md:flex items-center gap-4 text-[11px] text-ink-3">
                          <span className="inline-flex items-center gap-1">
                            <Kbd keys={['\u2191']} />
                            <Kbd keys={['\u2193']} />
                            <span className="font-editorial italic text-ink-3 ml-1">navigate</span>
                          </span>
                          <span className="inline-flex items-center gap-1 before:content-['\u00b7'] before:text-ink-4 before:mx-2">
                            <Kbd keys={['Enter']} />
                            <span className="font-editorial italic text-ink-3 ml-1">play</span>
                          </span>
                        </div>
                      }
                    />
                    {exactSongs.length > 0 ? (
                      <div>
                        <h3 className="eyebrow mb-2 px-1">Exact matches</h3>
                        <div
                          id="search-results-list"
                          role="listbox"
                          aria-label="Search results"
                          className="rounded-sharp border border-white/[0.06] bg-surface-2/40 backdrop-blur-md overflow-hidden"
                        >
                          {exactSongs.map((song, i) => renderSongRow(song, i))}
                        </div>
                      </div>
                    ) : null}

                    {relatedSongs.length > 0 ? (
                      <div>
                        <h3 className="eyebrow mb-2 px-1">Related songs</h3>
                        <div
                          role="listbox"
                          aria-label="Related song results"
                          className="rounded-sharp border border-white/[0.06] bg-surface-2/35 backdrop-blur-md overflow-hidden"
                        >
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
                          className="group block text-center rounded-sharp p-4 hover:bg-white/[0.03] hover:ring-1 hover:ring-inset hover:ring-white/[0.05] transition-colors focus-ring lift press"
                        >
                          <SmartImage
                            src={a.thumbnail}
                            alt={a.name}
                            kind="artist"
                            rounded="rounded-full"
                            className="w-full aspect-square ring-1 ring-white/[0.08] mb-3.5 group-hover:ring-track/50 transition-all duration-med ease-emphasis shadow-elev-1 group-hover:shadow-elev-3 group-hover:scale-[1.03]"
                            imgClassName="object-cover"
                          />
                          <p className="text-[13.5px] font-medium truncate text-ink">
                            <SearchHighlight text={a.name} tokens={highlightTokens} />
                          </p>
                          <p className="font-editorial italic tracking-[0.04em] text-[11.5px] text-ink-4">Artist</p>
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
                        className="group block rounded-sharp overflow-hidden focus-ring border border-white/[0.06] hover:border-white/[0.22] hover:ring-1 hover:ring-inset hover:ring-white/[0.04] transition-colors lift press"
                      >
                        <div className="aspect-square overflow-hidden">
                          <SmartImage
                            src={a.thumbnail}
                            alt={a.title}
                            kind="album"
                            rounded="rounded-none"
                            className="w-full h-full"
                            imgClassName="object-cover group-hover:scale-105 transition-transform duration-med ease-emphasis"
                          />
                        </div>
                        <div className="p-3.5">
                          <p className="text-[13.5px] font-medium truncate text-ink">
                            <SearchHighlight text={a.title} tokens={highlightTokens} />
                          </p>
                          <p className="font-editorial text-[12px] text-ink-3 truncate mt-0.5">
                            by{' '}
                            <SearchHighlight text={a.artist || ''} tokens={highlightTokens} />
                            {a.year ? <span className="text-ink-4">{` \u00b7 ${a.year}`}</span> : ''}
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
      className="relative group block w-full text-left p-6 rounded-sharp bg-surface-2/40 backdrop-blur-md border border-white/[0.06] hover:border-white/[0.18] hover:ring-1 hover:ring-inset hover:ring-white/[0.06] focus-ring shadow-elev-3 hover:shadow-elev-4 transition-shadow duration-med ease-emphasis lift press"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-sharp opacity-0 group-hover:opacity-100 transition-opacity duration-med"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, hsl(var(--track-accent) / 0.18), transparent 60%)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute top-5 right-5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4"
      >
        § Top result
      </span>
      <SmartImage
        src={thumbnail}
        alt=""
        kind={isArtist ? 'artist' : isAlbum ? 'album' : 'track'}
        rounded={isArtist ? 'rounded-full' : 'rounded-sharp'}
        className={`w-28 h-28 shadow-elev-3 mb-4 ring-1 ring-white/10`}
        imgClassName="object-cover"
      />
      <p className="eyebrow mb-2">{subtype}</p>
      <p className="font-display text-[28px] text-ink leading-[1.05] truncate headline-balance">
        <SearchHighlight text={title} tokens={tokens} />
      </p>
      {!isArtist ? (
        <p className="font-editorial text-[13px] text-ink-3 mt-1 truncate">
          by <SearchHighlight text={result.artist || ''} tokens={tokens} />
        </p>
      ) : null}
      {isSong ? (
        <span
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full text-track-fg flex items-center justify-center shadow-accent ring-1 ring-white/15 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-hover:animate-pulse transition-all duration-med ease-emphasis"
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
