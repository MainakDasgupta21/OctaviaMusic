import { useEffect, useState } from 'react';
import {
  Home,
  Search,
  Library,
  Play,
  Heart,
  Settings,
  TrendingUp,
  BarChart3,
  Compass,
  ListMusic,
  Plus,
  ChevronsRight,
  ChevronsLeft,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSettings } from '@/contexts/SettingsContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePrefetchProps } from '@/hooks/use-route-prefetch';
import { durations, springs } from '@/design/motion';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const groups = [
  {
    ordinal: '01',
    label: 'Discover',
    items: [
      { icon: Home, label: 'Home', path: '/' },
      { icon: Search, label: 'Search', path: '/search' },
      { icon: TrendingUp, label: 'Trending', path: '/trending' },
      { icon: BarChart3, label: 'Charts', path: '/charts' },
      { icon: Compass, label: 'Explore', path: '/explore' },
      { icon: ListMusic, label: 'Genres', path: '/genres' },
    ],
  },
  {
    ordinal: '02',
    label: 'Library',
    items: [
      { icon: Library, label: 'Your library', path: '/library' },
      { icon: Heart, label: 'Favorites', path: '/favorites' },
      { icon: Play, label: 'Now playing', path: '/player' },
    ],
  },
];

const COLLAPSED_W = 76;
const EXPANDED_W = 248;

const isRouteActive = (pathname, itemPath) => {
  if (itemPath === '/') return pathname === '/';
  if (pathname === itemPath) return true;

  // Keep parent sections highlighted on nested/detail routes.
  if (itemPath === '/library') {
    return pathname.startsWith('/library') || pathname.startsWith('/playlist/');
  }
  if (itemPath === '/charts') return pathname.startsWith('/charts');
  if (itemPath === '/explore') return pathname.startsWith('/explore');
  if (itemPath === '/player') return pathname.startsWith('/player');
  if (itemPath === '/search') return pathname.startsWith('/search');

  return false;
};

const NavItem = ({
  to,
  icon: Icon,
  label,
  expanded,
  isActive,
  onClick,
  indicatorId,
  isPlayingNow = false,
}) => {
  const prefetch = usePrefetchProps(to);
  return (
    <NavLink
      to={to}
      onClick={onClick}
      {...prefetch}
      title={expanded ? undefined : label}
      aria-label={label}
      className={cn(
        'group relative flex items-center rounded-xl border focus-ring',
        'transition-[background-color,color,border-color,box-shadow] duration-short ease-emphasis',
        expanded ? 'gap-3 pl-3 pr-3 py-2.5' : 'justify-center h-12 w-12 mx-auto',
        isActive
          ? 'text-ink bg-white/[0.07] border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]'
          : 'border-transparent text-ink-3 hover:text-ink hover:bg-white/[0.035] hover:border-white/[0.06]',
      )}
    >
      {/* Active indicator — a hairline bar beside the icon. Centered with
          auto-margins (NOT translate), because framer-motion's layoutId
          animation overrides `transform` and would knock a translate-based
          centering out of alignment. */}
      {isActive && (
        <>
          {/* Sliding gradient pill — sits behind the icon/label and morphs
              between items via the shared layoutId. */}
          <motion.span
            layoutId={`${indicatorId}-pill`}
            aria-hidden="true"
            className="absolute inset-0 rounded-xl"
            transition={springs.overlay}
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--track-accent) / 0.18), hsl(var(--accent-iris-c) / 0.14))',
              boxShadow:
                'inset 0 0 0 1px hsl(var(--track-accent) / 0.30), 0 8px 20px -8px hsl(var(--track-accent) / 0.45)',
            }}
          />
          <motion.span
            layoutId={indicatorId}
            aria-hidden="true"
            className={cn(
              'absolute inset-y-0 my-auto h-6 w-[3px] bg-track rounded-full',
              expanded ? 'left-0' : 'left-0.5',
            )}
            transition={springs.snappy}
            style={{ boxShadow: '0 0 12px hsl(var(--track-accent) / 0.6)' }}
          />
        </>
      )}
      <span
        className={cn(
          'relative z-10 inline-flex items-center justify-center rounded-lg transition-colors',
          expanded ? 'h-8 w-8' : 'h-9 w-9',
          isActive
            ? 'bg-track/[0.16] text-accent'
            : 'text-current group-hover:bg-white/[0.06]',
        )}
      >
        <Icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={isActive ? 2.25 : 1.8} />
      </span>
      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: durations.short }}
            className={cn(
              'relative z-10 text-[13.5px] whitespace-nowrap',
              isActive ? 'font-medium tracking-tight' : 'font-normal',
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {isPlayingNow ? (
        expanded ? (
          <span aria-hidden="true" className="ml-auto relative z-10 inline-flex items-end gap-0.5 h-3.5">
            <span className="sidebar-playing-bar [animation-delay:-0.35s]" />
            <span className="sidebar-playing-bar [animation-delay:-0.2s]" />
            <span className="sidebar-playing-bar" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-track shadow-[0_0_8px_hsl(var(--track-accent)/0.7)]"
          />
        )
      ) : null}
    </NavLink>
  );
};

