import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
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
import { useHoverPrefetch } from '@/hooks/use-route-prefetch';
import { normalize } from '@/lib/search-rank';
import { artistSlugFromName, artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import SmartImage from '@/components/SmartImage';
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
  '/trending': 'Trending',
};

const Breadcrumb = () => {
  const location = useLocation();
  const params = useParams();
  const { playlists } = usePlaylists();

  const crumbs = useMemo(() => {
    const path = location.pathname;
    if (ROUTE_TITLES[path]) {
      return [{ label: ROUTE_TITLES[path] }];
    }
    if (path.startsWith('/artist/')) {
      const slug = path.split('/')[2] || '';
      return [
        { label: 'Discover' },
        { label: slug.replace(/-/g, ' ') },
      ];
    }
    if (path.startsWith('/album/')) {
      return [{ label: 'Album' }];
    }
    if (path.startsWith('/playlist/')) {
      const id = path.split('/')[2];
      const playlist = playlists.find((p) => p.id === id);
      return [
        { label: 'Library' },
        { label: playlist?.name || 'Playlist' },
      ];
    }
    return [];
  }, [location.pathname, params, playlists]);

  if (!crumbs.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-[12px] font-editorial">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5 capitalize">
          {i > 0 && <span className="text-ink-4 not-italic">/</span>}
          <span className={cn(i === crumbs.length - 1 ? 'text-ink' : 'text-ink-3')}>
            {c.label}
          </span>
        </span>
      ))}
    </nav>
  );
};

