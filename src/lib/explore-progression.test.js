import { describe, expect, it } from 'vitest';
import {
  ensureDailyChallenge,
  recordExploreProgressEvent,
  sanitizeExploreProgression,
} from '@/lib/explore-progression';

describe('explore-progression', () => {
  it('creates a valid default progression shape', () => {
    const state = sanitizeExploreProgression(null);
    expect(state.streakDays).toBe(0);
    expect(state.dailyChallenge).toBeTruthy();
    expect(state.dailyStats).toBeTruthy();
    expect(Array.isArray(state.badges)).toBe(true);
  });

  it('rolls over challenge and daily stats when day changes', () => {
    const day1 = new Date('2026-06-07T08:00:00.000Z');
    const day2 = new Date('2026-06-08T08:00:00.000Z');
    const seeded = ensureDailyChallenge(null, day1);
    const updated = ensureDailyChallenge(seeded, day2);

    expect(updated.dailyChallenge.dateKey).not.toBe(seeded.dailyChallenge.dateKey);
    expect(updated.dailyStats.dateKey).toBe(updated.dailyChallenge.dateKey);
    expect(updated.dailyStats.plays).toBe(0);
  });

  it('increments streak, xp, and marks challenge completion rewards', () => {
    const base = ensureDailyChallenge(null, new Date('2026-06-07T08:00:00.000Z'));
    const challenge = {
      ...base.dailyChallenge,
      metric: 'journeys',
      target: 1,
      progress: 0,
      completed: false,
      rewardXp: 40,
      badge: 'journey-jump',
    };
    const seeded = {
      ...base,
      dailyChallenge: challenge,
    };

    const next = recordExploreProgressEvent(
      seeded,
      { type: 'journey_start', journeyId: 'journey-night-drive', moodId: 'lounge' },
      new Date('2026-06-07T09:00:00.000Z'),
    );

    expect(next.streakDays).toBe(1);
    expect(next.dailyChallenge.completed).toBe(true);
    expect(next.xp).toBeGreaterThan(40);
    expect(next.badges).toContain('journey-jump');
    expect(next.recentWins[0]?.id).toBe(challenge.id);
  });
});
