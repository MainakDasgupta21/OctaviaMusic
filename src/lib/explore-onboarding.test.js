import { describe, expect, it, beforeEach } from 'vitest';
import {
  EXPLORE_ONBOARDING_KEY,
  completeExploreOnboardingState,
  readExploreOnboardingState,
  shouldShowExploreOnboarding,
  writeExploreOnboardingState,
} from '@/lib/explore-onboarding';

describe('explore-onboarding', () => {
  beforeEach(() => {
    window.localStorage.removeItem(EXPLORE_ONBOARDING_KEY);
  });

  it('builds a completed onboarding payload', () => {
    const payload = completeExploreOnboardingState({
      moodId: 'focus',
      energyId: 'calm',
      activityId: 'working',
    });
    expect(payload.completed).toBe(true);
    expect(payload.answers.moodId).toBe('focus');
    expect(payload.answers.energyId).toBe('calm');
    expect(payload.answers.activityId).toBe('working');
  });

  it('reads and writes onboarding state through localStorage', () => {
    const payload = completeExploreOnboardingState({
      moodId: 'workout',
      energyId: 'high',
      activityId: 'partying',
    });
    writeExploreOnboardingState(payload);
    const restored = readExploreOnboardingState();
    expect(restored?.completed).toBe(true);
    expect(restored?.answers?.moodId).toBe('workout');
  });

  it('shows onboarding until completion unless force mode is disabled', () => {
    expect(shouldShowExploreOnboarding({ state: null })).toBe(true);
    expect(shouldShowExploreOnboarding({ state: { completed: true } })).toBe(false);
    expect(shouldShowExploreOnboarding({ state: { completed: true }, force: true })).toBe(true);
  });
});
