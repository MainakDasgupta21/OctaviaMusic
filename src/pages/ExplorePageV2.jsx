import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Heart, Play, Sparkles } from 'lucide-react';
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
  EXPLORE_INFINITE_ENABLED,
  EXPLORE_LOOPS_ENABLED,
  EXPLORE_SOCIAL_ENABLED,
  EXPLORE_V2_ENABLED,
} from '@/lib/feature-flags';
import { buildSharedJourneyArtifact } from '@/lib/explore-social';
import {
  addSurpriseSeenTrack,
  buildSurpriseSeed,
  filterUnseenSurpriseTracks,
  getSurpriseSeenSet,
  pickRandomItem,
  shuffleRandomItems,
} from '@/lib/surprise-random';
import { smoothScrollIntoView } from '@/lib/scroll';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';
import { fadeUp } from '@/design/motion';

const SURPRISE_FETCH_LIMIT = 60;
const SURPRISE_FETCH_ATTEMPTS = 3;
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
  const lastWinRef = useRef(null);
  const moodSectionRef = useRef(null);
  const genresSectionRef = useRef(null);
  const journeysSectionRef = useRef(null);
  const infiniteSectionRef = useRef(null);
  const handledMoodRef = useRef(null);
  const handledGenreRef = useRef(null);
  const handledJourneyRef = useRef(null);

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

  const {
    genres,
    genresLoading,
    genresError,
    refetchGenres,
    trending,
    chartsFresh,
    chartsClassic,
    candidatePool,
    isColdStart,
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
  });

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
      const queue = buildMoodQueue({
        mood,
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteSeed,
        tasteProfile,
        count: 12,
      });
      if (!queue.length) return false;
      playTracksInOrder(queue, { replaceQueue: true, forceSequential: false });
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
      playTracksInOrder,
      rememberTasteSeed,
      rememberTasteProfile,
      applyEvent,
    ],
  );

  const playGenre = useCallback(
    (genre, fromParam = false) => {
      const queue = buildGenreQueue({
        genre,
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteSeed,
        tasteProfile,
        count: 12,
      });
      if (!queue.length) return false;
      playTracksInOrder(queue, { replaceQueue: true, forceSequential: false });
      if (!fromParam) notify.info(`${genre.label} · discovery set`);
      return true;
    },
    [candidatePool, history, favorites, followedArtists, tasteSeed, tasteProfile, playTracksInOrder],
  );

  const playJourney = useCallback(
    (journey, { fromParam = false, payloadItems = null } = {}) => {
      if (!journey) return false;
      const queue = Array.isArray(payloadItems) && payloadItems.length
        ? payloadItems
        : buildJourneyQueue({
            journey,
            pool: candidatePool,
            history,
            favorites,
            followedArtists,
            tasteSeed,
            tasteProfile,
            count: 14,
          });
      if (!queue.length) return false;
      playTracksInOrder(queue, { replaceQueue: true, forceSequential: false });
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
      playTracksInOrder,
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

  const swipeDeckTracks = useMemo(
    () =>
      buildMoodQueue({
        mood: activeMood,
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteSeed,
        tasteProfile,
        count: 24,
      }),
    [activeMood, candidatePool, history, favorites, followedArtists, tasteSeed, tasteProfile],
  );

  useEffect(() => {
    if (!recentWins.length) return;
    const latest = recentWins[0];
    if (!latest || latest.id === lastWinRef.current) return;
    lastWinRef.current = latest.id;
    setLoopWin(latest);
  }, [recentWins]);

  useEffect(() => {
    if (moodParam) {
      smoothScrollIntoView(moodSectionRef.current);
      const mood = EXPLORE_MOODS.find((entry) => entry.id === moodParam);
      if (mood && candidatePool.length > 0 && handledMoodRef.current !== moodParam) {
        playMood(mood, true);
        handledMoodRef.current = moodParam;
      }
      return;
    }
    if (genreParam) {
      smoothScrollIntoView(genresSectionRef.current);
      const genre = genres.find((entry) => entry.id === genreParam);
      if (genre && candidatePool.length > 0 && handledGenreRef.current !== genreParam) {
        playGenre(genre, true);
        handledGenreRef.current = genreParam;
      }
    }
  }, [moodParam, genreParam, genres, candidatePool.length, playMood, playGenre]);

  useEffect(() => {
    if (!journeyParam || candidatePool.length === 0) return;
    if (handledJourneyRef.current === journeyParam) return;
    smoothScrollIntoView(journeysSectionRef.current);
    const journey =
      EXPLORE_CURATED_JOURNEYS.find((entry) => entry.id === journeyParam)
      || EXPLORE_CURATED_JOURNEYS[0];
    const payloadItems = social.activeJourneyPayload?.id === journeyParam
      ? social.activeJourneyPayload?.items
      : null;
    const played = playJourney(journey, { fromParam: true, payloadItems });
    if (played) handledJourneyRef.current = journeyParam;
  }, [journeyParam, candidatePool.length, playJourney, social.activeJourneyPayload]);

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

  const handleSurprise = useCallback(async () => {
    if (surpriseLoading) return;
    setSurpriseLoading(true);
    let moodForFeedback = activeMood?.id || null;
    try {
      let pick = null;

      for (let attempt = 0; attempt < SURPRISE_FETCH_ATTEMPTS; attempt += 1) {
        const randomMood = pickRandomItem(EXPLORE_MOODS);
        const randomGenre = pickRandomItem(genres);
        const mood = randomMood?.id || activeMood?.id || '';
        const genre = randomGenre?.label || genreParam || '';
        moodForFeedback = mood || activeMood?.id || null;

        try {
          const radio = await getExploreRadio({
            mood,
            genre,
            seed: buildSurpriseSeed(),
            diversity: 'high',
            limit: SURPRISE_FETCH_LIMIT,
          });
          const fetchedItems = Array.isArray(radio?.items) ? radio.items : [];
          const unseenFromFetch = filterUnseenSurpriseTracks(
            shuffleRandomItems(fetchedItems),
            { seenSet: getSurpriseSeenSet() },
          );
          pick = pickRandomItem(unseenFromFetch);
          if (pick) break;
        } catch {
          /* keep trying with a fresh seed */
        }
      }

      if (!pick) {
        const unseenLocalPool = filterUnseenSurpriseTracks(candidatePool, {
          seenSet: getSurpriseSeenSet(),
        });
        if (unseenLocalPool.length > 0) {
          pick =
            pickSurpriseTrack({
              pool: shuffleRandomItems(unseenLocalPool),
              history,
              favorites,
              followedArtists,
              tasteSeed,
              tasteProfile,
              mood: activeMood,
            })
            || pickRandomItem(unseenLocalPool);
        }
      }

      if (!pick) {
        notify.info('No new surprise songs left this session. Try again later.');
        return;
      }

      addSurpriseSeenTrack(pick);
      setLastSurprise(pick);
      playTrack(pick);
      recordTasteAndProgress(
        { type: 'play', track: pick, moodId: moodForFeedback },
        { type: 'surprise_play', moodId: moodForFeedback },
      );
    } finally {
      setSurpriseLoading(false);
    }
  }, [
    surpriseLoading,
    activeMood,
    genres,
    genreParam,
    candidatePool,
    history,
    favorites,
    followedArtists,
    tasteSeed,
    tasteProfile,
    playTrack,
    recordTasteAndProgress,
  ]);

  return (
    <div className="page-shell-content-wide pt-5 md:pt-8 pb-12">
      {EXPLORE_V2_ENABLED && isColdStart ? (
        <ExploreOnboarding
          open={onboardingOpen}
          onSkip={dismissOnboarding}
          onComplete={(answers) => {
            const patch = completeOnboarding(answers);
            if (patch?.moodId) {
              updateParams({ mood: patch.moodId, onboarding: null });
              const mood = EXPLORE_MOODS.find((entry) => entry.id === patch.moodId);
              if (mood) playMood(mood);
            }
          }}
        />
      ) : null}

      <div className="hidden md:flex justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4 mb-7 border-b border-white/[0.08] pb-3">
        <span>{masthead}</span>
        <span>The Octavia Daily · Explore</span>
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
          isLoading={surpriseLoading || (recommendationLoading && !candidatePool.length)}
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
          onMoodSelect={(mood) => {
            updateParams({ mood: mood.id, genre: null, onboarding: null });
            playMood(mood);
          }}
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
            moodLabel={activeMood?.label || 'your vibe'}
            onTrackEnter={(track) => {
              playTrack(track);
              recordTasteAndProgress({
                type: 'play',
                track,
                moodId: activeMood?.id || null,
              });
            }}
            onSave={(track) => {
              if (!isFavorite(track.id)) toggleFavorite(track);
              recordTasteAndProgress({
                type: 'save',
                track,
                moodId: activeMood?.id || null,
              });
            }}
            onSkip={(track) =>
              recordTasteAndProgress({
                type: 'skip',
                track,
                moodId: activeMood?.id || null,
              })}
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
          <CuratedJourneys journeys={EXPLORE_CURATED_JOURNEYS} onPlayJourney={(journey) => playJourney(journey)} />
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
          highlights={social.highlights}
          journeys={social.snapshots}
          onPlayHighlight={(item) => {
            if (!item?.track) return;
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
        <section ref={infiniteSectionRef}>
          <ExploreFlowEntryCard
            mood={activeMood?.id || ''}
            genre={genreParam || tasteSeed?.genreId || ''}
            seed={lastSurprise?.title || ''}
          />
        </section>
      ) : null}

      <section className="mb-14">
        <SectionHeader ordinal={3} eyebrow="Daily rotation" title="Your mixes" />
        {dailyMixes.length ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
            {dailyMixes.slice(0, 4).map((mix) => (
              <button
                key={mix.id}
                type="button"
                onClick={() =>
                  playTracksInOrder(mix.seedTracks || [], {
                    replaceQueue: true,
                    forceSequential: false,
                  })}
                className="relative aspect-square rounded-sharp overflow-hidden border border-white/[0.08] hover:border-white/25 focus-ring text-left"
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
                </div>
              </button>
            ))}
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
        <SectionHeader ordinal={4} eyebrow="Atlas" title="Browse genres" />
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
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {genres.slice(0, 6).map((genre) => (
              <button
                key={genre.id}
                type="button"
                onClick={() => {
                  handledGenreRef.current = genre.id;
                  updateParams({ genre: genre.id, mood: null });
                  playGenre(genre);
                }}
                className={cn(
                  'relative aspect-[5/3] rounded-sharp overflow-hidden border border-white/[0.08] hover:border-white/25 p-3 text-left focus-ring',
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
          <SectionHeader ordinal={5} eyebrow="Rare finds" title="Hidden gems" />
          {hiddenGems.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hiddenGems.slice(0, 8).map((track) => (
                <div
                  key={track.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => playTrack(track)}
                  onKeyDown={(event) => handleCardKeyboardActivation(event, () => playTrack(track))}
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
                    <div className="absolute top-2 right-2">
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

      {lastLiked && becauseList.length ? (
        <section className="mb-12">
          <SectionHeader
            ordinal={6}
            eyebrow="Adjacent"
            title={`Because you liked ${lastLiked.title}`}
            action={(
              <button
                type="button"
                onClick={() => {
                  playTracksInOrder(becauseList, {
                    replaceQueue: true,
                    startIndex: 0,
                    forceSequential: false,
                  });
                }}
                className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-ink-3 hover:text-ink"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play set
              </button>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {becauseList.map((track) => (
              <div
                key={track.id}
                role="button"
                tabIndex={0}
                onClick={() => playTrack(track)}
                onKeyDown={(event) => handleCardKeyboardActivation(event, () => playTrack(track))}
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
