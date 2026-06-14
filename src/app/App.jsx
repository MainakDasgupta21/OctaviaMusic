import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TitleCardIntro from '@/components/common/TitleCardIntro';
import RouteHead from '@/components/common/RouteHead';
import SettingsEffects from '@/components/common/SettingsEffects';
import { Loader2 } from 'lucide-react';
import { registerPrefetch } from '@/hooks/use-route-prefetch';
import { useAccentRotator } from '@/hooks/use-accent-rotator';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RoleRoute from '@/components/auth/RoleRoute';
import AppProviders from './providers';

const HomePageImport = () => import('@/features/home/pages/HomePage');
const SearchPageImport = () => import('@/features/search/pages/SearchPage');
const PlayerPageImport = () => import('@/features/player/pages/PlayerPage');
const TrendingPageImport = () => import('@/features/trending/pages/TrendingPage');
const FavoritesPageImport = () => import('@/features/favorites/pages/FavoritesPage');
const LibraryPageImport = () => import('@/features/library/pages/LibraryPage');
const SettingsPageImport = () => import('@/features/settings/pages/SettingsPage');
const ArtistPageImport = () => import('@/features/artist/pages/ArtistPage');
const AlbumPageImport = () => import('@/features/album/pages/AlbumPage');
const PlaylistPageImport = () => import('@/features/playlist/pages/PlaylistPage');
const SharedPlaylistPageImport = () => import('@/features/playlist/pages/SharedPlaylistPage');
const ChartsPageImport = () => import('@/features/charts/pages/ChartsPage');
const ChartsArtistsPageImport = () => import('@/features/charts/pages/ChartsArtistsPage');
const ExplorePageImport = () => import('@/features/explore/pages/ExplorePage');
const ExploreFlowPageImport = () => import('@/features/explore/pages/ExploreFlowPage');
const GenresPageImport = () => import('@/features/genres/pages/GenresPage');
const LoginPageImport = () => import('@/features/auth/pages/LoginPage');
const RegisterPageImport = () => import('@/features/auth/pages/RegisterPage');
const ForgotPasswordPageImport = () => import('@/features/auth/pages/ForgotPasswordPage');
const AccountPageImport = () => import('@/features/auth/pages/AccountPage');
const AdminPageImport = () => import('@/features/admin/pages/AdminPage');
const NotFoundImport = () => import('@/app/pages/NotFoundPage');

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
const SharedPlaylistPage = lazy(SharedPlaylistPageImport);
const ChartsPage = lazy(ChartsPageImport);
const ChartsArtistsPage = lazy(ChartsArtistsPageImport);
const ExplorePage = lazy(ExplorePageImport);
const ExploreFlowPage = lazy(ExploreFlowPageImport);
const GenresPage = lazy(GenresPageImport);
const LoginPage = lazy(LoginPageImport);
const RegisterPage = lazy(RegisterPageImport);
const ForgotPasswordPage = lazy(ForgotPasswordPageImport);
const AccountPage = lazy(AccountPageImport);
const AdminPage = lazy(AdminPageImport);
const NotFound = lazy(NotFoundImport);

registerPrefetch('/', HomePageImport);
registerPrefetch('/search', SearchPageImport);
registerPrefetch('/player', PlayerPageImport);
registerPrefetch('/trending', TrendingPageImport);
registerPrefetch('/favorites', FavoritesPageImport);
registerPrefetch('/library', LibraryPageImport);
registerPrefetch('/settings', SettingsPageImport);
registerPrefetch('/charts', ChartsPageImport);
registerPrefetch('/charts/artists', ChartsArtistsPageImport);
registerPrefetch('/explore', ExplorePageImport);
registerPrefetch('/explore/flow', ExploreFlowPageImport);
registerPrefetch('/genres', GenresPageImport);
registerPrefetch('/artist', ArtistPageImport);
registerPrefetch('/album', AlbumPageImport);
registerPrefetch('/playlist', PlaylistPageImport);
registerPrefetch('/shared', SharedPlaylistPageImport);
registerPrefetch('/login', LoginPageImport);
registerPrefetch('/register', RegisterPageImport);
registerPrefetch('/forgot-password', ForgotPasswordPageImport);
registerPrefetch('/account', AccountPageImport);
registerPrefetch('/admin', AdminPageImport);

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

const AccentDriver = () => {
  useAccentRotator();
  return null;
};

const App = () => (
  <AppProviders>
    <SettingsEffects />
    <AccentDriver />
    <Toaster />
    <Sonner position="bottom-right" theme="dark" richColors closeButton />
    <TitleCardIntro />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RouteHead />
      <ErrorBoundary>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={wrap(HomePage)} />
            <Route path="/search" element={wrap(SearchPage)} />
            <Route path="/player" element={wrap(PlayerPage)} />
            <Route path="/trending" element={wrap(TrendingPage)} />
            <Route path="/charts" element={wrap(ChartsPage)} />
            <Route path="/charts/artists" element={wrap(ChartsArtistsPage)} />
            <Route path="/explore" element={wrap(ExplorePage)} />
            <Route path="/explore/flow" element={wrap(ExploreFlowPage)} />
            <Route path="/genres" element={wrap(GenresPage)} />
            <Route path="/artist/:slug" element={wrap(ArtistPage)} />
            <Route path="/album/:id" element={wrap(AlbumPage)} />
            <Route path="/shared/:shareId" element={wrap(SharedPlaylistPage)} />
            <Route element={<ProtectedRoute />}>
              <Route path="/favorites" element={wrap(FavoritesPage)} />
              <Route path="/library" element={wrap(LibraryPage)} />
              <Route path="/playlist/:id" element={wrap(PlaylistPage)} />
              <Route path="/settings" element={wrap(SettingsPage)} />
              <Route path="/account" element={wrap(AccountPage)} />
            </Route>
            <Route element={<RoleRoute role="admin" />}>
              <Route path="/admin" element={wrap(AdminPage)} />
            </Route>
          </Route>
          <Route path="/login" element={wrap(LoginPage)} />
          <Route path="/register" element={wrap(RegisterPage)} />
          <Route path="/forgot-password" element={wrap(ForgotPasswordPage)} />
          <Route path="*" element={wrap(NotFound)} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </AppProviders>
);

export default App;
