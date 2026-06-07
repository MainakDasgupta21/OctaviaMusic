import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useExploreProgress from '@/hooks/useExploreProgress';
import { EXPLORE_PROGRESSION_KEY } from '@/lib/explore-progression';

describe('useExploreProgress', () => {
  beforeEach(() => {
    window.localStorage.removeItem(EXPLORE_PROGRESSION_KEY);
  });

  it('initializes with a daily challenge', () => {
    const { result } = renderHook(() => useExploreProgress());
    expect(result.current.challenge).toBeTruthy();
    expect(result.current.level).toBeGreaterThanOrEqual(1);
  });

  it('applies events and persists xp progression', () => {
    const { result } = renderHook(() => useExploreProgress());
    const baselineXp = result.current.xp;

    act(() => {
      result.current.applyEvent({ type: 'save', moodId: 'focus' });
    });

    expect(result.current.xp).toBeGreaterThan(baselineXp);
    expect(result.current.streakDays).toBeGreaterThanOrEqual(1);

    const stored = JSON.parse(window.localStorage.getItem(EXPLORE_PROGRESSION_KEY) || '{}');
    expect(stored.xp).toBe(result.current.xp);
  });
});
