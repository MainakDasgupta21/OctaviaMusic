import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '@/pages/HomePage';

const mocks = vi.hoisted(() => ({
  getHomeFeed: vi.fn(),
  getGenres: vi.fn(),
  getCharts: vi.fn(),
  getArtist: vi.fn(),
  getExploreRadio: vi.fn(),
  isNetworkError: vi.fn(() => false),
  playTrack: vi.fn(),
  playTracksInOrder: vi.fn(),
}));

let authState = { user: null };
let playerState = {
  history: [],
  playTrack: mocks.playTrack,
  playTracksInOrder: mocks.playTracksInOrder,
  currentTrack: null,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => playerState,
}));

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => ({ list: [] }),
}));

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { displayName: 'Test User' } }),
}));

vi.mock('@/hooks/use-editorial-meta', () => ({
  useEditorialMeta: () => ({
    greeting: 'Good evening',
    masthead: 'Thu 11 Jun 2026',
    issueNum: '42',
  }),
}));

vi.mock('@/lib/api', () => ({
  getHomeFeed: (...args) => mocks.getHomeFeed(...args),
  getGenres: (...args) => mocks.getGenres(...args),
  getCharts: (...args) => mocks.getCharts(...args),
  getArtist: (...args) => mocks.getArtist(...args),
  getExploreRadio: (...args) => mocks.getExploreRadio(...args),
  isNetworkError: (...args) => mocks.isNetworkError(...args),
}));

vi.mock('@/components/home/HeroCard', () => ({
  __esModule: true,
  default: ({ feature }) => <div data-testid="hero-card">{feature?.title || 'Hero'}</div>,
  HeroSkeleton: () => <div data-testid="hero-skeleton" />,
}));

vi.mock('@/components/home/DiscoverRibbon', () => ({
  __esModule: true,
  default: () => <div data-testid="discover-ribbon" />,
}));

vi.mock('@/components/home/HorizontalRail', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/home/TileCard', () => ({
  __esModule: true,
  default: ({ track }) => <button type="button">{track?.title || 'Track'}</button>,
  TileSkeleton: () => <div data-testid="tile-skeleton" />,
}));

vi.mock('@/components/home/ArtistCircle', () => ({
  __esModule: true,
  default: ({ artist }) => <div>{artist}</div>,
}));

vi.mock('@/components/home/SpotlightArtist', () => ({
  __esModule: true,
  default: ({ artist }) => <div data-testid="spotlight-artist">{artist?.name || 'Spotlight Artist'}</div>,
  SpotlightArtistSkeleton: () => <div data-testid="spotlight-skeleton" />,
}));

vi.mock('@/components/home/WorldStrip', () => ({
  __esModule: true,
  default: () => <div data-testid="world-strip" />,
}));

vi.mock('@/components/SmartImage', () => ({
  __esModule: true,
  default: ({ src = '', alt = '' }) => <img src={src} alt={alt} />,
}));

const makeTrack = (id, artist, title, overrides = {}) => ({
  id,
  videoId: `${id}xxxxxxxxxxx`.slice(0, 11),
  title,
  artist,
  artistSlug: artist.toLowerCase().replace(/\s+/g, '-'),
  thumbnail: '/placeholders/track.svg',
  plays: 1000,
  rank: 1,
  prev: 2,
  duration: '3:30',
  ...overrides,
});

const makeFeatured = () => ([
  {
    id: 'feature-1',
    title: 'Feature Story',
    eyebrow: 'Featured today',
    label: 'Daily feature',
    description: 'Lead story',
    to: '/album/feature-1',
    cover: '/placeholders/cover.svg',
    track: makeTrack('featuretrack1', 'Daft Punk', 'Feature Track'),
  },
]);

const makeTrending = () =>
  Array.from({ length: 40 }, (_, index) =>
    makeTrack(
      `trend-${index + 1}`,
      index % 2 === 0 ? 'Daft Punk' : 'Aurora',
      `Trending ${index + 1}`,
      { rank: index + 1, prev: index + 2 },
    ),
  );

const makeCharts = () =>
  Array.from({ length: 12 }, (_, index) =>
    makeTrack(`chart-${index + 1}`, 'Daft Punk', `Chart ${index + 1}`, { rank: index + 1, prev: index + 3 }),
  );

const makeSpotlightArtist = (topTracksCount = 6) => ({
  id: 'artist-daft-punk',
  name: 'Daft Punk',
  slug: 'daft-punk',
  humanSlug: 'daft-punk',
  topTracks: Array.from({ length: topTracksCount }, (_, index) =>
    makeTrack(`spot-${index + 1}`, 'Daft Punk', `Spotlight ${index + 1}`),
  ),
});

const renderHome = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    authState = { user: null };
    playerState = {
      history: [
        makeTrack('hist-1', 'Daft Punk', 'History One'),
        makeTrack('hist-2', 'Daft Punk', 'History Two'),
      ],
      playTrack: mocks.playTrack,
      playTracksInOrder: mocks.playTracksInOrder,
      currentTrack: null,
    };

    mocks.getHomeFeed.mockReset();
    mocks.getGenres.mockReset();
    mocks.getCharts.mockReset();
    mocks.getArtist.mockReset();
    mocks.getExploreRadio.mockReset();
    mocks.isNetworkError.mockReset();
    mocks.isNetworkError.mockReturnValue(false);

    mocks.getHomeFeed.mockResolvedValue({
      featured: makeFeatured(),
      trending: makeTrending(),
    });
    mocks.getGenres.mockResolvedValue([
      { id: 'indie', label: 'Indie', thumbnail: '/placeholders/genre.svg' },
      { id: 'electro', label: 'Electro', thumbnail: '/placeholders/genre.svg' },
    ]);
    mocks.getCharts.mockResolvedValue({ items: makeCharts() });
    mocks.getArtist.mockResolvedValue(makeSpotlightArtist());
  });

  it('renders Daily Mix links to search deep links', async () => {
    renderHome();

    const dailyMixLink = await screen.findByRole('link', { name: /daily mix 1/i });
    expect(dailyMixLink).toHaveAttribute('href', '/search?q=Daft%20Punk&type=song');
  });

  it('keeps Fresh Finds and Rising Now headers pointed to Trending', async () => {
    renderHome();

    const freshFindsLink = await screen.findByRole('link', { name: /stranger to your ear/i });
    const risingNowLink = await screen.findByRole('link', { name: /gaining steam this hour/i });

    expect(freshFindsLink).toHaveAttribute('href', '/trending');
    expect(risingNowLink).toHaveAttribute('href', '/trending');
  });

  it('routes history header to /player for guests', async () => {
    authState = { user: null };
    renderHome();

    const historyHeaderLink = await screen.findByRole('link', { name: /pick up where you left off/i });
    expect(historyHeaderLink).toHaveAttribute('href', '/player');
  });

  it('routes history header to /library for authenticated users', async () => {
    authState = { user: { id: 'user-1' } };
    renderHome();

    const historyHeaderLink = await screen.findByRole('link', { name: /pick up where you left off/i });
    expect(historyHeaderLink).toHaveAttribute('href', '/library');
  });

  it('shows spotlight retry fallback when spotlight artist request fails', async () => {
    mocks.getArtist.mockRejectedValueOnce(new Error('spotlight failed'));
    renderHome();

    expect(await screen.findByText(/spotlight artist unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows spotlight warm-up fallback when spotlight has too few tracks', async () => {
    mocks.getArtist.mockResolvedValueOnce(makeSpotlightArtist(1));
    renderHome();

    expect(await screen.findByText(/still warming up/i)).toBeInTheDocument();
  });
});
