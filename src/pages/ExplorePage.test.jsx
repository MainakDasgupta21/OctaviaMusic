import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExplorePage from '@/pages/ExplorePageV2';

const mocks = vi.hoisted(() => ({
  playTrack: vi.fn(),
  addToQueue: vi.fn(),
  playTracksInOrder: vi.fn(),
  toggleFavorite: vi.fn(),
  isFavorite: vi.fn(() => false),
  rememberTasteSeed: vi.fn(),
  rememberTasteProfile: vi.fn(),
  recordFeedback: vi.fn(),
  completeOnboarding: vi.fn(() => ({ moodId: 'focus' })),
  dismissOnboarding: vi.fn(),
  reopenOnboarding: vi.fn(),
  applyEvent: vi.fn(),
  useExploreData: vi.fn(),
  useExploreTaste: vi.fn(),
  useExploreProgress: vi.fn(),
  useExploreSocial: vi.fn(),
  getExploreRadio: vi.fn(),
}));

vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({
    history: [],
    playTrack: mocks.playTrack,
    addToQueue: mocks.addToQueue,
    playTracksInOrder: mocks.playTracksInOrder,
  }),
}));

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    list: [],
    toggleFavorite: mocks.toggleFavorite,
    isFavorite: mocks.isFavorite,
  }),
}));

vi.mock('@/contexts/FollowedArtistsContext', () => ({
  useFollowedArtists: () => ({ list: [] }),
}));

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { displayName: 'Mainak Test' } }),
}));

vi.mock('@/hooks/use-editorial-meta', () => ({
  useEditorialMeta: () => ({ masthead: 'Sun 7 Jun 2026' }),
}));

vi.mock('@/hooks/useExploreData', () => ({
  __esModule: true,
  default: (...args) => mocks.useExploreData(...args),
}));

vi.mock('@/hooks/useExploreTaste', () => ({
  __esModule: true,
  default: (...args) => mocks.useExploreTaste(...args),
}));

vi.mock('@/hooks/useExploreProgress', () => ({
  __esModule: true,
  default: (...args) => mocks.useExploreProgress(...args),
}));

vi.mock('@/hooks/useExploreSocial', () => ({
  __esModule: true,
  default: (...args) => mocks.useExploreSocial(...args),
}));

vi.mock('@/lib/api', () => ({
  __esModule: true,
  getExploreRadio: (...args) => mocks.getExploreRadio(...args),
}));

vi.mock('@/components/HeartButton', () => ({
  __esModule: true,
  default: () => null,
}));

const makeTrack = (id, title, artist) => ({
  id,
  videoId: id.padEnd(11, 'x').slice(0, 11),
  title,
  artist,
  thumbnail: '/placeholders/track.svg',
  _sources: ['trending'],
  _freshness: 1,
  _sourceWeight: 1,
});

const baseData = {
  genres: [
    { id: 'indie', label: 'Indie', sampleTrack: makeTrack('indie000001', 'Indie Spark', 'Nova') },
  ],
  genresLoading: false,
  genresError: false,
  refetchGenres: vi.fn(),
  trending: [makeTrack('trend000001', 'Focus Session', 'Helio')],
  chartsFresh: [makeTrack('fresh000001', 'Night Drive', 'Orbit')],
  chartsClassic: [makeTrack('classic00001', 'Retro Beam', 'Atlas')],
  candidatePool: [
    makeTrack('pool00000001', 'Focus Session', 'Helio'),
    makeTrack('pool00000002', 'Workout Pulse', 'Rex'),
    makeTrack('pool00000003', 'Slow Evening', 'Vela'),
  ],
  isColdStart: true,
  dailyMixes: [
    {
      id: 'mix-1',
      label: 'Daily Mix 01',
      artist: 'Helio',
      thumbnail: '/placeholders/daily-mix.svg',
      seedTracks: [makeTrack('mixtrk00001', 'Mix One', 'Helio')],
      source: 'artist',
    },
  ],
  lastLiked: null,
  becauseList: [],
  hiddenGems: [makeTrack('gem00000001', 'Quiet Gem', 'Mara')],
  recommendationLoading: false,
  lastUpdatedAt: new Date().toISOString(),
};

const baseTaste = {
  tasteSeed: { moodId: 'focus', genreId: null, anchorArtist: null, ts: Date.now() },
  tasteProfile: { moodId: 'focus', energyId: 'calm', activityId: 'working' },
  onboardingOpen: false,
  rememberTasteSeed: mocks.rememberTasteSeed,
  rememberTasteProfile: mocks.rememberTasteProfile,
  recordFeedback: mocks.recordFeedback,
  completeOnboarding: mocks.completeOnboarding,
  dismissOnboarding: mocks.dismissOnboarding,
  reopenOnboarding: mocks.reopenOnboarding,
};

const baseProgress = {
  challenge: {
    id: 'challenge-1',
    title: 'Mood Hopper',
    description: 'Play 2 moods',
    target: 2,
    progress: 1,
    completed: false,
    rewardXp: 50,
  },
  streakDays: 2,
  level: 1,
  xp: 30,
  xpToNextLevel: 90,
  progressToNext: 0.25,
  badges: [],
  recentWins: [],
  completedJourneys: [],
  applyEvent: mocks.applyEvent,
};

