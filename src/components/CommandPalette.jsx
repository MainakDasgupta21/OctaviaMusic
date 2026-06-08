import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Home,
  Search,
  TrendingUp,
  BarChart3,
  Heart,
  Library,
  Play,
  Pause,
  Settings,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  VolumeX,
  Volume2,
  Music,
  Disc,
  Search as SearchIcon,
  Loader2,
  User,
  ListMusic,
  Compass,
  HelpCircle,
  ArrowRight,
  Plus,
  Hash,
  AtSign,
  ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUI } from '@/contexts/UIContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import usePlaylistActions from '@/hooks/use-playlist-actions';
import { searchMusic } from '@/lib/api';
import { parseQuery } from '@/lib/search-rank';
import { useRankedSearch } from '@/hooks/use-ranked-search';
import { usePersonalizationSignals } from '@/hooks/use-personalization-signals';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Kbd from '@/components/ui-v2/Kbd';
import SmartImage from '@/components/SmartImage';
import SearchHighlight from '@/components/SearchHighlight';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { artistSlugFromName, artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import { useHoverPrefetch } from '@/hooks/use-route-prefetch';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';

// =============================================================================
// Scoped prefixes:
//   :  navigation only
//   >  playback / actions only
//   @  artists only
//   #  playlists only
//   ?  help
// Empty input shows recent commands (Raycast pattern) + everything else.
// =============================================================================

const SCOPES = [
  { prefix: ':', label: 'Navigation', icon: Compass },
  { prefix: '>', label: 'Action', icon: ChevronRight },
  { prefix: '@', label: 'Artist', icon: AtSign },
  { prefix: '#', label: 'Playlist', icon: Hash },
  { prefix: '?', label: 'Help', icon: HelpCircle },
];

const navItems = [
  { id: 'nav-home', label: 'Go to Home', path: '/', icon: Home },
  { id: 'nav-search', label: 'Go to Search', path: '/search', icon: Search },
  { id: 'nav-trending', label: 'Go to Trending', path: '/trending', icon: TrendingUp },
  { id: 'nav-charts', label: 'Go to Charts', path: '/charts', icon: BarChart3 },
  { id: 'nav-explore', label: 'Go to Explore', path: '/explore', icon: Compass },
  { id: 'nav-favorites', label: 'Go to Favorites', path: '/favorites', icon: Heart },
  { id: 'nav-library', label: 'Go to Library', path: '/library', icon: Library },
  { id: 'nav-player', label: 'Go to Now Playing', path: '/player', icon: Play },
  { id: 'nav-settings', label: 'Open Settings', path: '/settings', icon: Settings },
];

const RECENT_KEY = 'octavia.palette.recent.v1';
const MAX_RECENTS = 6;

const loadRecents = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
};
const pushRecent = (item) => {
  try {
    const list = loadRecents().filter((x) => x.id !== item.id);
    list.unshift(item);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  } catch {
    /* noop */
  }
};

const detectScope = (query) => {
  if (!query) return null;
  const first = query[0];
  const s = SCOPES.find((x) => x.prefix === first);
  return s ? { scope: s, rest: query.slice(1).trim() } : null;
};

const EMPTY_SEARCH_BUCKETS = {
  songExact: [],
  songRelated: [],
  albums: [],
};

const songIdentity = (item) =>
  item?.videoId || item?.id || `${item?.title || ''}::${item?.artist || ''}`;

// Shared editorial heading classes for cmdk groups + selected style with hairline indicator
const GROUP_HEADING =
  'px-1 mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-editorial [&_[cmdk-group-heading]]:italic [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-ink-4 [&_[cmdk-group-heading]]:tracking-wide';

const ITEM_BASE =
  'group relative flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-sharp text-[13.5px] cursor-pointer transition-colors data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed data-[selected=true]:bg-white/[0.05] data-[selected=true]:text-ink aria-selected:bg-white/[0.05] aria-selected:text-ink';

// 1px left-bar appears on selected/hover via cmdk's data-selected attribute.
const SelectedBar = () => (
  <span
    aria-hidden="true"
    className="absolute left-0 top-2 bottom-2 w-px bg-transparent group-data-[selected=true]:bg-track group-aria-selected:bg-track transition-colors"
  />
);

