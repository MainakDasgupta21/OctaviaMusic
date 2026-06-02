import { lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { PlaylistProvider } from '@/contexts/PlaylistContext';
import { UIProvider } from '@/contexts/UIContext';
import { SoundProvider } from '@/contexts/SoundContext';
import MainLayout from '@/components/layout/MainLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import TitleCardIntro from '@/components/TitleCardIntro';
import RouteHead from '@/components/RouteHead';
import { Loader2 } from 'lucide-react';
import { registerPrefetch } from '@/hooks/use-route-prefetch';

// Lazy chunks — registered for hover-prefetch via the registry below.
const HomePageImport     = () => import('@/pages/HomePage');
const SearchPageImport   = () => import('@/pages/SearchPage');
const PlayerPageImport   = () => import('@/pages/PlayerPage');
const TrendingPageImport = () => import('@/pages/TrendingPage');
const FavoritesPageImport = () => import('@/pages/FavoritesPage');
const LibraryPageImport  = () => import('@/pages/LibraryPage');
const SettingsPageImport = () => import('@/pages/SettingsPage');
const ArtistPageImport   = () => import('@/pages/ArtistPage');
const AlbumPageImport    = () => import('@/pages/AlbumPage');
const PlaylistPageImport = () => import('@/pages/PlaylistPage');
const ChartsPageImport   = () => import('@/pages/ChartsPage');
const ExplorePageImport  = () => import('@/pages/ExplorePage');
const GenresPageImport   = () => import('@/pages/GenresPage');
const NotFoundImport     = () => import('@/pages/NotFound');

const HomePage = lazy(HomePageImport);
const SearchPage = lazy(SearchPageImport);
const PlayerPage = lazy(PlayerPageImport);
const TrendingPage = lazy(TrendingPageImport);
const FavoritesPage = lazy(FavoritesPageImport);
const LibraryPage = lazy(LibraryPageImport);
const SettingsPage = lazy(SettingsPageImport);
const ArtistPage = lazy(ArtistPageImport);
const AlbumPage = lazy(AlbumPageImport);
const PlaylistPage = lazy(PlaylistPageImport);
const ChartsPage = lazy(ChartsPageImport);
const ExplorePage = lazy(ExplorePageImport);
const GenresPage = lazy(GenresPageImport);
const NotFound = lazy(NotFoundImport);

// Register each path with its loader so hover-prefetch can warm the chunk.
registerPrefetch('/', HomePageImport);
registerPrefetch('/search', SearchPageImport);
registerPrefetch('/player', PlayerPageImport);
registerPrefetch('/trending', TrendingPageImport);
registerPrefetch('/favorites', FavoritesPageImport);
registerPrefetch('/library', LibraryPageImport);
registerPrefetch('/settings', SettingsPageImport);
registerPrefetch('/charts', ChartsPageImport);
registerPrefetch('/explore', ExplorePageImport);
registerPrefetch('/genres', GenresPageImport);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
  },
});

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <Loader2 className="w-6 h-6 text-accent animate-spin" aria-label="Loading" />
  </div>
);

const wrap = (Element) => (
  <Suspense fallback={<RouteFallback />}>
    <Element />
  </Suspense>
);

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <PlayerProvider>
        <FavoritesProvider>
          <PlaylistProvider>
            <UIProvider>
              <SoundProvider>
                <TooltipProvider delayDuration={200}>
                <Toaster />
                <Sonner position="bottom-right" theme="dark" richColors closeButton />
                <TitleCardIntro />
                <BrowserRouter>
                  <RouteHead />
                  <ErrorBoundary>
                    <Routes>
                      <Route element={<MainLayout />}>
                        <Route path="/" element={wrap(HomePage)} />
                        <Route path="/search" element={wrap(SearchPage)} />
                        <Route path="/player" element={wrap(PlayerPage)} />
                        <Route path="/trending" element={wrap(TrendingPage)} />
                        <Route path="/charts" element={wrap(ChartsPage)} />
                        <Route path="/explore" element={wrap(ExplorePage)} />
                        <Route path="/genres" element={wrap(GenresPage)} />
                        <Route path="/favorites" element={wrap(FavoritesPage)} />
                        <Route path="/library" element={wrap(LibraryPage)} />
                        <Route path="/artist/:slug" element={wrap(ArtistPage)} />
                        <Route path="/album/:id" element={wrap(AlbumPage)} />
                        <Route path="/playlist/:id" element={wrap(PlaylistPage)} />
                        <Route path="/settings" element={wrap(SettingsPage)} />
                      </Route>
                      <Route path="*" element={wrap(NotFound)} />
                    </Routes>
                  </ErrorBoundary>
                </BrowserRouter>
                </TooltipProvider>
              </SoundProvider>
            </UIProvider>
          </PlaylistProvider>
        </FavoritesProvider>
      </PlayerProvider>
    </SettingsProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