const formatEditorialDate = () => {
  const d = new Date();
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const weekday = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
  return { day, month, weekday };
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
  const navigate = useNavigate();
  const location = useLocation();
  const { searchInputRef, openPalette, openMobileDrawer } = useUI();
  const { settings } = useSettings();
  const { isPlaying, currentTrack, playTrack, addToQueue } = usePlayer();
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [historyIdx, setHistoryIdx] = useState(() =>
    typeof window === 'undefined' ? 0 : window.history.state?.idx ?? 0,
  );
  const [historyLen, setHistoryLen] = useState(() =>
    typeof window === 'undefined' ? 1 : window.history.length,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHistoryIdx(window.history.state?.idx ?? 0);
    setHistoryLen(window.history.length);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const canGoBack = historyIdx > 0;
  const canGoForward = historyIdx < historyLen - 1;
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
    flatResults,
    selected,
    setSelectedIndex,
    move,
    pick,
  } = useInstantSearch(searchValue, {
    enabled: true,
    debounceMs: 180,
    limit: 30,
    onPick: runSearchRow,
  });

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

  const isSearchPopoverOpen = searchOpen && hasSearchValue;

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

  const displayName = settings.displayName || 'Music Lover';
  const email = settings.email || 'user@example.com';
  const editorialDate = useMemo(() => formatEditorialDate(), []);

  return (
    <TooltipProvider delayDuration={250}>
      <header
        className={cn(
          'sticky top-0 z-40 h-[68px] flex items-center gap-3 px-3 md:px-6',
          'bg-background/70 backdrop-blur-xl border-b border-white/[0.06] relative',
        )}
      >
        {isPlaying && currentTrack ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-px"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent 0%, hsl(var(--track-accent) / 0.0) 8%, hsl(var(--track-accent) / 0.55) 50%, hsl(var(--track-accent) / 0.0) 92%, transparent 100%)',
              boxShadow: '0 0 12px hsl(var(--track-accent) / 0.35)',
              animation: 'topbar-pulse 4.5s ease-in-out infinite',
            }}
          />
        ) : null}

        <button
          type="button"
          onClick={openMobileDrawer}
          className="md:hidden p-2 rounded-lg text-ink-3 hover:text-ink hover:bg-white/5 transition-colors focus-ring"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => canGoBack && navigate(-1)}
                disabled={!canGoBack}
                className="p-2 rounded-sharp text-ink-3 hover:text-ink hover:bg-white/[0.04] transition-colors focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="p-2 rounded-sharp text-ink-3 hover:text-ink hover:bg-white/[0.04] transition-colors focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Forward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Forward</TooltipContent>
          </Tooltip>

          <div
            aria-hidden="true"
            className="hidden xl:flex items-baseline gap-2 ml-3 pl-4 border-l border-white/[0.07] select-none"
          >
            <span className="font-display text-2xl text-ink leading-none">
              {editorialDate.day}
            </span>
            <span className="font-mono text-[9px] text-ink-4 uppercase tracking-[0.2em] leading-none">
              {editorialDate.month}
              <br />
              {editorialDate.weekday}
            </span>
          </div>
        </div>

        <div className="hidden lg:flex items-center pl-3 flex-shrink min-w-0">
          <Breadcrumb />
        </div>

        <form onSubmit={handleSubmit} role="search" className="flex-1 max-w-xl mx-auto lg:mx-0">
          <button
            type="button"
            onClick={openPalette}
            className="md:hidden w-full flex items-center justify-center gap-2 h-10 rounded-sharp border border-white/10 text-ink-3 hover:text-ink hover:bg-white/[0.04] transition-colors focus-ring"
            aria-label="Open search"
          >
            <SearchIcon className="w-4 h-4" />
            <span className="text-[13px]">Search</span>
          </button>

          <Popover
            open={isSearchPopoverOpen}
            onOpenChange={(open) => setSearchOpen(open && hasSearchValue)}
          >
            <PopoverTrigger asChild>
              <div className="hidden md:block relative group">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none transition-colors duration-short group-focus-within:text-accent" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchValue}
                  onFocus={() => {
                    if (searchValue.trim()) setSearchOpen(true);
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSearchValue(next);
                    setSearchOpen(Boolean(next.trim()));
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search songs, artists, albums…"
                  className={cn(
                    'w-full h-10 pl-10 pr-24 rounded-sharp bg-transparent',
                    'border border-white/[0.10] hover:border-white/[0.16]',
                    'text-[13px] text-ink placeholder:text-ink-4 placeholder:italic placeholder:font-editorial',
                    'focus:outline-none focus:border-track/60 focus:bg-surface-2/40',
                    'transition-[border-color,background,box-shadow] duration-short',
                  )}
                  aria-label="Search"
                />
                <button
                  type="button"
                  onClick={openPalette}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-sharp border border-white/[0.10] bg-surface-0/40 text-[10px] font-medium text-ink-3 font-mono tracking-wider hover:text-ink hover:bg-surface-0/80 hover:border-white/[0.18] transition-colors focus-ring"
                  aria-label="Open command palette"
                >
                  {isMac ? (
                    <>
                      <Command className="w-3 h-3" /> K
                    </>
                  ) : (
                    'CTRL K'
                  )}
                </button>
              </div>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              sideOffset={10}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={() => setSearchOpen(false)}
              className="w-[min(44rem,calc(100vw-2rem))] p-0 rounded-sharp border border-white/[0.10] bg-surface-3/95 backdrop-blur-2xl shadow-elev-5"
            >
              <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-2 space-y-2">
                {instantStatus === 'loading' ? (
                  <div className="h-28 flex items-center justify-center text-ink-3 text-[13px] gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching…
                  </div>
                ) : instantStatus === 'error' ? (
                  <div className="h-28 flex items-center justify-center text-ink-3 text-[13px]">
                    Search is temporarily unavailable.
                  </div>
                ) : (
                  <>
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
                                  {topItem.name || topItem.title}
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  {typeLabel}
                                  {kind !== 'artist' && topItem.artist ? ` · ${topItem.artist}` : ''}
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
                                  {item.title}
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  {item.artist || 'Unknown artist'}
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
                                  {item.title}
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  {item.artist || 'Unknown artist'}
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
                                  {item.name}
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
                                  {item.title}
                                </p>
                                <p className="text-[12px] text-ink-3 truncate mt-0.5">
                                  {item.artist || 'Unknown artist'}
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
                                  {item.title}
                                </p>
                                <p className="text-[11.5px] text-ink-3 truncate mt-0.5">
                                  {item.artist || 'Unknown artist'}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </SearchSection>
                    ) : null}

                    {instantStatus === 'empty' ? (
                      <div className="h-24 flex items-center justify-center text-ink-3 text-[13px]">
                        No results found.
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

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate('/favorites')}
                className={cn(
                  'hidden sm:flex p-2 rounded-sharp transition-colors focus-ring',
                  location.pathname === '/favorites'
                    ? 'text-accent'
                    : 'text-ink-3 hover:text-ink hover:bg-white/[0.04]',
                )}
                aria-label="Favorites"
              >
                <Heart className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Favorites</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="hidden sm:flex p-2 rounded-sharp text-ink-3 hover:text-ink hover:bg-white/[0.04] transition-colors focus-ring relative"
                aria-label="Notifications"
              >
                <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
                {settings.notifyNewReleases ? (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-track ring-2 ring-background" />
                ) : null}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Notifications</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 ml-1 rounded-sharp hover:bg-white/[0.04] transition-colors focus-ring border border-transparent hover:border-white/[0.06]"
                aria-label="Account menu"
              >
                <span
                  className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-semibold text-track-fg ring-1 ring-white/15"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                  }}
                >
                  {initialsOf(displayName)}
                </span>
                <span className="hidden lg:inline text-[13px] font-medium truncate max-w-[140px]">
                  {displayName}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 bg-surface-3/95 backdrop-blur-xl border-white/10"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="font-semibold truncate">{displayName}</span>
                  <span className="text-xs text-ink-3 truncate">{email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onClick={() => navigate('/settings')}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
};

export default TopBar;