const CommandPalette = () => {
  const navigate = useNavigate();
  const { paletteOpen, closePalette } = useUI();
  const {
    currentTrack,
    history,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    toggleMute,
    isMuted,
    volume,
    playTrack,
    addToQueue,
  } = usePlayer();
  const { list: favoritesList } = useFavorites();
  const {
    playlists,
    isTrackInPlaylist,
    addTrackToPlaylistWithFeedback,
    createPlaylistFromTrack,
  } = usePlaylistActions();
  const { onAlbum: prefetchAlbumRoute, onArtist: prefetchArtistRoute } = useHoverPrefetch();
  // Personalization parity with the TopBar / SearchPage ranker.
  const { historyArtistCounts, recentSearchTerms } = usePersonalizationSignals();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [recents, setRecents] = useState(() => loadRecents());

  useEffect(() => {
    if (!paletteOpen) {
      setQuery('');
      setDebounced('');
    } else {
      setRecents(loadRecents());
    }
  }, [paletteOpen]);

  // Debounce input → React Query handles caching, cancellation, deduping.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const scopeInfo = useMemo(() => detectScope(debounced), [debounced]);
  const effectiveQuery = scopeInfo ? scopeInfo.rest : debounced;

  const parsed = useMemo(
    () => parseQuery(effectiveQuery.trim()),
    [effectiveQuery],
  );
  const highlightTokens = parsed.tokens || [];
  const serverQuery =
    parsed.terms || parsed.filters?.artist || parsed.filters?.album || '';
  const serverType = parsed.filters?.type || 'all';

  const scopeAllowsSearch =
    !scopeInfo ||
    scopeInfo.scope.prefix === ':' ||
    scopeInfo.scope.prefix === '>' ||
    scopeInfo.scope.prefix === '?';
  const enabled =
    paletteOpen && scopeAllowsSearch && Boolean(serverQuery) && serverQuery.length >= 2;

  // Match the SearchPage limit so the palette and SearchPage share one cache
  // entry (palette opens, then user navigates to SearchPage → no refetch).
  const PALETTE_SEARCH_LIMIT = 60;

  const { data: rawResults = [], isFetching: searching } = useQuery({
    queryKey: queryKeys.search(serverQuery, serverType, PALETTE_SEARCH_LIMIT),
    queryFn: ({ signal }) =>
      searchMusic(serverQuery, serverType, { limit: PALETTE_SEARCH_LIMIT, signal }),
    enabled,
    ...cachePolicy.search,
    placeholderData: keepPreviousData,
  });

  // Real YTM autocomplete — used as a "Did you mean?" affordance when the
  // user mistypes (the main search returns nothing or weak hits).
  const { suggestions: rawSuggestions } = useSearchSuggestions(effectiveQuery, {
    enabled: paletteOpen && scopeAllowsSearch,
  });

  // Delegate ranking to the shared `useRankedSearch` hook so the palette's
  // 60-row payload gets the worker treatment automatically (the threshold is
  // 50). The TopBar's smaller pool stays on the main thread.
  const rankedSearchParams = useMemo(
    () => ({
      query: parsed,
      serverResults: rawResults,
      favorites: favoritesList,
      history,
      playlists,
      currentArtist: currentTrack?.artist || '',
      // Parity with TopBar + SearchPage: pass personalization signals so the
      // ranker can boost results matching the user's listening shape.
      historyArtistCounts,
      recentSearchTerms,
      limit: 24,
    }),
    [
      parsed,
      rawResults,
      favoritesList,
      history,
      playlists,
      currentTrack?.artist,
      historyArtistCounts,
      recentSearchTerms,
    ],
  );
  const ranked = useRankedSearch(rankedSearchParams, { workerEnabled: enabled });
  const searchBuckets = useMemo(() => {
    if (!enabled) return EMPTY_SEARCH_BUCKETS;
    const topSongIdentity =
      ranked.top && ranked.top._kind === 'song' ? songIdentity(ranked.top) : null;
    return {
      songExact: ranked.songExact
        .filter((song) => songIdentity(song) !== topSongIdentity)
        .slice(0, 4),
      songRelated: ranked.songRelated
        .filter((song) => songIdentity(song) !== topSongIdentity)
        .slice(0, 4),
      albums: ranked.albums.slice(0, 4),
    };
  }, [enabled, ranked]);

  const searchResults = useMemo(
    () => [...searchBuckets.songExact, ...searchBuckets.songRelated],
    [searchBuckets.songExact, searchBuckets.songRelated],
  );

  // Filter the suggestions to those that don't trivially match the input,
  // cap to 5, and only show them when the main search doesn't have a strong
  // top result (keeps the palette tidy when results are good).
  const lowerEffective = effectiveQuery.trim().toLowerCase();
  const suggestionItems = useMemo(() => {
    if (!enabled) return [];
    const seen = new Set();
    const out = [];
    for (const raw of rawSuggestions) {
      const trimmed = String(raw || '').trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (key === lowerEffective) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= 5) break;
    }
    return out;
  }, [enabled, rawSuggestions, lowerEffective]);

  const totalSearchHits =
    searchBuckets.songExact.length +
    searchBuckets.songRelated.length +
    searchBuckets.albums.length;
  const showSuggestionGroup =
    suggestionItems.length > 0 && (totalSearchHits === 0 || totalSearchHits < 3);

  const runAndClose = useCallback(
    (fn, recent) => () => {
      if (recent) {
        pushRecent(recent);
        setRecents(loadRecents());
      }
      fn();
      closePalette();
    },
    [closePalette],
  );

  const handlePlayResult = useCallback(
    (result) => {
      const track = {
        id: result.id,
        videoId: result.videoId,
        title: result.title,
        artist: result.artist,
        thumbnail: result.thumbnail,
        duration: result.duration,
      };
      pushRecent({
        id: `play-${track.id}`,
        label: `Play \u2014 ${track.title}`,
        kind: 'play',
        track,
      });
      setRecents(loadRecents());
      playTrack(track);
      closePalette();
    },
    [playTrack, closePalette],
  );

  const playbackItems = useMemo(
    () => [
      {
        id: 'pb-toggle',
        label: isPlaying ? 'Pause' : 'Play',
        icon: isPlaying ? Pause : Play,
        run: togglePlay,
        disabled: !currentTrack,
      },
      { id: 'pb-next', label: 'Next track', icon: SkipForward, run: playNext },
      { id: 'pb-prev', label: 'Previous track', icon: SkipBack, run: playPrevious },
      { id: 'pb-shuffle', label: 'Toggle shuffle', icon: Shuffle, run: toggleShuffle },
      { id: 'pb-repeat', label: 'Cycle repeat', icon: Repeat, run: toggleRepeat },
      {
        id: 'pb-mute',
        label: isMuted || volume === 0 ? 'Unmute' : 'Mute',
        icon: isMuted || volume === 0 ? VolumeX : Volume2,
        run: toggleMute,
      },
      {
        id: 'pb-add-queue',
        label: 'Add current to queue end',
        icon: ListMusic,
        run: () => {
          if (currentTrack) {
            addToQueue(currentTrack);
            notify.added(currentTrack.title);
          }
        },
        disabled: !currentTrack,
      },
    ],
    [
      isPlaying,
      currentTrack,
      togglePlay,
      playNext,
      playPrevious,
      toggleShuffle,
      toggleRepeat,
      toggleMute,
      isMuted,
      volume,
      addToQueue,
    ],
  );

  const playlistActionItems = useMemo(() => {
    if (!currentTrack?.id) return [];
    const items = [
      {
        id: 'pl-create-current',
        label: 'Create playlist from current track',
        icon: Plus,
        run: () => createPlaylistFromTrack({ track: currentTrack }),
        disabled: false,
      },
    ];
    playlists.slice(0, 8).forEach((playlist) => {
      const alreadyAdded = isTrackInPlaylist(playlist, currentTrack);
      items.push({
        id: `pl-add-${playlist.id}`,
        label: `Add current to ${playlist.name}`,
        icon: ListMusic,
        run: () => addTrackToPlaylistWithFeedback({ playlist, track: currentTrack }),
        disabled: alreadyAdded,
      });
    });
    return items;
  }, [
    currentTrack,
    playlists,
    createPlaylistFromTrack,
    isTrackInPlaylist,
    addTrackToPlaylistWithFeedback,
  ]);

  const showNav =
    !scopeInfo || scopeInfo.scope.prefix === ':' || scopeInfo.scope.prefix === '?';
  const showActions =
    !scopeInfo || scopeInfo.scope.prefix === '>' || scopeInfo.scope.prefix === '?';
  const showArtists = !scopeInfo || scopeInfo.scope.prefix === '@';
  const showPlaylists = !scopeInfo || scopeInfo.scope.prefix === '#';
  const showSongs = !scopeInfo || scopeInfo.scope.prefix === '>';
  const showAlbums = !scopeInfo;
  const showFavorites = !scopeInfo;
  const showRecents = !query && !scopeInfo && recents.length > 0;
  const showHelp = scopeInfo?.scope.prefix === '?';
  const showLoadingSkeletons =
    searching && Boolean(effectiveQuery.trim()) && effectiveQuery.trim().length >= 2;

  const artistOptions = useMemo(() => {
    const set = new Map();
    favoritesList.forEach((t) => {
      if (t.artist && !set.has(t.artist)) set.set(t.artist, t);
    });
    searchResults.forEach((r) => {
      if (r.artist && !set.has(r.artist)) set.set(r.artist, r);
    });
    return Array.from(set.entries())
      .slice(0, 8)
      .map(([artist, t]) => ({
        artist,
        thumbnail: t.thumbnail,
        slug: artistSlugOf(t) || artistSlugFromName(artist),
      }));
  }, [favoritesList, searchResults]);

  return (
    <Dialog open={paletteOpen} onOpenChange={(open) => !open && closePalette()}>
      <DialogContent
        className="max-w-xl p-0 overflow-hidden !rounded-sharp border-white/[0.08] bg-surface-3/95 backdrop-blur-2xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          label="Command palette"
          className="flex flex-col max-h-[70vh]"
          shouldFilter
        >
          {/* Editorial input row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
            {scopeInfo ? (
              <span className="issue-pill !text-track">
                <scopeInfo.scope.icon className="w-3 h-3 mr-1 inline-block" />
                {scopeInfo.scope.label}
              </span>
            ) : (
              <SearchIcon className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
            )}
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={
                scopeInfo
                  ? `${scopeInfo.scope.label} \u2026`
                  : 'Type :nav, >action, @artist, #playlist, ? for help\u2026'
              }
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-4 placeholder:font-editorial placeholder:italic text-ink"
            />
            {searching && <Loader2 className="w-4 h-4 text-ink-3 animate-spin" />}
            <Kbd keys={['esc']} />
          </div>

          <Command.List data-lenis-prevent className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <Command.Empty className="px-3 py-8 text-center">
              <p className="font-editorial italic text-[14px] text-ink-3">
                No results found.
              </p>
            </Command.Empty>

            {showLoadingSkeletons ? (
              <Command.Group heading="Searching" className={GROUP_HEADING}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={`palette-skeleton-${idx}`}
                    aria-hidden="true"
                    className="relative flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-sharp"
                  >
                    <span className="h-8 w-8 rounded-sharp bg-white/[0.08] skeleton-pulse-iris" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <span className="block h-3 w-[62%] rounded bg-white/[0.08] skeleton-pulse-iris" />
                      <span className="block h-2.5 w-[45%] rounded bg-white/[0.06] skeleton-pulse-iris" />
                    </div>
                  </div>
                ))}
              </Command.Group>
            ) : null}

            {showHelp ? (
              <Command.Group heading="Help" className={GROUP_HEADING}>
                {SCOPES.map((s) => (
                  <Command.Item
                    key={`help-${s.prefix}`}
                    value={`help ${s.prefix} ${s.label}`}
                    onSelect={() => setQuery(s.prefix)}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <s.icon className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-sharp bg-surface-0/60 border border-white/[0.10]">
                      {s.prefix}
                    </span>
                    <span className="flex-1">{s.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-4" />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showSuggestionGroup ? (
              <Command.Group heading="Suggestions" className={GROUP_HEADING}>
                {suggestionItems.map((s) => (
                  <Command.Item
                    key={`sug-${s}`}
                    value={`suggestion ${s}`}
                    onSelect={() => setQuery(s)}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <SearchIcon className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
                    <span className="flex-1 truncate">{s}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-4" />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showRecents ? (
              <Command.Group heading="Recent" className={GROUP_HEADING}>
                {recents.map((r) => (
                  <Command.Item
                    key={r.id}
                    value={`recent ${r.label}`}
                    onSelect={() => {
                      if (r.kind === 'play' && r.track) {
                        playTrack(r.track);
                      } else if (r.path) {
                        navigate(r.path);
                      }
                      closePalette();
                    }}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    {r.icon ? (
                      <r.icon className="w-4 h-4" strokeWidth={1.75} />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-ink-3" />
                    )}
                    <span className="truncate">{r.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showNav ? (
              <Command.Group heading="Navigate" className={GROUP_HEADING}>
                {navItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`nav ${item.label} ${item.path}`}
                    onSelect={runAndClose(() => navigate(item.path), {
                      id: item.id,
                      label: item.label,
                      path: item.path,
                      icon: item.icon,
                    })}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <item.icon className="w-4 h-4" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showActions ? (
              <Command.Group heading="Playback" className={GROUP_HEADING}>
                {playbackItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`action ${item.label}`}
                    disabled={item.disabled}
                    onSelect={runAndClose(item.run, {
                      id: item.id,
                      label: item.label,
                      kind: 'action',
                      icon: item.icon,
                    })}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <item.icon className="w-4 h-4" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showActions && playlistActionItems.length > 0 ? (
              <Command.Group heading="Playlist actions" className={GROUP_HEADING}>
                {playlistActionItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`playlist-action ${item.label}`}
                    disabled={item.disabled}
                    onSelect={runAndClose(item.run, {
                      id: item.id,
                      label: item.label,
                      kind: 'playlist-action',
                      icon: item.icon,
                    })}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <item.icon className="w-4 h-4" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showArtists && artistOptions.length > 0 ? (
              <Command.Group heading="Artists" className={GROUP_HEADING}>
                {artistOptions.map((a) => (
                  <Command.Item
                    key={`@${a.artist}`}
                    value={`artist ${a.artist}`}
                    onSelect={runAndClose(() => {
                      if (isUsableArtistSlug(a.slug)) navigate(`/artist/${a.slug}`);
                    })}
                    onMouseEnter={() => prefetchArtistRoute(a.slug)}
                    onFocus={() => prefetchArtistRoute(a.slug)}
                    disabled={!isUsableArtistSlug(a.slug)}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <SmartImage
                      src={a.thumbnail}
                      alt=""
                      kind="artist"
                      rounded="rounded-full"
                      className="w-7 h-7 ring-1 ring-white/10"
                      imgClassName="object-cover"
                    />
                    <span>{a.artist}</span>
                    <User className="w-3.5 h-3.5 ml-auto text-ink-3" />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showPlaylists && playlists.length > 0 ? (
              <Command.Group heading="Playlists" className={GROUP_HEADING}>
                {playlists.slice(0, 8).map((p) => (
                  <Command.Item
                    key={`#${p.id}`}
                    value={`playlist ${p.name}`}
                    onSelect={runAndClose(() => navigate(`/playlist/${p.id}`))}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <ListMusic className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
                    <span className="truncate">{p.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showSongs && searchBuckets.songExact.length > 0 ? (
              <Command.Group
                heading={`Exact matches for "${effectiveQuery}"`}
                className={GROUP_HEADING}
              >
                {searchBuckets.songExact.map((r) => (
                  <Command.Item
                    key={`song-exact-${r.id}`}
                    value={`song exact ${r.title} ${r.artist}`}
                    onSelect={() => handlePlayResult(r)}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <SmartImage
                      src={r.thumbnail}
                      alt=""
                      kind="track"
                      rounded="rounded-sharp"
                      className="w-8 h-8 flex-shrink-0 ring-1 ring-white/10"
                      imgClassName="object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">
                        <SearchHighlight text={r.title} tokens={highlightTokens} />
                      </p>
                      <p className="font-editorial text-[11.5px] text-ink-3 truncate mt-0.5">
                        by{' '}
                        <SearchHighlight
                          text={r.artist || 'Unknown artist'}
                          tokens={highlightTokens}
                        />
                      </p>
                    </div>
                    <Play className="w-4 h-4 text-ink-3" />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showSongs && searchBuckets.songRelated.length > 0 ? (
              <Command.Group
                heading={`Related songs for "${effectiveQuery}"`}
                className={GROUP_HEADING}
              >
                {searchBuckets.songRelated.map((r) => (
                  <Command.Item
                    key={`song-related-${r.id}`}
                    value={`song related ${r.title} ${r.artist}`}
                    onSelect={() => handlePlayResult(r)}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <SmartImage
                      src={r.thumbnail}
                      alt=""
                      kind="track"
                      rounded="rounded-sharp"
                      className="w-8 h-8 flex-shrink-0 ring-1 ring-white/10"
                      imgClassName="object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">
                        <SearchHighlight text={r.title} tokens={highlightTokens} />
                      </p>
                      <p className="font-editorial text-[11.5px] text-ink-3 truncate mt-0.5">
                        by{' '}
                        <SearchHighlight
                          text={r.artist || 'Unknown artist'}
                          tokens={highlightTokens}
                        />
                      </p>
                    </div>
                    <Play className="w-4 h-4 text-ink-3" />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showAlbums && searchBuckets.albums.length > 0 ? (
              <Command.Group
                heading={`Albums matching "${effectiveQuery}"`}
                className={GROUP_HEADING}
              >
                {searchBuckets.albums.map((album) => (
                  <Command.Item
                    key={`album-${album.id}`}
                    value={`album ${album.title} ${album.artist}`}
                    onSelect={runAndClose(() =>
                      navigate(`/album/${album.id}?from=search&autoplay=1`)
                    )}
                    onMouseEnter={() => prefetchAlbumRoute(album.id)}
                    onFocus={() => prefetchAlbumRoute(album.id)}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <SmartImage
                      src={album.thumbnail}
                      alt=""
                      kind="album"
                      rounded="rounded-sharp"
                      className="w-8 h-8 flex-shrink-0 ring-1 ring-white/10"
                      imgClassName="object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">
                        <SearchHighlight text={album.title} tokens={highlightTokens} />
                      </p>
                      <p className="font-editorial text-[11.5px] text-ink-3 truncate mt-0.5">
                        by{' '}
                        <SearchHighlight
                          text={album.artist || 'Unknown artist'}
                          tokens={highlightTokens}
                        />
                      </p>
                    </div>
                    <Disc className="w-4 h-4 text-ink-3" />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            {showFavorites && favoritesList.length > 0 ? (
              <Command.Group heading="Favorites" className={GROUP_HEADING}>
                {favoritesList.slice(0, 8).map((track) => (
                  <Command.Item
                    key={`f-${track.id}`}
                    value={`favorite ${track.title} ${track.artist}`}
                    onSelect={runAndClose(() => playTrack(track))}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <SmartImage
                      src={track.thumbnail}
                      alt=""
                      kind="track"
                      rounded="rounded-sharp"
                      className="w-8 h-8 flex-shrink-0 ring-1 ring-white/10"
                      imgClassName="object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">{track.title}</p>
                      <p className="font-editorial text-[11.5px] text-ink-3 truncate mt-0.5">
                        by {track.artist || 'Unknown artist'}
                      </p>
                    </div>
                    <Heart className="w-4 h-4 text-accent fill-current" />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <div className="px-3 py-3 text-[10.5px] text-ink-4 font-mono uppercase tracking-[0.18em] border-t border-white/[0.08] mt-2 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Music className="w-3 h-3" />
                {effectiveQuery.length < 2 ? 'Type to search.' : 'Live search.'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys={[':']} /> nav
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys={['>']} /> actions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys={['@']} /> artists
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys={['#']} /> playlists
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys={['?']} /> help
              </span>
            </div>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