const baseSocial = {
  highlights: [
    {
      id: 'h1',
      title: 'Global Spark',
      subtitle: 'World listeners',
      thumbnail: '/placeholders/track.svg',
      statLabel: 'Now peaking',
      track: makeTrack('social00001', 'Global Spark', 'Nova'),
    },
  ],
  snapshots: [
    {
      id: 'cry-2am',
      title: 'Songs people cry to at 2am',
      blurb: 'Velvet late-night cuts.',
      completed: false,
    },
  ],
  activeJourneyPayload: null,
};

const renderPage = (path = '/explore') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/explore" element={<ExplorePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ExplorePage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mocks.playTrack.mockReset();
    mocks.playTracksInOrder.mockReset();
    mocks.toggleFavorite.mockReset();
    mocks.recordFeedback.mockReset();
    mocks.applyEvent.mockReset();
    mocks.isFavorite.mockReset();
    mocks.isFavorite.mockReturnValue(false);
    mocks.useExploreData.mockReturnValue({ ...baseData });
    mocks.useExploreTaste.mockReturnValue({ ...baseTaste });
    mocks.useExploreProgress.mockReturnValue({ ...baseProgress });
    mocks.useExploreSocial.mockReturnValue({ ...baseSocial });
    mocks.getExploreRadio.mockResolvedValue({
      items: [
        makeTrack('radio000001', 'Random One', 'Neon'),
        makeTrack('radio000002', 'Random Two', 'Volt'),
      ],
    });
  });

  it('shows first-visit onboarding when cold-start onboarding is open', async () => {
    mocks.useExploreTaste.mockReturnValue({
      ...baseTaste,
      onboardingOpen: true,
    });

    renderPage('/explore');
    const headings = await screen.findAllByText(/how are you feeling today/i);
    expect(headings.length).toBeGreaterThan(0);
  });

  it('auto-plays mood queue when mood deep-link is present', async () => {
    renderPage('/explore?mood=focus');
    await waitFor(() => {
      expect(mocks.playTracksInOrder).toHaveBeenCalled();
    });
  });

  it('captures save and skip feedback in play-and-decide flow', async () => {
    renderPage('/explore');

    fireEvent.click(await screen.findByRole('button', { name: /start play and decide/i }));
    fireEvent.click(screen.getByRole('button', { name: /swipe right/i }));
    fireEvent.click(screen.getByRole('button', { name: /swipe left/i }));

    expect(mocks.toggleFavorite).toHaveBeenCalledTimes(1);
    const saveCall = mocks.recordFeedback.mock.calls.find((call) => call[0]?.type === 'save');
    const skipCall = mocks.recordFeedback.mock.calls.find((call) => call[0]?.type === 'skip');
    expect(saveCall).toBeTruthy();
    expect(skipCall).toBeTruthy();
  });

  it('retargets recommendations when a mood tile is selected', async () => {
    renderPage('/explore');
    fireEvent.click(await screen.findByRole('button', { name: /set mood workout/i }));
    expect(mocks.playTracksInOrder).toHaveBeenCalled();
  });

  it('mounts additive social and infinite sections without replacing existing sections', async () => {
    renderPage('/explore');
    expect(await screen.findByText(/how are you feeling today/i)).toBeInTheDocument();
    expect(screen.getByText(/discover with the world/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /enter explore flow/i })).toBeInTheDocument();
  });

  it('fetches fresh random radio songs on repeated surprise clicks', async () => {
    renderPage('/explore');

    const surpriseBtn = await screen.findByRole('button', { name: /surprise me/i });
    fireEvent.click(surpriseBtn);
    await waitFor(() => expect(mocks.playTrack).toHaveBeenCalledTimes(1));

    fireEvent.click(surpriseBtn);
    await waitFor(() => expect(mocks.playTrack).toHaveBeenCalledTimes(2));

    expect(mocks.getExploreRadio).toHaveBeenCalledTimes(2);
    const firstCall = mocks.getExploreRadio.mock.calls[0]?.[0] || {};
    const secondCall = mocks.getExploreRadio.mock.calls[1]?.[0] || {};
    expect(firstCall.diversity).toBe('high');
    expect(secondCall.diversity).toBe('high');
    expect(firstCall.seed).toEqual(expect.any(String));
    expect(secondCall.seed).toEqual(expect.any(String));
    expect(secondCall.seed).not.toBe(firstCall.seed);
  });

  it('avoids replaying the same surprise track within a session', async () => {
    mocks.getExploreRadio.mockResolvedValue({
      items: [makeTrack('radio-repeat01', 'Loop Song', 'Pulse')],
    });

    renderPage('/explore');
    const surpriseBtn = await screen.findByRole('button', { name: /surprise me/i });

    fireEvent.click(surpriseBtn);
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(1);
    });
    expect(mocks.getExploreRadio.mock.calls[0]?.[0]?.diversity).toBe('high');

    fireEvent.click(surpriseBtn);
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(2);
    });

    const firstPicked = mocks.playTrack.mock.calls[0]?.[0];
    const secondPicked = mocks.playTrack.mock.calls[1]?.[0];
    expect(firstPicked?.id).toBeTruthy();
    expect(secondPicked?.id).toBeTruthy();
    expect(secondPicked?.id).not.toBe(firstPicked?.id);
  });
});
