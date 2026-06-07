import { useCallback, useMemo, useState } from 'react';
import {
  ensureDailyChallenge,
  readExploreProgression,
  recordExploreProgressEvent,
  writeExploreProgression,
} from '@/lib/explore-progression';

const XP_PER_LEVEL = 120;

const calculateLevel = (xp = 0) => Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);

export const useExploreProgress = () => {
  const [progression, setProgression] = useState(() => {
    const baseline = readExploreProgression();
    const ensured = ensureDailyChallenge(baseline);
    writeExploreProgression(ensured);
    return ensured;
  });

  const applyEvent = useCallback((event) => {
    setProgression((previous) => {
      const ensured = ensureDailyChallenge(previous);
      const next = recordExploreProgressEvent(ensured, event);
      writeExploreProgression(next);
      return next;
    });
  }, []);

  const refreshDailyChallenge = useCallback(() => {
    setProgression((previous) => {
      const next = ensureDailyChallenge(previous);
      writeExploreProgression(next);
      return next;
    });
  }, []);

  const metrics = useMemo(() => {
    const xp = progression?.xp || 0;
    const level = calculateLevel(xp);
    const prevLevelFloor = (level - 1) * XP_PER_LEVEL;
    const nextLevelFloor = level * XP_PER_LEVEL;
    const progressToNext = Math.max(
      0,
      Math.min(1, (xp - prevLevelFloor) / (nextLevelFloor - prevLevelFloor)),
    );
    return {
      level,
      xp,
      progressToNext,
      xpIntoLevel: Math.max(0, xp - prevLevelFloor),
      xpToNextLevel: Math.max(0, nextLevelFloor - xp),
    };
  }, [progression?.xp]);

  return {
    progression,
    challenge: progression?.dailyChallenge || null,
    dailyStats: progression?.dailyStats || null,
    streakDays: progression?.streakDays || 0,
    badges: progression?.badges || [],
    recentWins: progression?.recentWins || [],
    completedJourneys: progression?.completedJourneys || [],
    ...metrics,
    applyEvent,
    refreshDailyChallenge,
  };
};

export default useExploreProgress;
