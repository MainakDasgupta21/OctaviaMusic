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
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useUI } from '@/contexts/UIContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

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

const navItemClasses = ({ isActive }) =>
  cn(
    'group relative flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-sharp focus-ring',
    'transition-colors duration-short ease-emphasis',
    isActive
      ? 'text-accent'
      : 'text-ink-3 hover:text-ink hover:bg-white/[0.04]',
  );

const HairlineIndicator = ({ isActive }) => (
  <span
    aria-hidden="true"
    className={cn(
      'absolute left-0 top-1.5 bottom-1.5 w-px transition-all',
      isActive ? 'bg-track' : 'bg-transparent',
    )}
  />
);

const year = new Date().getFullYear();

const MobileDrawer = () => {
  const { mobileDrawerOpen, closeMobileDrawer } = useUI();
  const { pinned } = usePlaylists();

  return (
    <Sheet
      open={mobileDrawerOpen}
      onOpenChange={(open) => (open ? null : closeMobileDrawer())}
    >
      <SheetContent
        side="left"
        className="mobile-drawer-shell bg-surface-1/95 backdrop-blur-xl border-white/[0.08] p-0 flex flex-col lg:hidden"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
          <LogoMark size={36} />
          <div className="flex items-center gap-1.5">
            <Wordmark size="md" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 mt-1">
              / hub
            </span>
          </div>
        </div>

        <nav data-lenis-prevent className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 flex items-center gap-2 font-editorial italic text-[12px] text-ink-4 tracking-wide">
                <span className="font-mono not-italic text-[9.5px] uppercase tracking-[0.2em] text-ink-4/80">
                  §{group.ordinal}
                </span>
                <span>{group.label}</span>
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={closeMobileDrawer}
                      className={navItemClasses}
                    >
                      {({ isActive }) => (
                        <>
                          <HairlineIndicator isActive={isActive} />
                          <Icon
                            className="w-4 h-4"
                            strokeWidth={isActive ? 2 : 1.75}
                          />
                          <span
                            className={cn(
                              'text-[13.5px]',
                              isActive ? 'font-semibold' : 'font-medium',
                            )}
                          >
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
          {pinned.length > 0 && (
            <div>
              <p className="px-3 mb-2 flex items-center gap-2 font-editorial italic text-[12px] text-ink-4 tracking-wide">
                <span className="font-mono not-italic text-[9.5px] uppercase tracking-[0.2em] text-ink-4/80">
                  §03
                </span>
                <span>Playlists</span>
              </p>
              <div className="flex flex-col gap-0.5">
                {pinned.map((p) => (
                  <NavLink
                    key={p.id}
                    to={`/playlist/${p.id}`}
                    onClick={closeMobileDrawer}
                    className={navItemClasses}
                  >
                    {({ isActive }) => (
                      <>
                        <HairlineIndicator isActive={isActive} />
                        <ListMusic
                          className="w-3.5 h-3.5"
                          strokeWidth={isActive ? 2 : 1.75}
                        />
                        <span className="text-[13px] truncate">{p.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Settings + editorial footer */}
        <div className="p-3 border-t border-white/[0.06] space-y-3">
          <NavLink
            to="/settings"
            onClick={closeMobileDrawer}
            className={navItemClasses}
          >
            {({ isActive }) => (
              <>
                <HairlineIndicator isActive={isActive} />
                <Settings className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                <span className="text-[13.5px] font-medium">Settings</span>
              </>
            )}
          </NavLink>
          <p className="px-3 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-4/80 flex items-center justify-between">
            <span>Vol. 01 · {year}</span>
            <span aria-hidden="true">✦</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileDrawer;
