import { describe, expect, it } from 'vitest';
import {
  buildCommunityHighlights,
  buildExploreDeepLink,
  buildJourneySnapshots,
  buildSharedJourneyArtifact,
} from '@/lib/explore-social';

describe('explore-social', () => {
  it('builds additive explore deep-links', () => {
    const url = buildExploreDeepLink({
      journeyId: 'journey-night-drive',
      mode: 'journey',
      mood: 'lounge',
      genre: 'electronic',
    });
    expect(url).toContain('/explore');
    expect(url).toContain('journey=journey-night-drive');
    expect(url).toContain('mode=journey');
  });

  it('prefers pulse highlights when available', () => {
    const highlights = buildCommunityHighlights({
      pulse: {
        highlights: [{ id: 'p1', title: 'Pulse pick', subtitle: 'World', track: { id: 'x1' } }],
      },
      trending: [{ id: 't1', title: 'Trending', artist: 'A' }],
    });
    expect(highlights).toHaveLength(1);
    expect(highlights[0].id).toBe('p1');
  });

  it('marks journey completion in snapshots', () => {
    const snapshots = buildJourneySnapshots({
      journeys: [{ id: 'journey-night-drive', title: 'Night Drive' }],
      completedJourneyIds: ['journey-night-drive'],
      challenge: { metric: 'journeys', completed: false },
    });
    expect(snapshots[0].completed).toBe(true);
    expect(snapshots[0].challengeReady).toBe(true);
  });

  it('builds share artifact with journey context', () => {
    const payload = buildSharedJourneyArtifact({
      journey: { id: 'journey-night-drive', title: 'Midnight Drive' },
      leadTrack: { title: 'Neon Sky', artist: 'Pulse' },
      mood: 'lounge',
    });
    expect(payload.title).toContain('Midnight Drive');
    expect(payload.url).toContain('journey=journey-night-drive');
  });
});
