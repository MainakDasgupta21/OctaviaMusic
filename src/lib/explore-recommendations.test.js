import { describe, expect, it } from 'vitest';
import {
  EXPLORE_MOODS,
  buildArtistAffinity,
  buildBecauseList,
  buildCandidatePool,
  buildDailyMixes,
  buildGenreQueue,
  buildHiddenGems,
  buildJourneyQueue,
  buildMoodQueue,
  diversifyTracks,
  isColdStartUser,
  mergeExploreTasteProfile,
  mergeExploreTasteSeed,
  pickSurpriseTrack,
  recordExploreFeedback,
  resolveExploreMoodId,
} from '@/lib/explore-recommendations';

const vid = (n) => `v${String(n).padStart(10, '0')}`;

const track = (n, title, artist, extra = {}) => ({
  id: vid(n),
  videoId: vid(n),
  title,
  artist,
  thumbnail: `/img/${n}.jpg`,
  ...extra,
});

describe('explore-recommendations', () => {
  it('detects cold-start correctly', () => {
    expect(isColdStartUser({ history: [], favorites: [] })).toBe(true);
    expect(isColdStartUser({ history: [track(1, 'A', 'B')], favorites: [] })).toBe(false);
    expect(isColdStartUser({ history: [], favorites: [track(2, 'C', 'D')] })).toBe(false);
  });

  it('dedupes candidate pool entries while preserving source metadata', () => {
    const shared = track(1, 'Neon Nights', 'Luma');
    const pool = buildCandidatePool({
      trending: [shared, track(2, 'Pulse', 'Aster')],
      chartsFresh: [{ ...shared, thumbnail: '/img/shared-fresh.jpg' }],
      chartsClassic: [track(3, 'Classic Echo', 'Orbit')],
      history: [],
      favorites: [],
    });

    expect(pool).toHaveLength(3);
    const merged = pool.find((row) => row.id === shared.id);
    expect(merged?._sources).toContain('trending');
    expect(merged?._sources).toContain('chartsFresh');
  });

  it('builds mood queues that blend fresh and classic selections', () => {
    const mood = EXPLORE_MOODS.find((entry) => entry.id === 'focus');
    const pool = buildCandidatePool({
      trending: [
        track(11, 'Focus Session', 'Helio'),
        track(12, 'Piano Rain', 'Aural'),
        track(13, 'Gym Burst', 'Rex'),
      ],
      chartsFresh: [
        track(21, 'Ambient Drift', 'North'),
        track(22, 'Study Lights', 'Nori'),
      ],
      chartsClassic: [
        track(31, 'Midnight Instrumental', 'Atlas'),
        track(32, 'Analog Calm', 'Vela'),
      ],
      history: [],
      favorites: [],
    });

    const queue = buildMoodQueue({
      mood,
      pool,
      history: [],
      favorites: [],
      followedArtists: [],
      count: 6,
    });

    expect(queue.length).toBeGreaterThanOrEqual(4);
    expect(queue.some((row) => row._sources.includes('trending'))).toBe(true);
    expect(queue.some((row) => row._sources.includes('chartsClassic'))).toBe(true);
    expect(
      queue.slice(0, 3).some((row) =>
        /focus|piano|ambient|instrumental|study/i.test(`${row.title} ${row.artist}`),
      ),
    ).toBe(true);
  });

  it('prioritizes artist affinity in because-you-liked recommendations', () => {
    const lastLiked = track(40, 'Golden Hour', 'Neon Fox', { genre: ['synthpop'] });
    const pool = buildCandidatePool({
      trending: [
        track(41, 'City Glow', 'Neon Fox', { genre: ['synthpop'] }),
        track(42, 'Bright Lines', 'Neon Fox', { genre: ['pop'] }),
        track(43, 'Dust Trail', 'Wilder', { genre: ['indie'] }),
      ],
      chartsFresh: [track(44, 'Skyline', 'Neon Fox', { genre: ['synthpop'] })],
      chartsClassic: [track(45, 'Silver Tape', 'Orbit', { genre: ['synthpop'] })],
      history: [],
      favorites: [lastLiked],
    });

    const because = buildBecauseList({
      lastLiked,
      pool,
      history: [],
      favorites: [lastLiked],
      followedArtists: [],
      max: 4,
    });

    expect(because).toHaveLength(4);
    expect(because[0].artist).toBe('Neon Fox');
    expect(because.find((row) => row.id === lastLiked.id)).toBeUndefined();
  });

  it('builds playable cold-start daily mixes from genres', () => {
    const genres = [
      {
        id: 'indie',
        label: 'Indie',
        thumbnail: '/img/genre-indie.jpg',
        sampleTrack: track(61, 'Indie Spark', 'Milo'),
      },
      {
        id: 'ambient',
        label: 'Ambient',
        thumbnail: '/img/genre-ambient.jpg',
        sampleTrack: track(62, 'Cloud Room', 'Nova'),
      },
    ];
    const pool = buildCandidatePool({
      trending: [track(63, 'Indie Breeze', 'Milo'), track(64, 'Quiet Space', 'Nova')],
      chartsFresh: [track(65, 'Glass Morning', 'Milo')],
      chartsClassic: [track(66, 'Archive Waves', 'Vera')],
      history: [],
      favorites: [],
    });

    const mixes = buildDailyMixes({
      history: [],
      favorites: [],
      followedArtists: [],
      genres,
      pool,
      tasteSeed: { genreId: 'indie', moodId: null, anchorArtist: null, ts: Date.now() },
      max: 2,
    });

    expect(mixes).toHaveLength(2);
    expect(mixes[0].source).toBe('genre');
    expect(mixes[0].seedTracks.length).toBeGreaterThan(0);
    expect(mixes[0].genreId).toBe('indie');
  });

  it('buildGenreQueue prioritizes sample track and respects taste profile penalties', () => {
    const genre = {
      id: 'indie',
      label: 'Indie',
      sampleTrack: track(70, 'Indie Spark', 'Milo'),
    };
    const pool = buildCandidatePool({
      trending: [track(71, 'Indie Hearts', 'Milo'), track(72, 'Club Energy', 'Rex')],
      chartsFresh: [track(73, 'Indie Night', 'Nova')],
      chartsClassic: [track(74, 'Archive Indie', 'Atlas')],
      history: [],
      favorites: [],
    });

    const queue = buildGenreQueue({
      genre,
      pool,
      tasteSeed: { genreId: 'indie', ts: Date.now() },
      tasteProfile: { skippedTrackIds: [vid(72)] },
      count: 5,
    });

    expect(queue.length).toBeGreaterThan(0);
    expect(queue[0].id).toBe(genre.sampleTrack.id);
    expect(queue.slice(0, 3).some((row) => row.id === vid(72))).toBe(false);
  });

  it('diversifyTracks caps duplicate artists before filling deferred tracks', () => {
    const rows = [
      track(80, 'One', 'Artist A'),
      track(81, 'Two', 'Artist A'),
      track(82, 'Three', 'Artist A'),
      track(83, 'Four', 'Artist B'),
      track(84, 'Five', 'Artist C'),
    ];

    const out = diversifyTracks(rows, { count: 4, maxPerArtist: 1 });
    const artistAInFront = out.slice(0, 3).filter((row) => row.artist === 'Artist A').length;
    expect(artistAInFront).toBe(1);
    expect(out).toHaveLength(4);
  });

  it('buildArtistAffinity weights favorites stronger than history', () => {
    const affinity = buildArtistAffinity({
      favorites: [track(90, 'A', 'Luma')],
      history: [track(91, 'B', 'Luma'), track(92, 'C', 'Nova')],
      followedArtists: [{ name: 'Nova' }],
    });
    expect(affinity.get('luma')).toBeGreaterThan(affinity.get('nova'));
  });

  it('pickSurpriseTrack avoids skipped ids and returns a playable row', () => {
    const pool = buildCandidatePool({
      trending: [track(100, 'Focus Pulse', 'Luma'), track(101, 'Skip Me', 'Orbit')],
      chartsFresh: [track(102, 'Night Drive', 'Nova')],
      chartsClassic: [track(103, 'Vintage Soul', 'Atlas')],
      history: [track(100, 'Focus Pulse', 'Luma')],
      favorites: [],
    });

    const picked = pickSurpriseTrack({
      pool,
      history: [track(100, 'Focus Pulse', 'Luma')],
      tasteProfile: { skippedTrackIds: [vid(101)], likedTrackIds: [vid(102)] },
      tasteSeed: { moodId: 'focus', anchorArtist: 'Nova', ts: Date.now() },
    });

    expect(picked).toBeTruthy();
    expect(picked?.id).not.toBe(vid(101));
  });

  it('buildHiddenGems prefers less-mainstream tracks over hot-feed duplicates', () => {
    const pool = buildCandidatePool({
      trending: [track(110, 'Top Feed', 'Mainstar')],
      chartsFresh: [track(111, 'Another Top Feed', 'Mainstar')],
      chartsClassic: [track(112, 'Deep Catalog', 'Quiet Hero')],
      history: [],
      favorites: [],
    });

    const gems = buildHiddenGems({
      pool,
      history: [],
      favorites: [],
      tasteProfile: {},
      count: 2,
    });
    expect(gems).toHaveLength(2);
    expect(gems[0].id).toBe(vid(112));
  });

  it('merges taste-seed updates without losing prior context', () => {
    const merged = mergeExploreTasteSeed(
      { moodId: 'focus', genreId: null, anchorArtist: 'Nori', ts: 1 },
      { genreId: 'indie' },
    );
    expect(merged?.moodId).toBe('focus');
    expect(merged?.genreId).toBe('indie');
    expect(merged?.anchorArtist).toBe('Nori');
  });

  it('merges taste profile and records feedback signals', () => {
    const merged = mergeExploreTasteProfile(
      { moodId: 'focus', feedback: { play: 2, save: 1, skip: 0 } },
      { energyId: 'calm', activityId: 'working' },
    );
    expect(merged?.moodId).toBe('focus');
    expect(merged?.energyId).toBe('calm');
    expect(merged?.activityId).toBe('working');

    const withFeedback = recordExploreFeedback(merged, {
      type: 'save',
      track: track(120, 'Signal Song', 'Mara'),
      moodId: 'focus',
    });
    expect(withFeedback?.feedback.save).toBeGreaterThan((merged?.feedback.save || 0));
    expect(withFeedback?.likedTrackIds).toContain(vid(120));
  });

  it('keeps journey queues compatible with social/progression metadata', () => {
    const pool = buildCandidatePool({
      trending: [track(130, 'Night Arc', 'Orion'), track(131, 'Wide Awake', 'Rhea')],
      chartsFresh: [track(132, 'Blue Streets', 'Orion')],
      chartsClassic: [track(133, 'Archive Glow', 'Vela')],
      history: [],
      favorites: [],
    });
    const queue = buildJourneyQueue({
      journey: {
        id: 'journey-night-drive',
        title: 'Night Drive',
        moodId: 'lounge',
        keywords: ['night', 'drive'],
        completed: true,
        challengeReady: true,
      },
      pool,
      count: 4,
    });
    expect(queue.length).toBeGreaterThan(0);
  });

  it('resolves explore mood from activity and energy fallbacks', () => {
    expect(resolveExploreMoodId({ activityId: 'working' })).toBe('focus');
    expect(resolveExploreMoodId({ energyId: 'high' })).toBe('workout');
    expect(resolveExploreMoodId({ moodId: 'evening' })).toBe('evening');
  });
});
