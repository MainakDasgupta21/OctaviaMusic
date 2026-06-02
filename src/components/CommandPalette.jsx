import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Home,
  Search,
  TrendingUp,
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
  Search as SearchIcon,
  Loader2,
  User,
  ListMusic,
  Compass,
  HelpCircle,
  ArrowRight,
  Hash,
  AtSign,
  ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useUI } from '@/contexts/UIContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { searchMusic } from '@/lib/api';
import Kbd from '@/components/ui-v2/Kbd';
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
  { id: 'nav-charts', label: 'Go to Charts', path: '/charts', icon: TrendingUp },
  { id: 'nav-explore', label: 'Go to Explore', path: '/explore', icon: Compass },
  { id: 'nav-favorites', label: 'Go to Favorites', path: '/favorites', icon: Heart },
  { id: 'nav-library', label: 'Go to Library', path: '/library', icon: Library },
  { id: 'nav-player', label: 'Go to Now Playing', path: '/player', icon: Play },
  { id: 'nav-settings', label: 'Open Settings', path: '/settings', icon: Settings },
];

const RECENT_KEY = 'harmony.palette.recent.v1';
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
  const { playlists } = usePlaylists();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState(() => loadRecents());
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!paletteOpen) {
      setQuery('');
      setSearchResults([]);
      setSearching(false);
    } else {
      setRecents(loadRecents());
    }
  }, [paletteOpen]);

  const scopeInfo = useMemo(() => detectScope(query), [query]);
  const effectiveQuery = scopeInfo ? scopeInfo.rest : query;

  useEffect(() => {
    if (!paletteOpen) return;
    const q = effectiveQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (
      scopeInfo &&
      scopeInfo.scope.prefix !== ':' &&
      scopeInfo.scope.prefix !== '>' &&
      scopeInfo.scope.prefix !== '?'
    ) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchMusic(q, 'song');
        setSearchResults(results.slice(0, 6));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [effectiveQuery, paletteOpen, scopeInfo]);

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

  const showNav =
    !scopeInfo || scopeInfo.scope.prefix === ':' || scopeInfo.scope.prefix === '?';
  const showActions =
    !scopeInfo || scopeInfo.scope.prefix === '>' || scopeInfo.scope.prefix === '?';
  const showArtists = !scopeInfo || scopeInfo.scope.prefix === '@';
  const showPlaylists = !scopeInfo || scopeInfo.scope.prefix === '#';
  const showSongs = !scopeInfo || scopeInfo.scope.prefix === '>';
  const showFavorites = !scopeInfo;
  const showRecents = !query && !scopeInfo && recents.length > 0;
  const showHelp = scopeInfo?.scope.prefix === '?';

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
        slug: t.artistSlug || artist.toLowerCase().replace(/\s+/g, '-'),
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

          <Command.List className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <Command.Empty className="px-3 py-8 text-center">
              <p className="font-editorial italic text-[14px] text-ink-3">
                No results found.
              </p>
            </Command.Empty>

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

            {showArtists && artistOptions.length > 0 ? (
              <Command.Group heading="Artists" className={GROUP_HEADING}>
                {artistOptions.map((a) => (
                  <Command.Item
                    key={`@${a.artist}`}
                    value={`artist ${a.artist}`}
                    onSelect={runAndClose(() => navigate(`/artist/${a.slug}`))}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <img
                      src={a.thumbnail}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10"
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

            {showSongs && searchResults.length > 0 ? (
              <Command.Group
                heading={`Songs matching "${effectiveQuery}"`}
                className={GROUP_HEADING}
              >
                {searchResults.map((r) => (
                  <Command.Item
                    key={`r-${r.id}`}
                    value={`song ${r.title} ${r.artist}`}
                    onSelect={() => handlePlayResult(r)}
                    className={ITEM_BASE}
                  >
                    <SelectedBar />
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="w-8 h-8 rounded-sharp object-cover flex-shrink-0 ring-1 ring-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">{r.title}</p>
                      <p className="font-editorial text-[11.5px] text-ink-3 truncate mt-0.5">
                        by {r.artist}
                      </p>
                    </div>
                    <Play className="w-4 h-4 text-ink-3" />
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
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="w-8 h-8 rounded-sharp object-cover flex-shrink-0 ring-1 ring-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">{track.title}</p>
                      <p className="font-editorial text-[11.5px] text-ink-3 truncate mt-0.5">
                        by {track.artist}
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
