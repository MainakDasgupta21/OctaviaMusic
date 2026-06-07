import { useCallback, useMemo, useState } from 'react';
import {
  buildOnboardingTastePatch,
  mergeExploreTasteProfile,
  mergeExploreTasteSeed,
  readExploreTasteProfile,
  readExploreTasteSeed,
  recordExploreFeedback,
  writeExploreTasteProfile,
  writeExploreTasteSeed,
} from '@/lib/explore-recommendations';
import {
  completeExploreOnboardingState,
  readExploreOnboardingState,
  shouldShowExploreOnboarding,
  writeExploreOnboardingState,
} from '@/lib/explore-onboarding';

export const useExploreTaste = ({ forceOnboarding = false } = {}) => {
  const [tasteSeed, setTasteSeed] = useState(() => readExploreTasteSeed());
  const [tasteProfile, setTasteProfile] = useState(() => readExploreTasteProfile());
  const [onboardingState, setOnboardingState] = useState(() => readExploreOnboardingState());
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const rememberTasteSeed = useCallback((patch) => {
    setTasteSeed((previous) => {
      const next = mergeExploreTasteSeed(previous, patch);
      writeExploreTasteSeed(next);
      return next;
    });
  }, []);

  const rememberTasteProfile = useCallback((patch) => {
    setTasteProfile((previous) => {
      const next = mergeExploreTasteProfile(previous, patch);
      writeExploreTasteProfile(next);
      return next;
    });
  }, []);

  const recordFeedback = useCallback((event) => {
    setTasteProfile((previous) => {
      const next = recordExploreFeedback(previous, event);
      writeExploreTasteProfile(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback((answers) => {
    const onboarding = completeExploreOnboardingState(answers);
    const tastePatch = buildOnboardingTastePatch(answers);
    writeExploreOnboardingState(onboarding);
    setOnboardingState(onboarding);
    setOnboardingDismissed(false);

    setTasteProfile((previous) => {
      const merged = mergeExploreTasteProfile(previous, {
        ...tastePatch,
        onboardingComplete: true,
      });
      writeExploreTasteProfile(merged);
      return merged;
    });
    setTasteSeed((previous) => {
      const merged = mergeExploreTasteSeed(previous, {
        moodId: tastePatch.moodId,
        genreId: null,
        anchorArtist: null,
      });
      writeExploreTasteSeed(merged);
      return merged;
    });
    return tastePatch;
  }, []);

  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
  }, []);

  const reopenOnboarding = useCallback(() => {
    setOnboardingDismissed(false);
  }, []);

  const onboardingOpen = useMemo(
    () =>
      !onboardingDismissed
      && shouldShowExploreOnboarding({ state: onboardingState, force: forceOnboarding }),
    [onboardingDismissed, onboardingState, forceOnboarding],
  );

  return {
    tasteSeed,
    tasteProfile,
    onboardingState,
    onboardingOpen,
    rememberTasteSeed,
    rememberTasteProfile,
    recordFeedback,
    completeOnboarding,
    dismissOnboarding,
    reopenOnboarding,
  };
};

export default useExploreTaste;
