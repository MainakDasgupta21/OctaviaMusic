import {
  EXPLORE_ACTIVITIES,
  EXPLORE_ENERGY_LEVELS,
  EXPLORE_MOODS,
  buildOnboardingTastePatch,
} from '@/lib/explore-recommendations';

export const EXPLORE_ONBOARDING_KEY = 'octavia.explore.onboarding.v1';

export const EXPLORE_ONBOARDING_STEPS = [
  {
    id: 'moodId',
    title: 'How are you feeling today?',
    subtitle: 'Pick the room that feels most like you right now.',
    options: EXPLORE_MOODS.map((mood) => ({
      id: mood.id,
      label: mood.label,
      hint: mood.chipLabel || mood.label,
      gradient: mood.mix,
    })),
  },
  {
    id: 'energyId',
    title: 'What energy do you want?',
    subtitle: 'Choose the intensity and we tune everything around it.',
    options: EXPLORE_ENERGY_LEVELS.map((energy) => ({
      id: energy.id,
      label: energy.label,
      hint: energy.keywords[0] || '',
    })),
  },
  {
    id: 'activityId',
    title: 'What are you doing right now?',
    subtitle: 'We will shape your first cards for this exact moment.',
    options: EXPLORE_ACTIVITIES.map((activity) => ({
      id: activity.id,
      label: activity.label,
      hint: activity.keywords[0] || '',
    })),
  },
];

const sanitizeOnboardingState = (value) => {
  if (!value || typeof value !== 'object') return null;
  if (!value.completed) return null;
  return {
    completed: true,
    completedAt: Number.isFinite(value.completedAt) ? value.completedAt : Date.now(),
    answers: value.answers && typeof value.answers === 'object' ? value.answers : {},
  };
};

export const readExploreOnboardingState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EXPLORE_ONBOARDING_KEY);
    if (!raw) return null;
    return sanitizeOnboardingState(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const writeExploreOnboardingState = (state) => {
  if (typeof window === 'undefined') return;
  try {
    if (!state) {
      window.localStorage.removeItem(EXPLORE_ONBOARDING_KEY);
      return;
    }
    window.localStorage.setItem(EXPLORE_ONBOARDING_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
};

export const completeExploreOnboardingState = (answers = {}) => ({
  completed: true,
  completedAt: Date.now(),
  answers: {
    moodId: answers.moodId || null,
    energyId: answers.energyId || null,
    activityId: answers.activityId || null,
    ...buildOnboardingTastePatch(answers),
  },
});

export const shouldShowExploreOnboarding = ({ state, force = false } = {}) =>
  Boolean(force || !state?.completed);

export default {
  EXPLORE_ONBOARDING_KEY,
  EXPLORE_ONBOARDING_STEPS,
  readExploreOnboardingState,
  writeExploreOnboardingState,
  completeExploreOnboardingState,
  shouldShowExploreOnboarding,
};
