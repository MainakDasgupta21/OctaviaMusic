import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { LikedAlbumsProvider } from '@/contexts/LikedAlbumsContext';
import { FollowedArtistsProvider } from '@/contexts/FollowedArtistsContext';
import { PlaylistProvider } from '@/contexts/PlaylistContext';
import { SearchHistoryProvider } from '@/contexts/SearchHistoryContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { UIProvider } from '@/contexts/UIContext';
import { SoundProvider } from '@/contexts/SoundContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000,
      gcTime: 60 * 60 * 1000,
    },
  },
});

const AppProviders = ({ children }) => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <PlayerProvider>
            <FavoritesProvider>
              <LikedAlbumsProvider>
                <FollowedArtistsProvider>
                  <PlaylistProvider>
                    <SearchHistoryProvider>
                      <NotificationsProvider>
                        <UIProvider>
                          <SoundProvider>
                            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
                          </SoundProvider>
                        </UIProvider>
                      </NotificationsProvider>
                    </SearchHistoryProvider>
                  </PlaylistProvider>
                </FollowedArtistsProvider>
              </LikedAlbumsProvider>
            </FavoritesProvider>
          </PlayerProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default AppProviders;