const SortablePinnedPlaylist = ({ playlist, expanded, isActive }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: playlist.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const prefetch = usePrefetchProps(`/playlist/${playlist.id}`);
  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <NavLink
        to={`/playlist/${playlist.id}`}
        {...prefetch}
        className={cn(
          'relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-md text-[13px] focus-ring',
          'transition-colors duration-short ease-emphasis',
          isActive
            ? 'text-accent'
            : 'text-ink-3 hover:text-ink hover:bg-white/[0.035]',
        )}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-track rounded-full"
            style={{ boxShadow: '0 0 10px hsl(var(--track-accent) / 0.5)' }}
          />
        )}
        <span
          {...listeners}
          className="w-2 h-2 rounded-sm bg-white/15 flex-shrink-0 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        />
        <ListMusic className="w-4 h-4 flex-shrink-0" />
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: durations.short }}
              className="truncate"
            >
              {playlist.name}
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
    </li>
  );
};

const Sidebar = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { pinned, createPlaylist, reorderPlaylists } = usePlaylists();
  const { isPlaying } = usePlayer();
  const location = useLocation();
  const [isDesktopWide, setIsDesktopWide] = useState(
    () => (typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1280px)').matches),
  );
  const expanded = settings.sidebarExpanded && isDesktopWide;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setIsDesktopWide(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderPlaylists(active.id, over.id);
  };

  const handleCreate = () => {
    const id = createPlaylist({ name: 'New playlist', pinned: true });
    if (!id) return;
    toast.success('Playlist created');
    navigate(`/playlist/${id}`);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      transition={springs.sheet}
      className="hidden lg:flex fixed left-0 top-0 h-dvh min-h-screen flex-col py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-50 overflow-hidden border-r border-white/[0.08] backdrop-blur-xl"
      style={{
        background:
          'linear-gradient(180deg, hsl(var(--surface-1) / 0.97), hsl(var(--surface-0) / 0.98))',
        boxShadow: expanded
          ? '10px 0 32px rgba(0,0,0,0.34), inset -1px 0 0 rgba(255,255,255,0.04)'
          : '8px 0 22px rgba(0,0,0,0.26), inset -1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          background:
            'radial-gradient(100% 40% at 0% 12%, hsl(var(--track-accent) / 0.10), transparent 58%)',
        }}
      />
      {/* Brand */}
      <div
        className={cn(
          'mb-5 flex items-center relative z-10',
          expanded ? 'px-5 justify-between' : 'justify-center px-0',
        )}
      >
        <NavLink
          to="/"
          onClick={onNavigate}
          aria-label="Octavia home"
          className={cn(
            'inline-flex items-center gap-3 focus-ring rounded-2xl border border-white/[0.10] backdrop-blur-md',
            expanded
              ? 'px-3 py-2 bg-white/[0.03] hover:bg-white/[0.05]'
              : 'h-12 w-12 justify-center bg-white/[0.04] hover:bg-white/[0.06]',
          )}
        >
          <LogoMark size={expanded ? 36 : 32} />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: durations.short }}
                className="flex items-center gap-2"
              >
                <Wordmark size="md" />
                <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-ink-4 pt-2">
                  music
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      <nav
        data-lenis-prevent
        className={cn(
          'relative z-10 min-h-0 flex-1 flex flex-col overflow-y-auto custom-scrollbar pb-8',
          expanded ? 'gap-5 px-3' : 'gap-4 px-2',
        )}
        // Fade-out mask along the bottom so a long playlist list feels
        // infinite rather than abruptly cut. The mask is purely cosmetic;
        // scroll behaviour is unchanged. Browsers without mask-image
        // support fall back to a plain scrollable list.
        style={{
          WebkitMaskImage:
            'linear-gradient(180deg, #000 0, #000 calc(100% - 28px), transparent 100%)',
          maskImage:
            'linear-gradient(180deg, #000 0, #000 calc(100% - 28px), transparent 100%)',
        }}
      >
        {groups.map((group, gi) => (
          <div
            key={group.label}
            className={cn(
              'flex flex-col gap-1',
              !expanded && 'mx-0.5 py-1.5',
            )}
          >
            {expanded && (
              <div className="h-5 px-4 flex items-center gap-2">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: durations.short }}
                  className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-4/80 whitespace-nowrap"
                  aria-hidden="true"
                >
                  §{group.ordinal}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: durations.short }}
                  className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 whitespace-nowrap"
                >
                  {group.label}
                </motion.span>
              </div>
            )}
            {/* Small hairline divider when collapsed gives the icon stack rhythm. */}
            {!expanded && gi > 0 && null}
            {group.items.map((item) => (
              <NavItem
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                expanded={expanded}
                isActive={isRouteActive(location.pathname, item.path)}
                onClick={onNavigate}
                indicatorId="sidebar-nav-active"
                isPlayingNow={item.path === '/player' && isPlaying}
              />
            ))}
          </div>
        ))}

        {/* Pinned playlists */}
        <div className="flex flex-col gap-0.5">
          {expanded ? (
            <div className="h-5 px-4 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-4/80 whitespace-nowrap"
                >
                  §03
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 whitespace-nowrap">
                  Playlists
                </span>
              </span>
              <button
                type="button"
                onClick={handleCreate}
                className="touch-target p-1 rounded-sharp text-ink-3 hover:text-ink hover:bg-white/[0.05] focus-ring"
                aria-label="Create playlist"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-2 h-px w-8 bg-white/[0.10]" aria-hidden />
              <button
                type="button"
                onClick={handleCreate}
                title="Create playlist"
                aria-label="Create playlist"
                className="touch-target mx-auto h-11 w-11 flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-white/[0.04] focus-ring"
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}
          {expanded && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pinned.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="flex flex-col gap-0.5">
                  {pinned.map((p) => (
                    <SortablePinnedPlaylist
                      key={p.id}
                      playlist={p}
                      expanded={expanded}
                      isActive={location.pathname === `/playlist/${p.id}`}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          {pinned.length === 0 && expanded ? (
            <p className="px-3 mt-1 text-[11px] text-ink-4">Pin a playlist to keep quick access here.</p>
          ) : null}
        </div>
      </nav>

      {/* Settings + expand toggle + editorial footer */}
      <div
        className={cn(
          'pt-3 mt-2 border-t border-white/[0.06] flex flex-col gap-1',
          expanded ? 'px-3' : 'px-2',
        )}
      >
        <NavItem
          to="/settings"
          icon={Settings}
          label="Settings"
          expanded={expanded}
          isActive={isRouteActive(location.pathname, '/settings')}
          onClick={onNavigate}
          indicatorId="sidebar-nav-active"
        />
        <button
          type="button"
          onClick={() => updateSetting('sidebarExpanded', !settings.sidebarExpanded)}
          title={
            isDesktopWide
              ? (expanded ? 'Collapse sidebar' : 'Expand sidebar')
              : 'Expand sidebar on wider screens'
          }
          aria-label={
            isDesktopWide
              ? (expanded ? 'Collapse sidebar' : 'Expand sidebar')
              : 'Expand sidebar on wider screens'
          }
          disabled={!isDesktopWide}
          className={cn(
            'touch-target mt-1 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-white/[0.04] focus-ring',
            expanded ? 'mx-1 h-10' : 'mx-auto h-11 w-11',
            !isDesktopWide && 'opacity-45 cursor-not-allowed hover:bg-transparent hover:text-ink-3',
          )}
        >
          {expanded ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
        </button>

        {/* Editorial masthead footer — only when expanded */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durations.med }}
              className="px-4 pt-4 pb-1 flex items-baseline justify-between text-[9px] font-mono uppercase tracking-[0.16em] text-ink-4"
            >
              <span>Octavia</span>
              <span>{new Date().getFullYear()}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
