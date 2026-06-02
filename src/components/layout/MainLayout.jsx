import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSettings } from '@/contexts/SettingsContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileDrawer from './MobileDrawer';
import MobileNav from './MobileNav';
import FooterPlayer from './FooterPlayer';
import CommandPalette from '@/components/CommandPalette';
import ExpandedPlayer from '@/components/ExpandedPlayer';
import ErrorBoundary from '@/components/ErrorBoundary';
import RouteProgress from '@/components/RouteProgress';
import PlayerAnnouncer from '@/components/PlayerAnnouncer';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useFirstRunHints } from '@/hooks/use-first-run-hints';
import { pagePush } from '@/design/motion';
import { cn } from '@/lib/utils';

const MainLayout = () => {
  const { currentTrack } = usePlayer();
  const { settings } = useSettings();
  const location = useLocation();

  useKeyboardShortcuts();
  useFirstRunHints();

  const isPlayerRoute = location.pathname.startsWith('/player');

  // Expose the sidebar width as a CSS var so other components can react to it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--sidebar-w',
      settings.sidebarExpanded ? '260px' : '80px',
    );
  }, [settings.sidebarExpanded]);

  return (
    <div className={cn('relative', isPlayerRoute ? 'h-screen overflow-hidden' : 'min-h-screen')}>
      <RouteProgress />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-foreground"
      >
        Skip to content
      </a>

      <Sidebar />
      <MobileDrawer />

      <div
        className={cn(
          'flex flex-col transition-[padding] duration-med ease-emphasis md:pl-[var(--sidebar-w,80px)]',
          isPlayerRoute ? 'h-full overflow-hidden' : 'min-h-screen',
        )}
      >
        <TopBar />

        <main
          id="main-content"
          className={cn(
            'relative flex-1 min-h-0 custom-scrollbar',
            // The Now Playing screen is a single, locked viewport on desktop:
            // no page scroll, and no footer-player gutter (the page reserves
            // that space itself). Smaller breakpoints keep normal scrolling.
            isPlayerRoute
              ? cn(
                  // Player page is always locked to one viewport.
                  'overflow-hidden pb-0',
                )
              : cn(
                  'overflow-y-auto',
                  currentTrack ? 'pb-40 md:pb-32' : 'pb-24 md:pb-10',
                ),
          )}
        >
          <ErrorBoundary>
            {/* Each route mounts a fresh keyed wrapper that animates in on
                mount. We intentionally avoid `AnimatePresence mode="wait"`
                here: pairing it with lazy `Suspense` routes can drop the
                exit-complete handoff under React 18, leaving the incoming
                page unmounted (blank) or stuck at its initial opacity. An
                enter-only transition is bulletproof — the page always shows. */}
            <motion.div
              key={location.pathname}
              initial={pagePush.initial}
              animate={pagePush.animate}
              className={isPlayerRoute ? 'h-full overflow-hidden' : undefined}
            >
              <Outlet />
            </motion.div>
          </ErrorBoundary>
        </main>
      </div>

      <FooterPlayer />
      <MobileNav />
      <CommandPalette />
      <ExpandedPlayer />
      <PlayerAnnouncer />
    </div>
  );
};

export default MainLayout;
