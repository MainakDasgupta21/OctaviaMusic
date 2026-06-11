import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Loader2,
  Bell,
  Menu,
  Heart,
  Settings,
  LogOut,
  User,
  Disc,
  Music,
  Command,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUI } from '@/contexts/UIContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useInstantSearch } from '@/hooks/use-instant-search';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import { useTrendingSearches } from '@/hooks/use-trending-searches';
import { useHoverPrefetch } from '@/hooks/use-route-prefetch';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { normalize } from '@/lib/search-rank';
import { artistSlugFromName, artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import SmartImage from '@/components/SmartImage';
import TrendingChips from '@/components/search/TrendingChips';
import SearchHighlight from '@/components/SearchHighlight';
import VoiceSearchButton from '@/components/search/VoiceSearchButton';
import { withViewTransition } from '@/lib/view-transition';
import { useSounds } from '@/contexts/SoundContext';
import { cn } from '@/lib/utils';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ML';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const toTrack = (item) => ({
  id: item.id,
  videoId: item.videoId,
  title: item.title || item.name,
  artist: item.artist || item.name,
  thumbnail: item.thumbnail,
  duration: item.duration,
});

const resultKey = (kind, item) =>
  `${kind}:${item?.videoId || item?.id || normalize(item?.title || item?.name)}`;

const trackIdentity = (item) =>
  item?.videoId || item?.id || `${normalize(item?.title || item?.name)}::${normalize(item?.artist)}`;

const ROUTE_TITLES = {
  '/': 'Home',
  '/search': 'Search',
  '/charts': 'Charts',
  '/explore': 'Explore',
  '/genres': 'Genres',
  '/library': 'Your library',
  '/favorites': 'Favorites',
  '/player': 'Now playing',
  '/settings': 'Settings',
  '/account': 'Account',
  '/admin': 'Admin',
  '/trending': 'Trending',
};

