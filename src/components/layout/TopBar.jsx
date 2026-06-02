import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  Bell,
  Menu,
  Heart,
  Settings,
  LogOut,
  User,
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
import { useUI } from '@/contexts/UIContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ML';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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

const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchInputRef, openPalette, openMobileDrawer } = useUI();
  const { settings } = useSettings();
  const { isPlaying, currentTrack } = usePlayer();
  const [searchValue, setSearchValue] = useState('');

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
  }, [location.pathname, location.search]);

  const canGoBack = historyIdx > 0;
  const canGoForward = historyIdx < historyLen - 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearchValue('');
  };

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
        {/* Subtle track-accent shimmer along the bottom hairline when audio is playing */}
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

          {/* Editorial date masthead — only on lg+ to avoid crowding */}
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

        <form
          onSubmit={handleSubmit}
          role="search"
          className="flex-1 max-w-xl mx-auto lg:mx-0"
        >
          <button
            type="button"
            onClick={openPalette}
            className="md:hidden w-full flex items-center justify-center gap-2 h-10 rounded-sharp border border-white/10 text-ink-3 hover:text-ink hover:bg-white/[0.04] transition-colors focus-ring"
            aria-label="Open search"
          >
            <SearchIcon className="w-4 h-4" />
            <span className="text-[13px]">Search</span>
          </button>
          {/* Editorial command-line search */}
          <div className="hidden md:block relative group">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none transition-colors duration-short group-focus-within:text-accent" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                  e.preventDefault();
                  openPalette();
                }
              }}
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
                <span className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-semibold text-track-fg ring-1 ring-white/15"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))' }}
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
