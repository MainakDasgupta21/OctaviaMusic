import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Heart, Play, RefreshCw, Sparkles } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useFollowedArtists } from '@/contexts/FollowedArtistsContext';
import { useSettings } from '@/contexts/SettingsContext';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import EmptyState from '@/components/ui-v2/EmptyState';
import Skeleton from '@/components/ui-v2/Skeleton';
import Button from '@/components/ui-v2/Button';
import SmartImage from '@/components/SmartImage';
import ExploreOnboarding from '@/components/explore/ExploreOnboarding';
import MoodBoard from '@/components/explore/MoodBoard';
import SwipeDeck from '@/components/explore/SwipeDeck';
import SurpriseMeButton from '@/components/explore/SurpriseMeButton';
import CuratedJourneys from '@/components/explore/CuratedJourneys';
import LivePulse from '@/components/explore/LivePulse';
import DiscoveryStreakBar from '@/components/explore/DiscoveryStreakBar';
import DailyChallengeCard from '@/components/explore/DailyChallengeCard';
import LoopCompleteModal from '@/components/explore/LoopCompleteModal';
import CommunityDiscoveryStrip from '@/components/explore/CommunityDiscoveryStrip';
import ExploreShareModal from '@/components/explore/ExploreShareModal';
import ExploreFlowEntryCard from '@/components/explore/ExploreFlowEntryCard';
import HeartButton from '@/components/HeartButton';
import AddToPlaylistButton from '@/components/playlist/AddToPlaylistButton';
import useExploreData from '@/hooks/useExploreData';
import useDiscoveryFeed from '@/hooks/useDiscoveryFeed';
import useExploreTaste from '@/hooks/useExploreTaste';
import useExploreProgress from '@/hooks/useExploreProgress';
import useExploreSocial from '@/hooks/useExploreSocial';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { getExploreRadio } from '@/lib/api';
import {
  EXPLORE_MOODS,
  buildGenreQueue,
  buildJourneyQueue,
  buildMoodQueue,
  pickSurpriseTrack,
  resolveExploreMoodId,
} from '@/lib/explore-recommendations';
import { EXPLORE_CURATED_JOURNEYS } from '@/lib/explore-journeys';
import {
  EXPLORE_DISCOVERY_V3_ENABLED,
  EXPLORE_INFINITE_ENABLED,
  EXPLORE_LOOPS_ENABLED,
  EXPLORE_SOCIAL_ENABLED,
  EXPLORE_V2_ENABLED,
} from '@/lib/feature-flags';
import { buildSharedJourneyArtifact } from '@/lib/explore-social';
import {
  getArtistFatigueMap,
  getSeenTrackSet,
  markTrackSeen,
  subscribeDiscoveryMemory,
} from '@/lib/discovery-memory';
import {
  addDeckSeenTrack,
  addSurpriseSeenTrack,
  buildDeckSeed,
  buildSurpriseSeed,
  filterUnseenSurpriseTracks,
  getDeckSeenSet,
  getSurpriseSeenSet,
  pickRandomItem,
  surpriseTrackId,
  shuffleRandomItems,
} from '@/lib/surprise-random';
import { smoothScrollIntoView } from '@/lib/scroll';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/design/motion';

const SURPRISE_REMOTE_LIMIT = 24;
const SURPRISE_PREFETCH_QUEUE_MAX = 24;
const SURPRISE_REMOTE_TIMEOUT_MS = 3500;
const SWIPE_DECK_COUNT = 24;
const SWIPE_DECK_SPARSE_THRESHOLD = SWIPE_DECK_COUNT * 2;
const LOOP_WIN_SEEN_KEY = 'octavia.explore.loop-win-seen.v1';
const DISCOVERY_SEEN_HORIZON_MS = 30 * 24 * 60 * 60 * 1000;

const readSeenLoopWinId = () => {
  if (typeof window === 'undefined') return '';
  try {
    return String(window.localStorage.getItem(LOOP_WIN_SEEN_KEY) || '');
  } catch {
    return '';
  }
};

const writeSeenLoopWinId = (winId) => {
  if (typeof window === 'undefined') return;
  try {
    if (!winId) {
      window.localStorage.removeItem(LOOP_WIN_SEEN_KEY);
      return;
    }
    window.localStorage.setItem(LOOP_WIN_SEEN_KEY, String(winId));
  } catch {
    /* storage unavailable */
  }
};