const Breadcrumb = () => {
  const location = useLocation();
  const { playlists } = usePlaylists();

  const crumbs = useMemo(() => {
    const path = location.pathname;
    if (ROUTE_TITLES[path]) {
      return [{ label: ROUTE_TITLES[path], to: path }];
    }
    if (path.startsWith('/artist/')) {
      const slug = path.split('/')[2] || '';
      return [
        { label: 'Discover', to: '/' },
        { label: slug.replace(/-/g, ' ') },
      ];
    }
    if (path.startsWith('/album/')) {
      return [
        { label: 'Discover', to: '/' },
        { label: 'Album' },
      ];
    }
    if (path.startsWith('/playlist/')) {
      const id = path.split('/')[2];
      const playlist = playlists.find((p) => p.id === id);
      return [
        { label: 'Library', to: '/library' },
        { label: playlist?.name || 'Playlist' },
      ];
    }
    return [];
  }, [location.pathname, playlists]);

  if (!crumbs.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden lg:flex items-center gap-1.5 text-[13px] font-medium"
    >
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${c.to || i}`} className="flex items-center gap-1.5 capitalize">
          {i > 0 && <span className="text-ink-4">·</span>}
          {c.to && i !== crumbs.length - 1 ? (
            <Link
              to={c.to}
              className="text-ink-3 hover:text-ink transition-colors focus-ring rounded-sharp"
            >
              {c.label}
            </Link>
          ) : (
            <span className={cn(i === crumbs.length - 1 ? 'text-ink' : 'text-ink-3')}>
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
};

const SearchSection = ({ title, children }) => (
  <section className="space-y-1.5">
    <p className="px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4">
      {title}
    </p>
    <div className="space-y-1">{children}</div>
  </section>
);

const TopBar = () => {
  const rawNavigate = useNavigate();
  const navigate = useCallback(
    (to, opts) => withViewTransition(() => rawNavigate(to, opts)),
    [rawNavigate],
  );
  const location = useLocation();
  const { searchInputRef, openPalette, openMobileDrawer } = useUI();
  const { settings } = useSettings();
  const { isPlaying, currentTrack, playTrack, addToQueue } = usePlayer();
  const { user, logout: logoutUser } = useAuth();
  const { play: playSfx } = useSounds();
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [historyIdx, setHistoryIdx] = useState(() =>
    typeof window === 'undefined' ? 0 : window.history.state?.idx ?? 0,
  );
  const [historyLen, setHistoryLen] = useState(() =>
    typeof window === 'undefined' ? 1 : window.history.length,
  );

  // In-app notifications feed for the bell button.
  const {
    items: notifications,
    unreadCount: notifUnread,
    markAllRead,
    clear: clearNotifications,
  } = useNotifications();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHistoryIdx(window.history.state?.idx ?? 0);
    setHistoryLen(window.history.length);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const canGoBack = historyIdx > 0;
  const canGoForward = historyIdx < historyLen - 1;
  const showMobileBack =
    canGoBack && /^(\/artist\/|\/album\/|\/playlist\/)/.test(location.pathname);
  const hasSearchValue = searchValue.trim().length > 0;

  const runSearchRow = useCallback(
    (row) => {
      if (!row?.item) return;
      if (row.kind === 'song') {
        playTrack(toTrack(row.item));
      } else if (row.kind === 'artist') {
        const slug =
          row.item.slug
          || artistSlugOf(row.item)
          || artistSlugFromName(row.item.name || row.item.artist || '');
        if (isUsableArtistSlug(slug)) navigate(`/artist/${slug}`);
      } else if (row.kind === 'album') {
        navigate(`/album/${row.item.id}?from=search&autoplay=1`);
      }
      setSearchOpen(false);
      setSearchValue('');
    },
    [navigate, playTrack],
  );

  const {
    status: instantStatus,
    results: instantResults,
    query: parsedSearchQuery,
    flatResults,
    selected,
    setSelectedIndex,
    move,
    pick,
  } = useInstantSearch(searchValue, {
    enabled: searchOpen,
    debounceMs: 180,
    limit: 30,
    prefetchSearchPage: searchOpen && hasSearchValue,
    prefetchDelayMs: 600,
    onPick: runSearchRow,
  });

  const highlightTokens = parsedSearchQuery?.tokens || [];

  // Real YTM autocomplete. We only render chips when the main results look
  // weak (low top-score, no top item, or status='empty'); strong matches
  // shouldn't push the actual results down the list.
  const { suggestions: rawSuggestions } = useSearchSuggestions(searchValue, {
    enabled: hasSearchValue,
  });
  const lowerQuery = searchValue.trim().toLowerCase();
  const suggestionsList = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const raw of rawSuggestions) {
      const trimmed = String(raw || '').trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      // Drop the suggestion that exactly matches the input (it's noise).
      if (key === lowerQuery) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= 4) break;
    }
    return out;
  }, [rawSuggestions, lowerQuery]);

  const topScore = instantResults.top?._score ?? 0;
  const showSuggestions =
    suggestionsList.length > 0 &&
    (instantStatus === 'empty' || topScore < 220 || !instantResults.top);

  // Trending strip — surfaced when the input is open & empty so users
  // discover hot content without typing first. Lazy-fetches the cached
  // weekly charts on first focus.
  const { terms: trendingTerms } = useTrendingSearches({
    enabled: searchOpen && !hasSearchValue,
  });
  const showTrending = !hasSearchValue && trendingTerms.length > 0;

  const selectedKey = selected?.key || null;

  const topItem = instantResults.top;
  const topSongIdentity = topItem && (topItem._kind || 'song') === 'song'
    ? trackIdentity(topItem)
    : null;
  const exactSongs = useMemo(
    () =>
      instantResults.songExact
        .filter((item) => trackIdentity(item) !== topSongIdentity)
        .slice(0, 5),
    [instantResults.songExact, topSongIdentity],
  );
  const relatedSongs = useMemo(
    () =>
      instantResults.songRelated
        .filter((item) => trackIdentity(item) !== topSongIdentity)
        .slice(0, 5),
    [instantResults.songRelated, topSongIdentity],
  );
  const artists = useMemo(() => instantResults.artists.slice(0, 3), [instantResults.artists]);
  const albums = useMemo(() => instantResults.albums.slice(0, 3), [instantResults.albums]);
  const library = useMemo(() => instantResults.library.slice(0, 3), [instantResults.library]);

  const indexByKey = useMemo(
    () => new Map(flatResults.map((row, i) => [row.key, i])),
    [flatResults],
  );

  const { onAlbum: prefetchAlbumRoute, onArtist: prefetchArtistRoute } = useHoverPrefetch();

  const focusRow = useCallback(
    (kind, item) => {
      const key = resultKey(kind, item);
      const idx = indexByKey.get(key);
      if (Number.isInteger(idx)) setSelectedIndex(idx);
      // Hover/keyboard focus warms the destination's data + JS chunk so the
      // click/Enter feels instant even on a cold tab.
      if (kind === 'artist') {
        const slug =
          item.slug || artistSlugOf(item) || artistSlugFromName(item.name || item.artist || '');
        if (isUsableArtistSlug(slug)) prefetchArtistRoute(slug);
      } else if (kind === 'album' && item?.id) {
        prefetchAlbumRoute(item.id);
      }
    },
    [indexByKey, setSelectedIndex, prefetchAlbumRoute, prefetchArtistRoute],
  );

  // The popover surfaces in two modes:
  //   1. With a search value — shows live results + suggestions
  //   2. Empty + focused — shows the trending strip (when we have data)
  const isSearchPopoverOpen = searchOpen && (hasSearchValue || showTrending);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const q = searchValue.trim();
      if (!q) return;
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchValue('');
    },
    [navigate, searchValue],
  );

  const handleInputKeyDown = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openPalette();
        return;
      }

      if (e.key === 'Escape') {
        setSearchOpen(false);
        e.currentTarget.blur();
        return;
      }

      if (!isSearchPopoverOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move('up');
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && selected?.kind === 'song') {
        e.preventDefault();
        addToQueue(toTrack(selected.item));
        setSearchOpen(false);
        setSearchValue('');
      } else if (e.key === 'Enter' && selected) {
        e.preventDefault();
        pick();
      }
    },
    [openPalette, isSearchPopoverOpen, move, selected, addToQueue, pick],
  );

  const isAuthenticated = Boolean(user);
  const displayName = user?.displayName || settings.displayName || 'Music Lover';
  const email = user?.email || settings.email || 'user@example.com';
  const isAdmin = user?.role === 'admin';

  const handleLogout = useCallback(async () => {
    await logoutUser();
    playSfx('click');
    navigate('/login');
  }, [logoutUser, playSfx, navigate]);

  return (
    <TooltipProvider delayDuration={250}>
      <header
        className={cn(
          'sticky top-0 z-40 h-[60px] flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 md:px-5 xl:px-6',
          'bg-background/80 backdrop-blur-2xl border-b border-white/[0.07] relative',
          // Subtle inset top-light gives the chrome a premium "lifted" feel
          // without changing layout. Pairs with the bottom hairline.
          'shadow-[inset_0_1px_0_hsl(var(--ink-primary)/0.04)]',
        )}
      >
        {isPlaying && currentTrack ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-px"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent 0%, hsl(var(--track-accent) / 0.0) 8%, hsl(var(--track-accent) / 0.55) 32%, hsl(var(--track-accent-2) / 0.7) 50%, hsl(var(--track-accent-3) / 0.55) 68%, hsl(var(--track-accent) / 0.0) 92%, transparent 100%)',
              boxShadow:
                '0 0 12px hsl(var(--track-accent) / 0.30), 0 0 18px hsl(var(--track-accent-3) / 0.22)',
              animation: 'topbar-pulse 4.5s ease-in-out infinite',
            }}
          />
        ) : null}

        {showMobileBack ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="md:hidden touch-target w-11 h-11 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors focus-ring"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={openMobileDrawer}
            className="md:hidden touch-target w-11 h-11 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors focus-ring"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden md:flex items-center">
          {/* Back/forward grouped inside a single hairline pill so they
              read as one navigation control rather than two loose icons. */}
          <div className="inline-flex items-center p-0.5 rounded-full border border-white/[0.06] bg-white/[0.02]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => canGoBack && navigate(-1)}
                  disabled={!canGoBack}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => canGoForward && navigate(1)}
                  disabled={!canGoForward}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Forward"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Forward</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="hidden lg:flex items-center flex-shrink min-w-0">
          {/* Hairline divider between back/forward pill and breadcrumb. */}
          <span aria-hidden="true" className="mx-3 h-5 w-px bg-white/[0.06]" />
          <Breadcrumb />
        </div>

        <form
          onSubmit={handleSubmit}
          role="search"
          className="flex-1 min-w-0 max-w-xl lg:max-w-2xl mx-auto lg:mx-0"
        >
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="md:hidden w-full flex items-center justify-center gap-2 h-11 rounded-full border border-white/10 text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors focus-ring"
            aria-label="Go to search"
          >
            <SearchIcon className="w-4 h-4" />
            <span className="text-[13px]">Search</span>
          </button>

          <Popover
            open={isSearchPopoverOpen}
            onOpenChange={(open) => setSearchOpen(open)}
          >
            <PopoverTrigger asChild>
              <div className="hidden md:block relative group">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none transition-colors duration-short group-focus-within:text-accent" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchValue}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSearchValue(next);
                    setSearchOpen(true);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search songs, artists, albums…"
                  className={cn(
                    'w-full h-11 pl-11 pr-20 lg:pr-28 rounded-full bg-white/[0.03]',
                    'border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.05]',
                    'text-[13.5px] text-ink placeholder:text-ink-3',
                    // On focus the field gains a subtle inset shadow + an
                    // accent rim + a soft glow. Single rounded-full vocabulary
                    // matches the rest of the new chrome.
                    'focus:outline-none focus:border-track/60 focus:bg-surface-2/40',
                    'focus:[box-shadow:inset_0_1px_2px_rgba(0,0,0,0.22),0_0_0_3px_hsl(var(--track-accent)/0.10)]',
                    'transition-[border-color,background,box-shadow] duration-short',
                  )}
                  aria-label="Search"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <VoiceSearchButton
                    size="sm"
                    onTranscript={(text) => {
                      setSearchValue(text);
                      setSearchOpen(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={openPalette}
                    className="hidden lg:inline-flex items-center gap-1 h-6 px-2 rounded-full border border-white/[0.10] bg-white/[0.06] text-[10px] font-medium text-ink-3 font-mono tracking-wider hover:text-ink hover:bg-white/[0.10] hover:border-white/[0.18] transition-colors focus-ring"
                    aria-label="Open command palette"
                  >
                    {isMac ? (
                      <>
                        <Command className="w-3 h-3" /> K
                      </>
                    ) : (
                      'Ctrl K'
                    )}
                  </button>
                </div>
              </div>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={10}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={() => setSearchOpen(false)}
              className="w-[min(46rem,calc(100vw-1.25rem))] sm:w-[min(46rem,calc(100vw-2rem))] p-0 rounded-sharp border border-white/[0.10] bg-surface-3/95 backdrop-blur-2xl shadow-elev-5"
            >
              <div data-lenis-prevent className="max-h-[70vh] overflow-y-auto custom-scrollbar p-2 space-y-2">
                {!hasSearchValue && showTrending ? (
                  <TrendingChips
                    terms={trendingTerms}
                    onPick={(label) => {
                      setSearchValue(label);
                      setSearchOpen(true);
                    }}
                  />
                ) : null}

                {instantStatus === 'loading' && hasSearchValue ? (
                  <div className="h-28 flex items-center justify-center text-ink-3 text-[13px] gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching…
                  </div>
                ) : instantStatus === 'error' ? (
                  <div className="h-28 flex items-center justify-center text-ink-3 text-[13px]">
                    Search is temporarily unavailable.
                  </div>
                ) : !hasSearchValue ? null : (
                  <>
                    {showSuggestions ? (
                      <SearchSection title="Suggestions">
                        <div className="flex flex-wrap gap-1.5 px-1 pt-0.5 pb-1">
                          {suggestionsList.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSearchValue(s)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sharp border border-white/[0.10] bg-white/[0.02] text-[12px] text-ink-2 hover:text-ink hover:bg-white/[0.06] hover:border-white/[0.22] transition-colors focus-ring"
                            >
                              <SearchIcon className="w-3 h-3 text-ink-3" />
                              {s}
                            </button>
                          ))}
                        </div>
                      </SearchSection>
                    ) : null}

                    {topItem ? (
                      <SearchSection title="Top result">
                        {(() => {
                          const kind = topItem._kind || 'song';
                          const key = resultKey(kind, topItem);
                          const active = selectedKey === key;
                          const typeLabel =
                            kind === 'artist' ? 'Artist' : kind === 'album' ? 'Album' : 'Song';
                          return (
                            <button
                              type="button"
                              onMouseEnter={() => focusRow(kind, topItem)}
                              onClick={() => runSearchRow({ kind, item: topItem })}
                              className={cn(
                                'w-full flex items-center gap-3 p-2.5 rounded-sharp text-left transition-colors border',
                                active
                                  ? 'border-track/40 bg-track/[0.12]'
                                  : 'border-white/[0.06] hover:bg-white/[0.04]',
                              )}
                            >
                              <SmartImage
                                src={topItem.thumbnail}
                                alt=""
                                kind={kind === 'artist' ? 'artist' : kind === 'album' ? 'album' : 'track'}
                                rounded={kind === 'artist' ? 'rounded-full' : 'rounded-sharp'}
                                className="w-12 h-12 ring-1 ring-white/10"
                                imgClassName="object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-medium truncate text-ink">
                                  <SearchHighlight
                                    text={topItem.name || topItem.title}
                                    tokens={highlightTokens}
                                  />
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  {typeLabel}
                                  {kind !== 'artist' && topItem.artist ? (
                                    <>
                                      {' · '}
                                      <SearchHighlight text={topItem.artist} tokens={highlightTokens} />
                                    </>
                                  ) : null}
                                </p>
                              </div>
                              {kind === 'song' ? (
                                <Music className="w-4 h-4 text-ink-3" />
                              ) : kind === 'artist' ? (
                                <User className="w-4 h-4 text-ink-3" />
                              ) : (
                                <Disc className="w-4 h-4 text-ink-3" />
                              )}
                            </button>
                          );
                        })()}
                      </SearchSection>
                    ) : null}

                    {exactSongs.length > 0 ? (
                      <SearchSection title="Exact matches">
                        {exactSongs.map((item) => {
                          const key = resultKey('song', item);
                          const active = selectedKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onMouseEnter={() => focusRow('song', item)}
                              onClick={() => runSearchRow({ kind: 'song', item })}
                              className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 rounded-sharp text-left transition-colors',
                                active ? 'bg-track/[0.12]' : 'hover:bg-white/[0.04]',
                              )}
                            >
                              <SmartImage
                                src={item.thumbnail}
                                alt=""
                                kind="track"
                                rounded="rounded-sharp"
                                className="w-10 h-10 ring-1 ring-white/10"
                                imgClassName="object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-medium truncate text-ink">
                                  <SearchHighlight text={item.title} tokens={highlightTokens} />
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  <SearchHighlight
                                    text={item.artist || 'Unknown artist'}
                                    tokens={highlightTokens}
                                  />
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </SearchSection>
                    ) : null}

                    {relatedSongs.length > 0 ? (
                      <SearchSection title="Related songs">
                        {relatedSongs.map((item) => {
                          const key = resultKey('song', item);
                          const active = selectedKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onMouseEnter={() => focusRow('song', item)}
                              onClick={() => runSearchRow({ kind: 'song', item })}
                              className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 rounded-sharp text-left transition-colors',
                                active ? 'bg-track/[0.12]' : 'hover:bg-white/[0.04]',
                              )}
                            >
                              <SmartImage
                                src={item.thumbnail}
                                alt=""
                                kind="track"
                                rounded="rounded-sharp"
                                className="w-10 h-10 ring-1 ring-white/10"
                                imgClassName="object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-medium truncate text-ink">
                                  <SearchHighlight text={item.title} tokens={highlightTokens} />
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  <SearchHighlight
                                    text={item.artist || 'Unknown artist'}
                                    tokens={highlightTokens}
                                  />
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </SearchSection>
                    ) : null}

                    {artists.length > 0 ? (
                      <SearchSection title="Artists">
                        {artists.map((item) => {
                          const key = resultKey('artist', item);
                          const active = selectedKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onMouseEnter={() => focusRow('artist', item)}
                              onClick={() => runSearchRow({ kind: 'artist', item })}
                              className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 rounded-sharp text-left transition-colors',
                                active ? 'bg-track/[0.12]' : 'hover:bg-white/[0.04]',
                              )}
                            >
                              <SmartImage
                                src={item.thumbnail}
                                alt=""
                                kind="artist"
                                rounded="rounded-full"
                                className="w-10 h-10 ring-1 ring-white/10"
                                imgClassName="object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-medium truncate text-ink">
                                  <SearchHighlight text={item.name} tokens={highlightTokens} />
                                </p>
                                <p className="text-[12px] text-ink-3 mt-0.5">Artist</p>
                              </div>
                            </button>
                          );
                        })}
                      </SearchSection>
                    ) : null}

                    {albums.length > 0 ? (
                      <SearchSection title="Albums">
                        {albums.map((item) => {
                          const key = resultKey('album', item);
                          const active = selectedKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onMouseEnter={() => focusRow('album', item)}
                              onClick={() => runSearchRow({ kind: 'album', item })}
                              className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 rounded-sharp text-left transition-colors',
                                active ? 'bg-track/[0.12]' : 'hover:bg-white/[0.04]',
                              )}
                            >
                              <SmartImage
                                src={item.thumbnail}
                                alt=""
                                kind="album"
                                rounded="rounded-sharp"
                                className="w-10 h-10 ring-1 ring-white/10"
                                imgClassName="object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-medium truncate text-ink">
                                  <SearchHighlight text={item.title} tokens={highlightTokens} />
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  <SearchHighlight
                                    text={item.artist || 'Unknown artist'}
                                    tokens={highlightTokens}
                                  />
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </SearchSection>
                    ) : null}

                    {library.length > 0 ? (
                      <SearchSection title="From your library">
                        {library.map((item) => {
                          const key = resultKey('song', item);
                          const active = selectedKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onMouseEnter={() => focusRow('song', item)}
                              onClick={() => runSearchRow({ kind: 'song', item })}
                              className={cn(
                                'w-full flex items-center gap-3 px-2.5 py-2 rounded-sharp text-left transition-colors border',
                                active
                                  ? 'bg-track/[0.12] border-track/35'
                                  : 'border-white/[0.06] hover:bg-white/[0.04]',
                              )}
                            >
                              <SmartImage
                                src={item.thumbnail}
                                alt=""
                                kind="track"
                                rounded="rounded-sharp"
                                className="w-9 h-9 ring-1 ring-white/10"
                                imgClassName="object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium truncate text-ink">
                                  <SearchHighlight text={item.title} tokens={highlightTokens} />
                                </p>
                                <p className="text-[11.5px] text-ink-3 truncate mt-0.5">
                                  <SearchHighlight
                                    text={item.artist || 'Unknown artist'}
                                    tokens={highlightTokens}
                                  />
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </SearchSection>
                    ) : null}

                    {instantStatus === 'empty' ? (
                      <div className="px-3 py-5 text-center text-ink-3 text-[13px] space-y-2">
                        <p>No results found.</p>
                        {suggestionsList.length > 0 ? (
                          <p className="text-[11.5px] text-ink-4">
                            Pick a suggestion above to refine your search.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {hasSearchValue ? (
                <div className="border-t border-white/[0.08] px-3 py-2.5 space-y-1.5">
                  {instantResults.didYouMean ? (
                    <p className="text-[12px] text-ink-3">
                      Did you mean{' '}
                      <button
                        type="button"
                        onClick={() => setSearchValue(instantResults.didYouMean)}
                        className="text-accent hover:underline underline-offset-2 focus-ring rounded-sharp"
                      >
                        {instantResults.didYouMean}
                      </button>
                      ?
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      const q = searchValue.trim();
                      if (!q) return;
                      navigate(`/search?q=${encodeURIComponent(q)}`);
                      setSearchOpen(false);
                      setSearchValue('');
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-sharp text-[12.5px] text-ink-2 hover:text-ink hover:bg-white/[0.04] transition-colors focus-ring"
                  >
                    View all results for "{searchValue.trim()}"
                  </button>
                  <p className="px-2 text-[10px] text-ink-4 font-mono uppercase tracking-[0.14em]">
                    ↑ / ↓ navigate · Enter open · {isMac ? '⌘/Ctrl+Enter queue' : 'Ctrl+Enter queue'}
                  </p>
                  <p className="px-2 text-[10px] text-ink-4 font-mono uppercase tracking-[0.12em]">
                    Try: artist:"..." · album:"..." · type:song · year&gt;=2020 · duration&lt;3:30 · -live
                  </p>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </form>

        <div className="flex-1 md:hidden" />

        <div className="flex items-center ml-auto">
          {/* Glass cluster — Favorites + Notifications grouped inside a
              single hairline pill so the chrome reads as one action region
              rather than two loose icons. Matches the back/forward pill on
              the left for vocabulary symmetry. */}
          <div className="hidden sm:inline-flex items-center p-0.5 rounded-full border border-white/[0.06] bg-white/[0.03]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => navigate('/favorites')}
                  className={cn(
                    'touch-target w-9 h-9 inline-flex items-center justify-center rounded-full transition-colors focus-ring press',
                    location.pathname === '/favorites'
                      ? 'text-accent bg-white/[0.05]'
                      : 'text-ink-3 hover:text-ink hover:bg-white/[0.06]',
                  )}
                  aria-label="Favorites"
                >
                  <Heart className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Favorites</TooltipContent>
            </Tooltip>
            <Popover
              onOpenChange={(open) => {
                // Auto-mark-read when the popover opens so the dot clears
                // the moment the user has actually seen the feed.
                if (open && notifUnread > 0) markAllRead();
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="touch-target w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-white/[0.06] transition-colors focus-ring press relative"
                  aria-label={
                    notifUnread > 0
                      ? `Notifications, ${notifUnread} unread`
                      : 'Notifications'
                  }
                >
                  <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  {notifUnread > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-track ring-2 ring-background"
                    />
                  ) : null}
                </button>
              </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[min(22rem,calc(100vw-1rem))] sm:w-[min(22rem,calc(100vw-2rem))] p-0 bg-surface-1/95 backdrop-blur-xl border-white/[0.08]"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
                <p className="eyebrow text-ink-3">Notifications</p>
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => clearNotifications()}
                    className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-1.5 py-0.5"
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
              <div data-lenis-prevent className="max-h-[360px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="font-editorial text-[13px] text-ink-3">
                      All quiet. Follow an artist or like an album to see updates here.
                    </p>
                  </div>
                ) : (
                  <ul role="list" className="divide-y divide-white/[0.05]">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (n.to) navigate(n.to);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-white/[0.03] focus-ring transition-colors"
                        >
                          <p className="text-[13px] font-medium text-ink leading-tight">
                            {n.title}
                          </p>
                          {n.description ? (
                            <p className="font-editorial text-[12px] text-ink-3 mt-1 leading-snug">
                              {n.description}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!settings.notifyNewReleases && !settings.notifyPlaylistUpdates ? (
                <div className="px-4 py-2 border-t border-white/[0.06] text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-4">
                  Both notification toggles are off in settings.
                </div>
              ) : null}
            </PopoverContent>
            </Popover>
          </div>

          {/* Hairline divider between the action cluster and the avatar pill. */}
          <span aria-hidden="true" className="hidden sm:inline-block mx-2 h-5 w-px bg-white/[0.06]" />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors focus-ring press"
                  aria-label="Account menu"
                >
                  <span
                    className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-semibold text-track-fg ring-1 ring-white/15"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                    }}
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      initialsOf(displayName)
                    )}
                  </span>
                  <span className="hidden xl:inline text-[13px] font-medium truncate max-w-[140px]">
                    {displayName}
                  </span>
                  <ChevronDown className="hidden xl:inline w-3.5 h-3.5 text-ink-3" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-surface-3/95 backdrop-blur-xl border-white/10"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="font-semibold truncate">{displayName}</span>
                    <span className="text-xs text-ink-3 truncate">{email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <User className="w-4 h-4 mr-2" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/library')}>
                  <User className="w-4 h-4 mr-2" />
                  Your library
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/favorites')}>
                  <Heart className="w-4 h-4 mr-2" />
                  Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <User className="w-4 h-4 mr-2" />
                    Admin
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger focus:text-danger" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="h-9 px-3 rounded-full border border-white/[0.12] text-[12px] text-ink-2 hover:text-ink hover:bg-white/[0.05] transition-colors focus-ring"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="h-9 px-3 rounded-full text-[12px] text-track-fg bg-[radial-gradient(circle_at_30%_25%,hsl(var(--ink-primary)/0.22),transparent_55%),linear-gradient(135deg,hsl(var(--track-accent)),hsl(var(--track-accent-strong)))] ring-1 ring-white/20 hover:brightness-[1.06] transition-colors focus-ring"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
};

export default TopBar;
