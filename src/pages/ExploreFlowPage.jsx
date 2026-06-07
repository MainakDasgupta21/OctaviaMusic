import { useCallback } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Button from '@/components/ui-v2/Button';
import ExploreFlowShell from '@/components/explore/ExploreFlowShell';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useFollowedArtists } from '@/contexts/FollowedArtistsContext';
import useExploreData from '@/hooks/useExploreData';
import useExploreTaste from '@/hooks/useExploreTaste';
import useExploreProgress from '@/hooks/useExploreProgress';
import useInfiniteDiscovery from '@/hooks/useInfiniteDiscovery';
import { EXPLORE_INFINITE_ENABLED } from '@/lib/feature-flags';

const ExploreFlowPage = () => {
  if (!EXPLORE_INFINITE_ENABLED) {
    return <Navigate to="/explore" replace />;
  }

  const [searchParams] = useSearchParams();
  const { history, playTrack } = usePlayer();
  const { list: favorites, toggleFavorite, isFavorite } = useFavorites();
  const { list: followedArtists } = useFollowedArtists();
  const { tasteSeed, tasteProfile, recordFeedback } = useExploreTaste();
  const { applyEvent } = useExploreProgress();

  const mood = searchParams.get('mood') || tasteSeed?.moodId || tasteProfile?.moodId || '';
  const genre = searchParams.get('genre') || tasteSeed?.genreId || '';
  const seed = searchParams.get('seed') || '';

  const { candidatePool } = useExploreData({
    history,
    favorites,
    followedArtists,
    tasteSeed,
    tasteProfile,
  });

  const flow = useInfiniteDiscovery({
    localPool: candidatePool,
    mood,
    genre,
    seed,
    enabled: EXPLORE_INFINITE_ENABLED,
  });

  const handlePlay = useCallback(() => {
    const track = flow.currentTrack;
    if (!track) return;
    playTrack(track);
    flow.markPlayed();
    recordFeedback({ type: 'play', track, moodId: mood || null, genreId: genre || null });
    applyEvent({ type: 'play', moodId: mood || null });
  }, [flow, playTrack, recordFeedback, applyEvent, mood, genre]);

  const handleSave = useCallback(() => {
    const track = flow.currentTrack;
    if (!track) return;
    if (!isFavorite(track.id)) toggleFavorite(track);
    recordFeedback({ type: 'save', track, moodId: mood || null, genreId: genre || null });
    applyEvent({ type: 'save', moodId: mood || null });
    flow.saveTop();
  }, [flow, isFavorite, toggleFavorite, recordFeedback, applyEvent, mood, genre]);

  const handleSkip = useCallback(() => {
    const track = flow.currentTrack;
    if (!track) return;
    recordFeedback({ type: 'skip', track, moodId: mood || null, genreId: genre || null });
    applyEvent({ type: 'skip', moodId: mood || null });
    flow.skipTop();
  }, [flow, recordFeedback, applyEvent, mood, genre]);

  return (
    <>
      <div className="px-5 md:px-10 pt-5 md:pt-8 max-w-[1300px] mx-auto">
        <Button asChild type="button" variant="glass" size="sm">
          <Link to="/explore">Back to Explore</Link>
        </Button>
      </div>
      <ExploreFlowShell
        mood={mood}
        genre={genre}
        stats={flow.stats}
        deck={flow.deck}
        isLoading={flow.isLoading}
        onPlay={handlePlay}
        onSave={handleSave}
        onSkip={handleSkip}
        onLoadMore={flow.loadMore}
      />
    </>
  );
};

export default ExploreFlowPage;
