import { shareOrCopy } from '@/lib/shuffle';

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const safeTitle = (track) => (track?.title || 'Unknown track').trim();
const safeArtist = (track) => (track?.artist || 'Unknown artist').trim();

const makeAbsoluteUrl = (path, params = {}) => {
  if (typeof window === 'undefined') return path;
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

export const buildExploreDeepLink = ({
  journeyId = '',
  mode = '',
  mood = '',
  genre = '',
} = {}) =>
  makeAbsoluteUrl('/explore', {
    ...(journeyId ? { journey: journeyId } : {}),
    ...(mode ? { mode } : {}),
    ...(mood ? { mood } : {}),
    ...(genre ? { genre } : {}),
  });

export const buildFlowDeepLink = ({
  mode = 'flow',
  seed = '',
  mood = '',
  genre = '',
} = {}) =>
  makeAbsoluteUrl('/explore/flow', {
    mode,
    ...(seed ? { seed } : {}),
    ...(mood ? { mood } : {}),
    ...(genre ? { genre } : {}),
  });

export const buildSharedJourneyArtifact = ({
  journey = null,
  leadTrack = null,
  mood = '',
  genre = '',
} = {}) => {
  const baseTitle = journey?.title || 'Octavia discovery journey';
  const leadText = leadTrack ? `${safeTitle(leadTrack)} — ${safeArtist(leadTrack)}` : 'Fresh tracks waiting';
  return {
    title: `${baseTitle} · Octavia Explore`,
    text: `Try this journey: ${baseTitle}. Start with ${leadText}.`,
    url: buildExploreDeepLink({
      journeyId: journey?.id || '',
      mood,
      genre,
      mode: 'journey',
    }),
  };
};

export const shareJourneyArtifact = async (payload) => {
  const outcome = await shareOrCopy(payload);
  return outcome;
};

const asTrackCard = (track, rank) => ({
  id: `${track?.id || track?.videoId || `row-${rank}`}`,
  title: safeTitle(track),
  subtitle: safeArtist(track),
  thumbnail: track?.thumbnail || '',
  rank,
  track,
});

export const buildCommunityHighlights = ({
  pulse = null,
  trending = [],
  chartsFresh = [],
  chartsClassic = [],
} = {}) => {
  if (Array.isArray(pulse?.highlights) && pulse.highlights.length) {
    return pulse.highlights.slice(0, 8).map((item, index) => ({
      id: item.id || `pulse-${index}`,
      title: item.title || item.track?.title || 'Community pick',
      subtitle: item.subtitle || item.track?.artist || 'From listeners worldwide',
      thumbnail: item.thumbnail || item.track?.thumbnail || '',
      statLabel: item.statLabel || 'Momentum',
      statValue: item.statValue || null,
      track: item.track || null,
      rank: index + 1,
    }));
  }

  const rows = [...(trending || []), ...(chartsFresh || []), ...(chartsClassic || [])];
  const seen = new Set();
  const deduped = [];
  for (const track of rows) {
    const key = track?.id || track?.videoId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(track);
    if (deduped.length >= 8) break;
  }
  return deduped.map((track, index) => ({
    ...asTrackCard(track, index + 1),
    statLabel: index < 3 ? 'Now peaking' : 'Community save',
    statValue: index < 3 ? `${index + 1}` : null,
  }));
};

export const buildJourneySnapshots = ({
  journeys = [],
  completedJourneyIds = [],
  challenge = null,
} = {}) => {
  const completedSet = new Set((completedJourneyIds || []).map(normalize).filter(Boolean));
  return (journeys || []).map((journey) => {
    const done = completedSet.has(normalize(journey?.id));
    return {
      ...journey,
      completed: done,
      challengeReady: Boolean(challenge && !challenge.completed && challenge.metric === 'journeys'),
    };
  });
};

export default {
  buildExploreDeepLink,
  buildFlowDeepLink,
  buildSharedJourneyArtifact,
  shareJourneyArtifact,
  buildCommunityHighlights,
  buildJourneySnapshots,
};