const handleCardKeyboardActivation = (event, action) => {
  if (event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
};

const ExplorePageV2 = () => {
  const { history, playTrack, playTracksInOrder } = usePlayer();
  const { list: favorites, toggleFavorite, isFavorite } = useFavorites();
  const { list: followedArtists } = useFollowedArtists();
  const { settings } = useSettings();
  const { masthead } = useEditorialMeta();
  const [searchParams, setSearchParams] = useSearchParams();

  const [lastSurprise, setLastSurprise] = useState(null);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [sharePayload, setSharePayload] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [loopWin, setLoopWin] = useState(null);
  const surpriseInFlightRef = useRef(false);
  const surprisePrefetchQueueRef = useRef([]);
  const surprisePrefetchInFlightRef = useRef(false);
  const [deckSeed, setDeckSeed] = useState(() => buildDeckSeed());
  const [swipeDeckTracks, setSwipeDeckTracks] = useState([]);
  const lastWinRef = useRef(readSeenLoopWinId());
  const swipeDeckMoodRef = useRef(null);
  const swipeDeckSeedRef = useRef('');
  const moodSectionRef = useRef(null);
  const genresSectionRef = useRef(null);
  const journeysSectionRef = useRef(null);
  const infiniteSectionRef = useRef(null);
  const handledMoodRef = useRef(null);
  const handledGenreRef = useRef(null);
  const handledJourneyRef = useRef(null);
  const scrolledMoodRef = useRef(null);
  const scrolledGenreRef = useRef(null);

  const {
    tasteSeed,
    tasteProfile,
    onboardingOpen,
    rememberTasteSeed,
    rememberTasteProfile,
    recordFeedback,
    completeOnboarding,
    dismissOnboarding,
    reopenOnboarding,
  } = useExploreTaste({ forceOnboarding: searchParams.get('onboarding') === '1' });

  const {
    challenge,
    streakDays,
    level,
    xp,
    xpToNextLevel,
    progressToNext,
    badges,
    recentWins,
    completedJourneys,
    applyEvent,
  } = useExploreProgress();

  const moodParam = searchParams.get('mood');
  const genreParam = searchParams.get('genre');
  const journeyParam = searchParams.get('journey');
  const modeParam = searchParams.get('mode');
  const firstName = settings.displayName?.split(' ')[0] || 'you';
  const activeMoodId = resolveExploreMoodId({
    moodId: moodParam || tasteSeed?.moodId || tasteProfile?.moodId,
    activityId: tasteProfile?.activityId,
    energyId: tasteProfile?.energyId,
  });
  const activeMood = EXPLORE_MOODS.find((entry) => entry.id === activeMoodId) || EXPLORE_MOODS[0];

  const [discoveryRefreshNonce, setDiscoveryRefreshNonce] = useState(0);
  const [memoryRevision, setMemoryRevision] = useState(0);
  const visitSeed = useMemo(
    () => `${buildDeckSeed()}:${discoveryRefreshNonce}`,
    [discoveryRefreshNonce],
  );

  useEffect(
    () =>
      subscribeDiscoveryMemory(() => {
        setMemoryRevision((prev) => prev + 1);
      }),
    [],
  );

  const seenTrackSet = useMemo(
    () => getSeenTrackSet({ horizonMs: DISCOVERY_SEEN_HORIZON_MS }),
    [memoryRevision],
  );
  const artistFatigueMap = useMemo(
    () => getArtistFatigueMap(),
    [memoryRevision],
  );
  const markDiscoveryTrack = useCallback((track, source = 'explore') => {
    if (!EXPLORE_DISCOVERY_V3_ENABLED || !track) return;
    markTrackSeen(track, source);
  }, []);
  const queueExcludeIds = EXPLORE_DISCOVERY_V3_ENABLED ? seenTrackSet : null;
  const queueArtistFatigue = EXPLORE_DISCOVERY_V3_ENABLED ? artistFatigueMap : null;
  const queueSeed = EXPLORE_DISCOVERY_V3_ENABLED ? visitSeed : null;

  const discovery = useDiscoveryFeed({
    mood: activeMood?.id || '',
    genre: genreParam || tasteSeed?.genreId || '',
    tasteSeed,
    tasteProfile,
    followedArtists,
    history,
    favorites,
    enabled: EXPLORE_V2_ENABLED && EXPLORE_DISCOVERY_V3_ENABLED,
  });

  const {
    genres,
    genresLoading,
    genresError,
    refetchGenres,
    trending,
    chartsFresh,
    chartsClassic,
    candidatePool,
    dailyMixes,
    lastLiked,
    becauseList,
    hiddenGems,
    recommendationLoading,
    lastUpdatedAt,
  } = useExploreData({
    history,
    favorites,
    followedArtists,
    tasteSeed,
    tasteProfile,
    freshPool: EXPLORE_DISCOVERY_V3_ENABLED ? discovery.freshPool : [],
    excludeIds: queueExcludeIds,
    discoverySeed: queueSeed,
    artistFatigue: queueArtistFatigue,
  });
  const currentGenreLabel = useMemo(() => {
    if (!genreParam) return '';
    return genres.find((entry) => entry.id === genreParam)?.label || genreParam;
  }, [genreParam, genres]);
  const recommendationsBootstrapping =
    (recommendationLoading || discovery.isLoading) && candidatePool.length === 0;

  const updateParams = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([key, value]) =>
            value ? next.set(key, value) : next.delete(key),
          );
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const recordTasteAndProgress = useCallback(
    (feedbackEvent, progressEvent = null) => {
      recordFeedback(feedbackEvent);
      if (!EXPLORE_LOOPS_ENABLED) return;
      applyEvent({
        type: progressEvent?.type || feedbackEvent?.type || 'play',
        moodId: progressEvent?.moodId || feedbackEvent?.moodId || null,
        journeyId: progressEvent?.journeyId || null,
      });
    },
    [recordFeedback, applyEvent],
  );

  const playMood = useCallback(
    (mood, fromParam = false) => {
      if (!candidatePool.length) {
        if (!fromParam) notify.info('Tuning recommendations...');
        return false;
      }
      let queue = buildMoodQueue({
        mood,
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteSeed,
        tasteProfile,
        count: 12,
        seed: queueSeed,
        excludeIds: queueExcludeIds,
        artistFatigue: queueArtistFatigue,
      });
      if (!queue.length && queueExcludeIds?.size > 0) {
        queue = buildMoodQueue({
          mood,
          pool: candidatePool,
          history,
          favorites,
          followedArtists,
          tasteSeed,
          tasteProfile,
          count: 12,
          seed: queueSeed ? `${queueSeed}:fallback` : null,
          artistFatigue: queueArtistFatigue,
        });
      }
      if (!queue.length) return false;
      playTracksInOrder(queue, { replaceQueue: true, forceSequential: false });
      markDiscoveryTrack(queue[0], 'mood_queue');
      rememberTasteSeed({
        moodId: mood.id,
        genreId: null,
        anchorArtist: queue[0]?.artist || null,
      });
      rememberTasteProfile({ moodId: mood.id });
      if (!fromParam) notify.info(`${mood.label} · tuned for now`);
      if (EXPLORE_LOOPS_ENABLED) {
        applyEvent({
          type: 'mood_play',
          moodId: mood.id,
        });
      }
      return true;
    },
    [
      candidatePool,
      history,
      favorites,
      followedArtists,
      tasteSeed,
      tasteProfile,
      queueSeed,
      queueExcludeIds,
      queueArtistFatigue,
      playTracksInOrder,
      markDiscoveryTrack,
      rememberTasteSeed,
      rememberTasteProfile,
      applyEvent,
    ],
  );

  const playGenre = useCallback(
    (genre, fromParam = false) => {
      if (!candidatePool.length) {
        if (!fromParam) notify.info('Tuning recommendations...');
        return false;
      }
      let queue = buildGenreQueue({
        genre,
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteSeed,
        tasteProfile,
        count: 12,
        seed: queueSeed,
        excludeIds: queueExcludeIds,
        artistFatigue: queueArtistFatigue,
      });
      if (!queue.length && queueExcludeIds?.size > 0) {
        queue = buildGenreQueue({
          genre,
          pool: candidatePool,
          history,
          favorites,
          followedArtists,
          tasteSeed,
          tasteProfile,
          count: 12,
          seed: queueSeed ? `${queueSeed}:fallback` : null,
          artistFatigue: queueArtistFatigue,
        });
      }
      if (!queue.length) return false;
      playTracksInOrder(queue, { replaceQueue: true, forceSequential: false });
      markDiscoveryTrack(queue[0], 'genre_queue');
      if (!fromParam) notify.info(`${genre.label} · discovery set`);
      return true;
    },
    [
      candidatePool,
      history,
      favorites,
      followedArtists,
      tasteSeed,
      tasteProfile,
      queueSeed,
      queueExcludeIds,
      queueArtistFatigue,
      playTracksInOrder,
      markDiscoveryTrack,
    ],
  );

  const playJourney = useCallback(
    (journey, { fromParam = false, payloadItems = null } = {}) => {
      if (!journey) return false;
      const payloadQueue = Array.isArray(payloadItems)
        ? payloadItems.filter((track) => {
            const trackId = String(track?.id || track?.videoId || '').trim();
            if (!trackId) return false;
            return !queueExcludeIds?.has?.(trackId);
          })
        : [];
      let queue = payloadQueue.length
        ? payloadQueue
        : buildJourneyQueue({
            journey,
            pool: candidatePool,
            history,
            favorites,
            followedArtists,
            tasteSeed,
            tasteProfile,
            count: 14,
            seed: queueSeed,
            excludeIds: queueExcludeIds,
            artistFatigue: queueArtistFatigue,
          });
      if (!queue.length && queueExcludeIds?.size > 0) {
        queue = buildJourneyQueue({
          journey,
          pool: candidatePool,
          history,
          favorites,
          followedArtists,
          tasteSeed,
          tasteProfile,
          count: 14,
          seed: queueSeed ? `${queueSeed}:fallback` : null,
          artistFatigue: queueArtistFatigue,
        });
      }
      if (!queue.length) return false;
      playTracksInOrder(queue, { replaceQueue: true, forceSequential: false });
      markDiscoveryTrack(queue[0], 'journey_queue');
      if (!fromParam) notify.info(`${journey.title} · journey started`);
      if (EXPLORE_LOOPS_ENABLED) {
        applyEvent({
          type: 'journey_start',
          moodId: journey?.moodId || activeMoodId || null,
          journeyId: journey?.id || null,
        });
      }
      return true;
    },
    [
      candidatePool,
      history,
      favorites,
      followedArtists,
      tasteSeed,
      tasteProfile,
      queueExcludeIds,
      queueSeed,
      queueArtistFatigue,
      playTracksInOrder,
      markDiscoveryTrack,
      applyEvent,
      activeMoodId,
    ],
  );

  const social = useExploreSocial({
    trending,
    chartsFresh,
    chartsClassic,
    journeys: EXPLORE_CURATED_JOURNEYS,
    completedJourneyIds: completedJourneys,
    challenge,
    activeJourneyId: journeyParam || '',
    enabled: EXPLORE_SOCIAL_ENABLED && EXPLORE_V2_ENABLED,
  });

  const buildSwipeDeckTracks = useCallback(
    (mood) => {
      const seenSet = getDeckSeenSet();
      const combinedSeen = queueExcludeIds
        ? new Set([...seenSet, ...queueExcludeIds])
        : seenSet;
      let queue = buildMoodQueue({
        mood,
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteSeed,
        tasteProfile,
        count: SWIPE_DECK_COUNT,
        seed: queueSeed ? `${deckSeed}:${queueSeed}` : deckSeed,
        excludeIds: combinedSeen,
        artistFatigue: queueArtistFatigue,
      });
      if (!queue.length && combinedSeen.size > 0) {
        queue = buildMoodQueue({
          mood,
          pool: candidatePool,
          history,
          favorites,
          followedArtists,
          tasteSeed,
          tasteProfile,
          count: SWIPE_DECK_COUNT,
          seed: queueSeed ? `${deckSeed}:${queueSeed}:fallback-all` : `${deckSeed}:fallback-all`,
          artistFatigue: queueArtistFatigue,
        });
      }
      if (candidatePool.length < SWIPE_DECK_SPARSE_THRESHOLD) {
        return shuffleRandomItems(queue).slice(0, SWIPE_DECK_COUNT);
      }
      return queue;
    },
    [
      candidatePool,
      history,
      favorites,
      followedArtists,
      tasteSeed,
      tasteProfile,
      deckSeed,
      queueSeed,
      queueExcludeIds,
      queueArtistFatigue,
    ],
  );

  useEffect(() => {
    if (!activeMood?.id || candidatePool.length === 0) return;
    const shouldRefreshForMood = swipeDeckMoodRef.current !== activeMood.id;
    const shouldRefreshForSeed = swipeDeckSeedRef.current !== deckSeed;
    const shouldPrimeDeck = swipeDeckTracks.length === 0;
    if (!shouldRefreshForMood && !shouldRefreshForSeed && !shouldPrimeDeck) return;
    setSwipeDeckTracks(buildSwipeDeckTracks(activeMood));
    swipeDeckMoodRef.current = activeMood.id;
    swipeDeckSeedRef.current = deckSeed;
  }, [activeMood, buildSwipeDeckTracks, candidatePool.length, deckSeed, swipeDeckTracks.length]);

  useEffect(() => {
    if (!recentWins.length) return;
    const latest = recentWins[0];
    if (!latest || latest.id === lastWinRef.current) return;
    lastWinRef.current = latest.id;
    writeSeenLoopWinId(latest.id);
    setLoopWin(latest);
  }, [recentWins]);

  useEffect(() => {
    if (moodParam) {
      scrolledGenreRef.current = null;
      if (scrolledMoodRef.current !== moodParam) {
        smoothScrollIntoView(moodSectionRef.current);
        scrolledMoodRef.current = moodParam;
      }
      return;
    }
    scrolledMoodRef.current = null;
    if (genreParam) {
      if (scrolledGenreRef.current !== genreParam) {
        smoothScrollIntoView(genresSectionRef.current);
        scrolledGenreRef.current = genreParam;
      }
      return;
    }
    scrolledGenreRef.current = null;
  }, [moodParam, genreParam]);

  useEffect(() => {
    if (moodParam) {
      handledGenreRef.current = null;
      const mood = EXPLORE_MOODS.find((entry) => entry.id === moodParam);
      if (mood && candidatePool.length > 0 && handledMoodRef.current !== moodParam) {
        playMood(mood, true);
        handledMoodRef.current = moodParam;
      }
      return;
    }
    handledMoodRef.current = null;
    if (genreParam) {
      const genre = genres.find((entry) => entry.id === genreParam);
      if (genre && candidatePool.length > 0 && handledGenreRef.current !== genreParam) {
        playGenre(genre, true);
        handledGenreRef.current = genreParam;
      }
      return;
    }
    handledGenreRef.current = null;
  }, [moodParam, genreParam, genres, candidatePool.length, playMood, playGenre]);

  useEffect(() => {
    if (!journeyParam) {
      handledJourneyRef.current = null;
      return;
    }
    if (handledJourneyRef.current === journeyParam) return;
    smoothScrollIntoView(journeysSectionRef.current);
    const journey = EXPLORE_CURATED_JOURNEYS.find((entry) => entry.id === journeyParam);
    if (!journey) {
      notify.info('That journey is unavailable right now.');
      handledJourneyRef.current = journeyParam;
      return;
    }
    const payloadItems = social.activeJourneyPayload?.id === journeyParam
      ? social.activeJourneyPayload?.items
      : null;
    const hasPayloadItems = Array.isArray(payloadItems) && payloadItems.length > 0;
    if (!hasPayloadItems && candidatePool.length === 0) {
      if (recommendationsBootstrapping) return;
      notify.info('That journey is unavailable right now.');
      handledJourneyRef.current = journeyParam;
      return;
    }
    const played = playJourney(journey, { fromParam: true, payloadItems });
    if (played) {
      handledJourneyRef.current = journeyParam;
      return;
    }
    if (!recommendationsBootstrapping) {
      notify.info('That journey is unavailable right now.');
      handledJourneyRef.current = journeyParam;
    }
  }, [
    journeyParam,
    candidatePool.length,
    recommendationsBootstrapping,
    playJourney,
    social.activeJourneyPayload,
  ]);

  useEffect(() => {
    if (modeParam !== 'flow') return;
    smoothScrollIntoView(infiniteSectionRef.current);
  }, [modeParam]);

  const handleShareJourney = useCallback(
    (journey) => {
      if (!journey) return;
      const payload = buildSharedJourneyArtifact({
        journey,
        leadTrack: social.highlights[0]?.track || candidatePool[0] || null,
        mood: activeMood?.id || '',
        genre: genreParam || '',
      });
      setSharePayload(payload);
      setShareOpen(true);
    },
    [social.highlights, candidatePool, activeMood?.id, genreParam],
  );

  const buildCombinedSurpriseSeenSet = useCallback(() => {
    const seenSet = getSurpriseSeenSet();
    if (!queueExcludeIds) return seenSet;
    return new Set([...seenSet, ...queueExcludeIds]);
  }, [queueExcludeIds]);

  const consumePrefetchedSurprise = useCallback((seenSet) => {
    const queue = Array.isArray(surprisePrefetchQueueRef.current)
      ? surprisePrefetchQueueRef.current
      : [];
    if (!queue.length) return null;

    let pick = null;
    const nextQueue = [];
    queue.forEach((track) => {
      const trackId = surpriseTrackId(track);
      if (!trackId || seenSet.has(trackId)) return;
      if (!pick) {
        pick = track;
        return;
      }
      nextQueue.push(track);
    });
    surprisePrefetchQueueRef.current = nextQueue.slice(0, SURPRISE_PREFETCH_QUEUE_MAX);
    return pick;
  }, []);

  const pickImmediateLocalSurprise = useCallback((seenSet) => {
    const unseenLocalPool = filterUnseenSurpriseTracks(candidatePool, {
      seenSet,
    });
    if (!unseenLocalPool.length) return null;
    return (
      pickSurpriseTrack({
        pool: shuffleRandomItems(unseenLocalPool),
        history,
        favorites,
        followedArtists,
        tasteSeed,
        tasteProfile,
        mood: activeMood,
        seed: queueSeed,
        excludeIds: seenSet,
        artistFatigue: queueArtistFatigue,
      })
      || pickRandomItem(unseenLocalPool)
    );
  }, [
    activeMood,
    candidatePool,
    history,
    favorites,
    followedArtists,
    tasteSeed,
    tasteProfile,
    queueSeed,
    queueArtistFatigue,
  ]);

  const fetchRemoteSurpriseCandidates = useCallback(
    async ({ seenSet = null } = {}) => {
      if (surprisePrefetchInFlightRef.current) return [];
      surprisePrefetchInFlightRef.current = true;
      const baseSeenSet = seenSet ? new Set(seenSet) : buildCombinedSurpriseSeenSet();
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timeoutId = controller
        ? setTimeout(() => controller.abort(), SURPRISE_REMOTE_TIMEOUT_MS)
        : null;

      try {
        const randomMood = pickRandomItem(EXPLORE_MOODS);
        const randomGenre = pickRandomItem(genres);
        const mood = randomMood?.id || activeMood?.id || '';
        const genre = randomGenre?.label || currentGenreLabel || '';

        const radio = await getExploreRadio({
          mood,
          genre,
          seed: buildSurpriseSeed(),
          diversity: 'high',
          limit: SURPRISE_REMOTE_LIMIT,
          signal: controller?.signal,
        });
        const fetchedItems = Array.isArray(radio?.items) ? radio.items : [];
        const unseenFromFetch = filterUnseenSurpriseTracks(
          shuffleRandomItems(fetchedItems),
          { seenSet: baseSeenSet },
        );

        const queue = Array.isArray(surprisePrefetchQueueRef.current)
          ? surprisePrefetchQueueRef.current
          : [];
        const mergedQueue = [];
        const mergedIds = new Set();
        [...queue, ...unseenFromFetch].forEach((track) => {
          const trackId = surpriseTrackId(track);
          if (!trackId || baseSeenSet.has(trackId) || mergedIds.has(trackId)) return;
          mergedIds.add(trackId);
          mergedQueue.push(track);
        });
        surprisePrefetchQueueRef.current = mergedQueue.slice(0, SURPRISE_PREFETCH_QUEUE_MAX);
        return unseenFromFetch;
      } catch {
        return [];
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        surprisePrefetchInFlightRef.current = false;
      }
    },
    [
      activeMood,
      buildCombinedSurpriseSeenSet,
      currentGenreLabel,
      genres,
    ],
  );

  const handleSurprise = useCallback(async () => {
    if (surpriseLoading || surpriseInFlightRef.current) return;
    surpriseInFlightRef.current = true;
    setSurpriseLoading(true);
    const moodForFeedback = activeMood?.id || null;
    try {
      const combinedSeenSet = buildCombinedSurpriseSeenSet();
      let pick = consumePrefetchedSurprise(combinedSeenSet);
      if (!pick) {
        pick = pickImmediateLocalSurprise(combinedSeenSet);
      }

      if (!pick) {
        await fetchRemoteSurpriseCandidates({ seenSet: combinedSeenSet });
        pick = consumePrefetchedSurprise(combinedSeenSet);
      }

      if (!pick) {
        notify.info('No new surprise songs left this session. Try again later.');
        return;
      }

      const pickedId = surpriseTrackId(pick);
      if (pickedId) combinedSeenSet.add(pickedId);
      addSurpriseSeenTrack(pick);
      markDiscoveryTrack(pick, 'surprise');
      setLastSurprise(pick);
      playTrack(pick);
      recordTasteAndProgress(
        { type: 'play', track: pick, moodId: moodForFeedback },
        { type: 'surprise_play', moodId: moodForFeedback },
      );
      void fetchRemoteSurpriseCandidates({ seenSet: combinedSeenSet });
    } finally {
      surpriseInFlightRef.current = false;
      setSurpriseLoading(false);
    }
  }, [
    surpriseLoading,
    activeMood,
    buildCombinedSurpriseSeenSet,
    consumePrefetchedSurprise,
    pickImmediateLocalSurprise,
    fetchRemoteSurpriseCandidates,
    playTrack,
    markDiscoveryTrack,
    recordTasteAndProgress,
  ]);

  const handleShuffleDeck = useCallback(() => {
    if (!candidatePool.length) {
      notify.info('Tuning recommendations...');
      return;
    }
    setDeckSeed(buildDeckSeed());
  }, [candidatePool.length]);

  const handleSwipeTrackEnter = useCallback(
    (track) => {
      addDeckSeenTrack(track);
      markDiscoveryTrack(track, 'swipe_enter');
      playTrack(track);
      recordTasteAndProgress({
        type: 'play',
        track,
        moodId: activeMood?.id || null,
      });
    },
    [activeMood?.id, playTrack, markDiscoveryTrack, recordTasteAndProgress],
  );

  const handleSwipeSave = useCallback(
    (track) => {
      addDeckSeenTrack(track);
      markDiscoveryTrack(track, 'swipe_save');
      const trackId = track?.id || track?.videoId || '';
      let saveResult = true;
      if (trackId && !isFavorite(trackId)) {
        saveResult = toggleFavorite({
          ...track,
          id: track?.id || trackId,
        });
      }
      if (saveResult == null) return;
      recordTasteAndProgress({
        type: 'save',
        track,
        moodId: activeMood?.id || null,
      });
    },
    [activeMood?.id, isFavorite, markDiscoveryTrack, recordTasteAndProgress, toggleFavorite],
  );

  const handleSwipeSkip = useCallback(
    (track) => {
      addDeckSeenTrack(track);
      markDiscoveryTrack(track, 'swipe_skip');
      recordTasteAndProgress({
        type: 'skip',
        track,
        moodId: activeMood?.id || null,
      });
    },
    [activeMood?.id, markDiscoveryTrack, recordTasteAndProgress],
  );

  const handleDailyMixPlay = useCallback(
    (mix) => {
      const seedTracks = Array.isArray(mix?.seedTracks) ? mix.seedTracks : [];
      if (!seedTracks.length) return;
      markDiscoveryTrack(seedTracks[0], 'daily_mix');
      playTracksInOrder(seedTracks, {
        replaceQueue: true,
        forceSequential: false,
      });
    },
    [markDiscoveryTrack, playTracksInOrder],
  );

  const handleHiddenGemPlay = useCallback(
    (track) => {
      markDiscoveryTrack(track, 'hidden_gem');
      playTrack(track);
    },
    [markDiscoveryTrack, playTrack],
  );

  const handleBecausePlaySet = useCallback(() => {
    if (!becauseList.length) return;
    markDiscoveryTrack(becauseList[0], 'because_set');
    playTracksInOrder(becauseList, {
      replaceQueue: true,
      startIndex: 0,
      forceSequential: false,
    });
  }, [becauseList, markDiscoveryTrack, playTracksInOrder]);

  const handleBecauseTrackPlay = useCallback(
    (track) => {
      markDiscoveryTrack(track, 'because_track');
      playTrack(track);
    },
    [markDiscoveryTrack, playTrack],
  );

  const handleRecommendationsPendingNotice = useCallback(() => {
    notify.info('Tuning recommendations...');
  }, []);

  const handleRefreshDiscovery = useCallback(() => {
    if (!EXPLORE_DISCOVERY_V3_ENABLED) return;
    setDiscoveryRefreshNonce((prev) => prev + 1);
    discovery.refresh();
    setDeckSeed(buildDeckSeed());
    notify.info('Discovery refreshed');
  }, [discovery.refresh]);

  const handleMoodSelect = useCallback(
    (mood) => {
      if (recommendationsBootstrapping) {
        handleRecommendationsPendingNotice();
        return;
      }
      setDeckSeed(buildDeckSeed());
      handledMoodRef.current = mood.id;
      updateParams({ mood: mood.id, genre: null, onboarding: null });
      playMood(mood);
    },
    [handleRecommendationsPendingNotice, playMood, recommendationsBootstrapping, updateParams],
  );

  const handleGenreSelect = useCallback(
    (genre) => {
      if (recommendationsBootstrapping) {
        handleRecommendationsPendingNotice();
        return;
      }
      handledGenreRef.current = genre.id;
      updateParams({ genre: genre.id, mood: null });
      playGenre(genre);
    },
    [handleRecommendationsPendingNotice, playGenre, recommendationsBootstrapping, updateParams],
  );

  return (
    <div className="page-shell-content-wide pt-5 md:pt-8 pb-12">
      {EXPLORE_V2_ENABLED ? (
        <ExploreOnboarding
          open={onboardingOpen}
          onSkip={dismissOnboarding}
          onComplete={(answers) => {
            const patch = completeOnboarding(answers);
            if (patch?.moodId) {
              updateParams({ mood: patch.moodId, onboarding: null });
              const mood = EXPLORE_MOODS.find((entry) => entry.id === patch.moodId);
              if (mood) {
                handledMoodRef.current = mood.id;
                playMood(mood);
              }
            }
          }}
        />
      ) : null}

      <div className="hidden md:flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4 mb-7 border-b border-white/[0.08] pb-3">
        <span>{masthead}</span>
        <div className="flex items-center gap-4">
          <span>The Octavia Daily · Explore</span>
          {EXPLORE_DISCOVERY_V3_ENABLED ? (
            <button
              type="button"
              onClick={handleRefreshDiscovery}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.14] px-2.5 py-1 text-[10px] tracking-[0.16em] text-ink-3 hover:text-ink hover:border-white/35"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', discovery.isRefreshing && 'animate-spin')} />
              Refresh
            </button>
          ) : null}
        </div>
        <span>For {firstName}</span>
      </div>

      <motion.div className="mb-10" {...fadeUp}>
        <p className="eyebrow eyebrow-accent mb-2">Made for you</p>
        <h1 className="font-display text-display-xl text-ink leading-[0.95]">
          Discover songs that feel personal, instantly.
        </h1>
      </motion.div>

      {EXPLORE_V2_ENABLED ? (
        <SurpriseMeButton
          onSurprise={handleSurprise}
          isLoading={surpriseLoading || recommendationsBootstrapping}
          disabled={surpriseLoading}
          lastPickedTitle={lastSurprise?.title || ''}
        />
      ) : null}

      {EXPLORE_V2_ENABLED && EXPLORE_LOOPS_ENABLED ? (
        <DiscoveryStreakBar
          streakDays={streakDays}
          level={level}
          xp={xp}
          xpToNextLevel={xpToNextLevel}
          progressToNext={progressToNext}
          badgesCount={badges.length}
          challenge={challenge}
        />
      ) : null}

      <section ref={moodSectionRef} className="mb-14 scroll-mt-24">
        <SectionHeader
          ordinal={1}
          eyebrow="Mood board"
          title="How are you feeling today?"
          action={(
            <button
              type="button"
              onClick={() => {
                reopenOnboarding();
                updateParams({ onboarding: '1' });
              }}
              className="text-[11px] font-mono uppercase tracking-[0.14em] text-ink-3 hover:text-ink"
            >
              Retake quiz
            </button>
          )}
        />
        <MoodBoard
          moods={EXPLORE_MOODS}
          activeMoodId={activeMood?.id || null}
          disabled={recommendationsBootstrapping}
          onDisabledSelect={handleRecommendationsPendingNotice}
          onMoodSelect={handleMoodSelect}
        />
      </section>

      {EXPLORE_V2_ENABLED ? (
        <section className="mb-14">
          <SectionHeader
            ordinal={2}
            eyebrow="Pure feeling"
            title="Play and Decide"
            subtitle="Tap once, then swipe right to save and left to skip."
          />
          <SwipeDeck
            tracks={swipeDeckTracks}
            deckSignature={deckSeed}
            moodLabel={activeMood?.label || 'your vibe'}
            onTrackEnter={handleSwipeTrackEnter}
            onSave={handleSwipeSave}
            onSkip={handleSwipeSkip}
            onShuffle={handleShuffleDeck}
          />
        </section>
      ) : null}

      {EXPLORE_V2_ENABLED && EXPLORE_LOOPS_ENABLED ? (
        <DailyChallengeCard
          challenge={challenge}
          onStartChallenge={() => smoothScrollIntoView(moodSectionRef.current)}
        />
      ) : null}

      {EXPLORE_V2_ENABLED ? (
        <section ref={journeysSectionRef}>
          <CuratedJourneys
            journeys={EXPLORE_CURATED_JOURNEYS}
            ordinal={3}
            onPlayJourney={(journey) => playJourney(journey)}
          />
        </section>
      ) : null}

      {EXPLORE_V2_ENABLED ? (
        <LivePulse
          trendingCount={trending.length}
          leadTrack={chartsFresh[0] || null}
          lastUpdated={lastUpdatedAt}
        />
      ) : null}

      {EXPLORE_V2_ENABLED && EXPLORE_SOCIAL_ENABLED ? (
        <CommunityDiscoveryStrip
          ordinal={4}
          highlights={social.highlights}
          journeys={social.snapshots}
          onPlayHighlight={(item) => {
            if (!item?.track) return;
            markDiscoveryTrack(item.track, 'community_highlight');
            playTrack(item.track);
            recordTasteAndProgress({
              type: 'play',
              track: item.track,
              moodId: activeMood?.id || null,
            });
          }}
          onPlayJourney={(journey) => playJourney(journey)}
          onShareJourney={handleShareJourney}
        />
      ) : null}

      {EXPLORE_V2_ENABLED && EXPLORE_INFINITE_ENABLED ? (
        <section ref={infiniteSectionRef} className="scroll-mt-24">
          <ExploreFlowEntryCard
            mood={activeMood?.id || ''}
            genre={genreParam || tasteSeed?.genreId || ''}
            seed={lastSurprise?.title || visitSeed}
          />
        </section>
      ) : null}

      <section className="mb-14">
        <SectionHeader ordinal={5} eyebrow="Daily rotation" title="Your mixes" />
        {dailyMixes.length ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
            {dailyMixes.slice(0, 4).map((mix) => {
              const hasSeedTracks = Array.isArray(mix.seedTracks) && mix.seedTracks.length > 0;
              return (
                <button
                  key={mix.id}
                  type="button"
                  disabled={!hasSeedTracks}
                  onClick={() => handleDailyMixPlay(mix)}
                  className={cn(
                    'relative aspect-square rounded-sharp overflow-hidden border border-white/[0.08] hover:border-white/25 focus-ring text-left',
                    !hasSeedTracks && 'opacity-70 cursor-not-allowed hover:border-white/[0.08]',
                  )}
                >
                  <SmartImage
                    src={mix.thumbnail}
                    alt=""
                    kind="mix"
                    rounded="rounded-none"
                    className="absolute inset-0 w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-lg text-white">{mix.label}</p>
                    <p className="text-[12px] text-white/70">{mix.artist}</p>
                    {!hasSeedTracks ? (
                      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/65 mt-1">
                        Building mix...
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-sharp" />
            ))}
          </div>
        )}
      </section>

      <section ref={genresSectionRef} className="mb-14 scroll-mt-24">
        <SectionHeader ordinal={6} eyebrow="Atlas" title="Browse genres" />
        {genresLoading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[5/3] rounded-sharp" />
            ))}
          </div>
        ) : genresError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Genres unavailable"
            description="Could not load genres right now."
            action={<Button onClick={() => refetchGenres()}>Try again</Button>}
          />
        ) : genres.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Genres are still loading in"
            description="Try again in a moment for fresh genre lanes."
          />
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {genres.slice(0, 6).map((genre) => (
              <button
                key={genre.id}
                type="button"
                aria-disabled={recommendationsBootstrapping}
                onClick={() => handleGenreSelect(genre)}
                className={cn(
                  'relative aspect-[5/3] rounded-sharp overflow-hidden border border-white/[0.08] hover:border-white/25 p-3 text-left focus-ring',
                  recommendationsBootstrapping && 'opacity-70 cursor-wait',
                  genreParam === genre.id && 'border-track/70 ring-1 ring-track/40',
                )}
              >
                <SmartImage
                  src={genre.thumbnail}
                  alt=""
                  kind="genre"
                  rounded="rounded-none"
                  className="absolute inset-0 w-full h-full opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <p className="relative font-display text-xl text-white">{genre.label}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {EXPLORE_V2_ENABLED ? (
        <section className="mb-14">
          <SectionHeader ordinal={7} eyebrow="Rare finds" title="Hidden gems" />
          {hiddenGems.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hiddenGems.slice(0, 8).map((track) => (
                <div
                  key={track.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleHiddenGemPlay(track)}
                  onKeyDown={(event) =>
                    handleCardKeyboardActivation(event, () => handleHiddenGemPlay(track))}
                  className="group border border-white/[0.08] hover:border-white/25 rounded-sharp overflow-hidden text-left focus-ring cursor-pointer"
                >
                  <div className="relative aspect-[4/3]">
                    <SmartImage
                      src={track.thumbnail}
                      alt=""
                      kind="track"
                      rounded="rounded-none"
                      className="absolute inset-0 w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div
                      className="absolute top-2 right-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <AddToPlaylistButton
                          track={track}
                          className="p-1.5 bg-bg/55 hover:bg-bg/70"
                          buttonLabel={`Add ${track.title || 'track'} to playlist`}
                        />
                        <HeartButton track={track} size="sm" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-[14px] text-ink truncate">{track.title}</p>
                    <p className="text-[12px] text-ink-3 truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No gems yet"
              description="Keep exploring and this lane will light up."
            />
          )}
        </section>
      ) : null}

      {lastLiked ? (
        <section className="mb-12">
          <SectionHeader
            ordinal={8}
            eyebrow="Adjacent"
            title={`Because you liked ${lastLiked.title}`}
            action={becauseList.length ? (
              <button
                type="button"
                onClick={handleBecausePlaySet}
                className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-ink"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play set
              </button>
            ) : null}
          />
          {becauseList.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {becauseList.map((track) => (
                <div
                  key={track.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleBecauseTrackPlay(track)}
                  onKeyDown={(event) =>
                    handleCardKeyboardActivation(event, () => handleBecauseTrackPlay(track))}
                  className="group flex items-center gap-3 p-2.5 rounded-sharp border border-white/[0.08] bg-surface-2/45 focus-ring text-left min-w-0 cursor-pointer"
                >
                  <SmartImage
                    src={track.thumbnail}
                    alt=""
                    kind="track"
                    rounded="rounded-sharp"
                    className="w-12 h-12"
                  />
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink truncate">{track.title}</p>
                    <p className="text-[12px] text-ink-3 truncate">{track.artist}</p>
                  </div>
                  <div
                    className="touch-action-visible ml-auto opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <AddToPlaylistButton
                      track={track}
                      className="p-1.5"
                      buttonLabel={`Add ${track.title || 'track'} to playlist`}
                    />
                    <HeartButton track={track} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Building adjacent picks"
              description="Keep listening and this lane will populate shortly."
            />
          )}
        </section>
      ) : (
        <EmptyState
          icon={Heart}
          title="Like songs to unlock adjacent picks"
          description="Every save helps the app learn your taste profile."
        />
      )}

      <ExploreShareModal open={shareOpen} onOpenChange={setShareOpen} payload={sharePayload} />
      {EXPLORE_LOOPS_ENABLED ? (
        <LoopCompleteModal open={Boolean(loopWin)} win={loopWin} onClose={() => setLoopWin(null)} />
      ) : null}
    </div>
  );
};

export default ExplorePageV2;
