import { lazy, Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useUI } from '@/contexts/UIContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import FooterPlayer from './FooterPlayer';
import ErrorBoundary from '@/components/ErrorBoundary';
import RouteProgress from '@/components/RouteProgress';
import PlayerAnnouncer from '@/components/PlayerAnnouncer';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useFirstRunHints } from '@/hooks/use-first-run-hints';
import { useLenisScroll } from '@/hooks/use-lenis-scroll';
import { resetPageScroll } from '@/lib/scroll';
import { pagePush } from '@/design/motion';
import { cn } from '@/lib/utils';

// Overlays that aren't visible on first paint. We gate their IMPORT on the
// owning UI state so optional dialog/drawer UI stays out of the initial
// bundle until the user opens it. After the first open we keep the component
// mounted (sticky flag below) so close animations can still play.
const CommandPalette = lazy(() => import('@/components/CommandPalette'));
const MobileDrawer = lazy(() => import('./MobileDrawer'));

// Latches a boolean to `true` once it has been true, then stays true. We use
// this to keep an overlay mounted after the user has opened it once so that
// the close animation has something to animate out of.
const useStickyTrue = (value) => {
  const ref = useRef(false);
  if (value) ref.current = true;
  return ref.current;
};

const MainLayout = () => {
  const { currentTrack } = usePlayer();
  const { settings } = useSettings();
  const { paletteOpen, mobileDrawerOpen } = useUI();
  const location = useLocation();

  const paletteEverOpened = useStickyTrue(paletteOpen);
  const drawerEverOpened = useStickyTrue(mobileDrawerOpen);

  useKeyboardShortcuts();
  useFirstRunHints();

  const isPlayerRoute = location.pathname.startsWith('/player');

  // Expose the *effective* sidebar width as a CSS var so layout chrome stays
  // synchronized. Tablet widths force compact mode even if the user left the
  // sidebar expanded on desktop, preventing md->lg crowding.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const desktopWide = window.matchMedia('(min-width: 1280px)');
    const applySidebarWidth = () => {
      const expandedOnViewport = settings.sidebarExpanded && desktopWide.matches;
      document.documentElement.style.setProperty('--sidebar-w', expandedOnViewport ? '260px' : '80px');
    };

    applySidebarWidth();
    desktopWide.addEventListener('change', applySidebarWidth);

    return () => {
      desktopWide.removeEventListener('change', applySidebarWidth);
    };
  }, [settings.sidebarExpanded]);

  // Lenis owns wheel smoothing for the page-level scroller (`#main-content`).
  // Skip on /player which locks scroll entirely — running Lenis against a
  // hidden-overflow element does nothing useful and wastes a RAF loop.
  useLenisScroll({ enabled: !isPlayerRoute });

  // Reset the page scroller to top on pathname change. We intentionally
  // ignore `location.search` updates (filter/deep-link param changes
  // within the same page shouldn't yank the user back to the top).
  useEffect(() => {
    resetPageScroll();
  }, [location.pathname]);

  return (
    <div
      className={cn(
        'relative overflow-x-clip',
        isPlayerRoute ? 'h-screen overflow-hidden' : 'min-h-screen',
      )}
    >
      <RouteProgress />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-foreground"
      >
        Skip to content
      </a>

      <Sidebar />
      {drawerEverOpened ? (
        <Suspense fallback={null}>
          <MobileDrawer />
        </Suspense>
      ) : null}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-col transition-[padding] duration-med ease-emphasis md:pl-[var(--sidebar-w,80px)]',
          isPlayerRoute ? 'h-full overflow-hidden' : 'min-h-screen',
        )}
      >
        <TopBar />

        <main
          id="main-content"
          className={cn(
            'relative flex-1 min-h-0 min-w-0 custom-scrollbar overscroll-x-contain',
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
                  currentTrack ? 'app-main-padding--player' : 'app-main-padding',
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
      {paletteEverOpened ? (
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      ) : null}
      <PlayerAnnouncer />
    </div>
  );
};

export default MainLayout;
