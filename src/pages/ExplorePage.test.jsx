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
  useDiscoveryFeed: vi.fn(),
  useExploreTaste: vi.fn(),
  useExploreProgress: vi.fn(),
  useExploreSocial: vi.fn(),
  getExploreRadio: vi.fn(),
  smoothScrollIntoView: vi.fn(),
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

vi.mock('@/hooks/useDiscoveryFeed', () => ({
  __esModule: true,
  default: (...args) => mocks.useDiscoveryFeed(...args),
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

vi.mock('@/lib/discovery-memory', () => ({
  __esModule: true,
  getSeenTrackSet: () => new Set(),
  getArtistFatigueMap: () => new Map(),
  markTrackSeen: vi.fn(),
  subscribeDiscoveryMemory: () => () => {},
}));

vi.mock('@/lib/scroll', () => ({
  __esModule: true,
  smoothScrollIntoView: (...args) => mocks.smoothScrollIntoView(...args),
}));

vi.mock('@/components/HeartButton', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/playlist/AddToPlaylistButton', () => ({
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
    mocks.getExploreRadio.mockReset();
    mocks.isFavorite.mockReturnValue(false);
    mocks.useExploreData.mockReturnValue({ ...baseData });
    mocks.useDiscoveryFeed.mockReturnValue({
      freshPool: [],
      byStrategy: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: vi.fn(),
      usedStrategies: [],
    });
    mocks.useExploreTaste.mockReturnValue({ ...baseTaste });
    mocks.useExploreProgress.mockReturnValue({ ...baseProgress });
    mocks.useExploreSocial.mockReturnValue({ ...baseSocial });
    mocks.smoothScrollIntoView.mockReset();
    mocks.getExploreRadio.mockResolvedValue({
      items: [
        makeTrack('radio000001', 'Random One', 'Neon'),
        makeTrack('radio000002', 'Random Two', 'Volt'),
      ],
    });
  });

  it('shows onboarding dialog when onboarding is open', async () => {
    mocks.useExploreTaste.mockReturnValue({
      ...baseTaste,
      onboardingOpen: true,
    });

    renderPage('/explore');
    expect(await screen.findByRole('dialog', { name: /explore onboarding/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
  });

  it('allows retaking quiz for non-cold-start users', async () => {
    mocks.useExploreData.mockReturnValue({
      ...baseData,
      isColdStart: false,
    });

    renderPage('/explore');
    fireEvent.click(await screen.findByRole('button', { name: /retake quiz/i }));
    expect(mocks.reopenOnboarding).toHaveBeenCalledTimes(1);
  });

  it('auto-plays mood queue when mood deep-link is present', async () => {
    renderPage('/explore?mood=focus');
    await waitFor(() => {
      expect(mocks.playTracksInOrder).toHaveBeenCalledTimes(1);
    });
  });

  it('does not repeatedly scroll mood section while swiping cards', async () => {
    renderPage('/explore?mood=focus');
    await waitFor(() => {
      expect(mocks.playTracksInOrder).toHaveBeenCalledTimes(1);
    });
    expect(mocks.smoothScrollIntoView).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole('button', { name: /start play and decide/i }));
    fireEvent.click(screen.getByRole('button', { name: /swipe right/i }));
    fireEvent.click(screen.getByRole('button', { name: /swipe left/i }));
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(3);
    });
    expect(mocks.smoothScrollIntoView).toHaveBeenCalledTimes(1);
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

  it('plays each swipe card exactly once on entry', async () => {
    renderPage('/explore');

    fireEvent.click(await screen.findByRole('button', { name: /start play and decide/i }));
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /swipe right/i }));
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(2);
    });

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(mocks.playTrack).toHaveBeenCalledTimes(2);
  });

  it('deals a fresh crate after the swipe stack is exhausted', async () => {
    renderPage('/explore');

    fireEvent.click(await screen.findByRole('button', { name: /start play and decide/i }));
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /swipe left/i }));
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /swipe left/i }));
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(3);
    });

    fireEvent.click(screen.getByRole('button', { name: /swipe left/i }));
    const dealFreshCrateBtn = await screen.findByRole('button', { name: /deal a fresh crate/i });
    const playsBeforeDeal = mocks.playTrack.mock.calls.length;

    fireEvent.click(dealFreshCrateBtn);
    await waitFor(() => {
      expect(mocks.playTrack.mock.calls.length).toBeGreaterThan(playsBeforeDeal);
    });
  });

  it('plays mood queue exactly once when a mood tile is selected', async () => {
    renderPage('/explore');
    fireEvent.click(await screen.findByRole('button', { name: /set mood workout/i }));
    await waitFor(() => {
      expect(mocks.playTracksInOrder).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(mocks.playTracksInOrder).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid journey deep-links without playing fallback journeys', async () => {
    renderPage('/explore?journey=not-real');
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(mocks.playTracksInOrder).not.toHaveBeenCalled();
  });

  it('handles valid journey deep-link gracefully when recommendations are unavailable', async () => {
    mocks.useExploreData.mockReturnValue({
      ...baseData,
      candidatePool: [],
      recommendationLoading: false,
    });

    renderPage('/explore?journey=cry-2am');
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(mocks.playTracksInOrder).not.toHaveBeenCalled();
    expect(mocks.smoothScrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('mounts additive social and infinite sections without replacing existing sections', async () => {
    renderPage('/explore');
    expect(await screen.findByText(/how are you feeling today/i)).toBeInTheDocument();
    expect(screen.getByText(/discover with the world/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /enter explore flow/i })).toBeInTheDocument();
  });

  it('plays surprise immediately from local unseen pool even when remote fetch is slow', async () => {
    let resolveRadio = null;
    mocks.getExploreRadio.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRadio = resolve;
        }),
    );

    renderPage('/explore');
    const surpriseBtn = await screen.findByRole('button', { name: /surprise me/i });

    fireEvent.click(surpriseBtn);
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(1);
    });
    expect(mocks.getExploreRadio).toHaveBeenCalledTimes(1);

    resolveRadio?.({
      items: [makeTrack('radio-slow001', 'Slow Radio Pick', 'Pulse')],
    });
  });

  it('consumes prefetched remote surprise candidates on the next tap', async () => {
    mocks.getExploreRadio.mockResolvedValue({
      items: [makeTrack('radio-pref001', 'Prefetched Pick', 'Pulse')],
    });

    renderPage('/explore');
    const surpriseBtn = await screen.findByRole('button', { name: /surprise me/i });

    fireEvent.click(surpriseBtn);
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mocks.getExploreRadio).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.click(surpriseBtn);
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(2);
    });

    const secondPicked = mocks.playTrack.mock.calls[1]?.[0];
    expect(secondPicked?.id || secondPicked?.videoId).toBe('radio-pref001');
  });

  it('keeps local surprise picks non-repeating when remote refresh returns empty', async () => {
    mocks.getExploreRadio.mockResolvedValue({ items: [] });

    renderPage('/explore');
    const surpriseBtn = await screen.findByRole('button', { name: /surprise me/i });

    fireEvent.click(surpriseBtn);
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(surpriseBtn);
    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(2);
    });

    const firstPicked = mocks.playTrack.mock.calls[0]?.[0];
    const secondPicked = mocks.playTrack.mock.calls[1]?.[0];
    expect(firstPicked?.id || firstPicked?.videoId).toBeTruthy();
    expect(secondPicked?.id || secondPicked?.videoId).toBeTruthy();
    expect(secondPicked?.id || secondPicked?.videoId).not.toBe(firstPicked?.id || firstPicked?.videoId);
  });

  it('ignores rapid duplicate surprise clicks while a request is in flight', async () => {
    mocks.useExploreData.mockReturnValue({
      ...baseData,
      candidatePool: [],
    });
    let resolveRadio = null;
    mocks.getExploreRadio.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRadio = resolve;
        }),
    );

    renderPage('/explore');
    const surpriseBtn = await screen.findByRole('button', { name: /surprise me/i });
    fireEvent.click(surpriseBtn);
    fireEvent.click(surpriseBtn);

    expect(mocks.getExploreRadio).toHaveBeenCalledTimes(1);
    resolveRadio?.({
      items: [makeTrack('radio-race01', 'Race Song', 'Pulse')],
    });

    await waitFor(() => {
      expect(mocks.playTrack).toHaveBeenCalledTimes(1);
    });
  });
});
