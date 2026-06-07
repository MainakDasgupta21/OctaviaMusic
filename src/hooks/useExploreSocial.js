import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExploreJourney, getExplorePulse } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import {
  buildCommunityHighlights,
  buildJourneySnapshots,
  buildSharedJourneyArtifact,
  shareJourneyArtifact,
} from '@/lib/explore-social';

export const useExploreSocial = ({
  trending = [],
  chartsFresh = [],
  chartsClassic = [],
  journeys = [],
  completedJourneyIds = [],
  challenge = null,
  activeJourneyId = '',
  enabled = true,
} = {}) => {
  const { data: pulsePayload = null, isLoading: pulseLoading } = useQuery({
    queryKey: queryKeys.explorePulse('global'),
    queryFn: ({ signal }) => getExplorePulse({ region: 'global', signal }),
    enabled,
    ...cachePolicy.explorePulse,
  });

  const { data: activeJourneyPayload = null } = useQuery({
    queryKey: queryKeys.exploreJourney(activeJourneyId),
    queryFn: ({ signal }) => getExploreJourney(activeJourneyId, { signal }),
    enabled: enabled && Boolean(activeJourneyId),
    ...cachePolicy.exploreJourney,
  });

  const highlights = useMemo(
    () =>
      buildCommunityHighlights({
        pulse: pulsePayload,
        trending,
        chartsFresh,
        chartsClassic,
      }),
    [pulsePayload, trending, chartsFresh, chartsClassic],
  );

  const snapshots = useMemo(
    () =>
      buildJourneySnapshots({
        journeys,
        completedJourneyIds,
        challenge,
      }),
    [journeys, completedJourneyIds, challenge],
  );

  const shareJourney = useCallback(
    async ({ journey, leadTrack, mood, genre }) => {
      const payload = buildSharedJourneyArtifact({
        journey,
        leadTrack,
        mood,
        genre,
      });
      return shareJourneyArtifact(payload);
    },
    [],
  );

  return {
    pulsePayload,
    pulseLoading,
    highlights,
    snapshots,
    activeJourneyPayload,
    shareJourney,
  };
};

export default useExploreSocial;
