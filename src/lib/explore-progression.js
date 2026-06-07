export const EXPLORE_PROGRESSION_KEY = 'octavia.explore.progression.v1';

const MAX_RECENT_WINS = 12;
const MAX_BADGES = 32;
const MAX_COMPLETED_JOURNEYS = 80;

export const DAILY_CHALLENGE_TEMPLATES = [
  {
    key: 'mood-hopper',
    title: 'Mood Hopper',
    description: 'Play tracks from 2 different moods today.',
    metric: 'unique_moods',
    target: 2,
    rewardXp: 50,
    badge: 'mood-hopper',
  },
  {
    key: 'save-streak',
    title: 'Taste Collector',
    description: 'Save 3 tracks in Play and Decide.',
    metric: 'saves',
    target: 3,
    rewardXp: 60,
    badge: 'taste-collector',
  },
  {
    key: 'surprise-run',
    title: 'Serendipity Run',
    description: 'Hit Surprise Me 2 times today.',
    metric: 'surprises',
    target: 2,
    rewardXp: 45,
    badge: 'serendipity-run',
  },
  {
    key: 'journey-jump',
    title: 'Journey Jump',
    description: 'Start 1 discovery journey today.',
    metric: 'journeys',
    target: 1,
    rewardXp: 55,
    badge: 'journey-jump',
  },
];

const EVENT_XP = {
  play: 6,
  mood_play: 8,
  save: 14,
  skip: 4,
  surprise_play: 12,
  journey_start: 10,
  journey_complete: 18,
};

const normalizeString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeList = (value, max = 100) => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(normalizeString).filter(Boolean))).slice(0, max);
};

const dateToken = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
};

const dayDiff = (leftDateKey, rightDateKey) => {
  const left = new Date(`${leftDateKey}T00:00:00.000Z`);
  const right = new Date(`${rightDateKey}T00:00:00.000Z`);
  const ms = left.getTime() - right.getTime();
  return Math.round(ms / 86_400_000);
};

const stableHash = (value) => {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const defaultDailyStats = (dateKey) => ({
  dateKey,
  moodIds: [],
  saves: 0,
  skips: 0,
  surprises: 0,
  journeys: 0,
  plays: 0,
});

const createDailyChallenge = (dateKey) => {
  const template =
    DAILY_CHALLENGE_TEMPLATES[stableHash(dateKey) % DAILY_CHALLENGE_TEMPLATES.length];
  return {
    id: `${template.key}:${dateKey}`,
    dateKey,
    key: template.key,
    title: template.title,
    description: template.description,
    metric: template.metric,
    target: template.target,
    progress: 0,
    completed: false,
    rewardXp: template.rewardXp,
    badge: template.badge,
  };
};

const defaultProgression = () => ({
  lastActiveDate: null,
  streakDays: 0,
  xp: 0,
  badges: [],
  completedJourneys: [],
  dailyStats: defaultDailyStats(dateToken()),
  dailyChallenge: createDailyChallenge(dateToken()),
  recentWins: [],
  updatedAt: Date.now(),
});

const sanitizeDailyStats = (value, fallbackDate) => {
  const source = value && typeof value === 'object' ? value : {};
  const dateKey = normalizeString(source.dateKey) || fallbackDate;
  return {
    dateKey,
    moodIds: normalizeList(source.moodIds, 12),
    saves: Number.isFinite(source.saves) ? Math.max(0, Math.round(source.saves)) : 0,
    skips: Number.isFinite(source.skips) ? Math.max(0, Math.round(source.skips)) : 0,
    surprises: Number.isFinite(source.surprises) ? Math.max(0, Math.round(source.surprises)) : 0,
    journeys: Number.isFinite(source.journeys) ? Math.max(0, Math.round(source.journeys)) : 0,
    plays: Number.isFinite(source.plays) ? Math.max(0, Math.round(source.plays)) : 0,
  };
};

const sanitizeDailyChallenge = (value, fallbackDate) => {
  if (!value || typeof value !== 'object') return createDailyChallenge(fallbackDate);
  const metric = normalizeString(value.metric);
  const template = DAILY_CHALLENGE_TEMPLATES.find((item) => item.metric === metric);
  if (!template) return createDailyChallenge(fallbackDate);
  const dateKey = normalizeString(value.dateKey) || fallbackDate;
  const target = Number.isFinite(value.target)
    ? Math.max(1, Math.round(value.target))
    : template.target;
  const progress = Number.isFinite(value.progress)
    ? Math.max(0, Math.round(value.progress))
    : 0;
  const completed = Boolean(value.completed) || progress >= target;
  return {
    id: normalizeString(value.id) || `${template.key}:${dateKey}`,
    dateKey,
    key: template.key,
    title: normalizeString(value.title) || template.title,
    description: normalizeString(value.description) || template.description,
    metric: template.metric,
    target,
    progress: Math.min(target, progress),
    completed,
    rewardXp: Number.isFinite(value.rewardXp)
      ? Math.max(0, Math.round(value.rewardXp))
      : template.rewardXp,
    badge: normalizeString(value.badge) || template.badge,
  };
};

const sanitizeRecentWins = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const id = normalizeString(entry.id);
      const title = normalizeString(entry.title);
      if (!id || !title) return null;
      return {
        id,
        title,
        rewardXp: Number.isFinite(entry.rewardXp) ? Math.max(0, Math.round(entry.rewardXp)) : 0,
        ts: Number.isFinite(entry.ts) ? entry.ts : Date.now(),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_RECENT_WINS);
};

export const sanitizeExploreProgression = (value) => {
  const fallbackDate = dateToken();
  if (!value || typeof value !== 'object') return defaultProgression();
  return {
    lastActiveDate: normalizeString(value.lastActiveDate),
    streakDays: Number.isFinite(value.streakDays)
      ? Math.max(0, Math.round(value.streakDays))
      : 0,
    xp: Number.isFinite(value.xp) ? Math.max(0, Math.round(value.xp)) : 0,
    badges: normalizeList(value.badges, MAX_BADGES),
    completedJourneys: normalizeList(value.completedJourneys, MAX_COMPLETED_JOURNEYS),
    dailyStats: sanitizeDailyStats(value.dailyStats, fallbackDate),
    dailyChallenge: sanitizeDailyChallenge(value.dailyChallenge, fallbackDate),
    recentWins: sanitizeRecentWins(value.recentWins),
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
  };
};

export const readExploreProgression = () => {
  if (typeof window === 'undefined') return defaultProgression();
  try {
    const raw = window.localStorage.getItem(EXPLORE_PROGRESSION_KEY);
    if (!raw) return defaultProgression();
    return sanitizeExploreProgression(JSON.parse(raw));
  } catch {
    return defaultProgression();
  }
};

export const writeExploreProgression = (value) => {
  if (typeof window === 'undefined') return;
  try {
    if (!value) {
      window.localStorage.removeItem(EXPLORE_PROGRESSION_KEY);
      return;
    }
    window.localStorage.setItem(EXPLORE_PROGRESSION_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

export const mergeExploreProgression = (previous, patch = {}) => {
  const base = sanitizeExploreProgression(previous);
  const merged = sanitizeExploreProgression({
    ...base,
    ...patch,
    badges: patch.badges === undefined ? base.badges : patch.badges,
    completedJourneys:
      patch.completedJourneys === undefined ? base.completedJourneys : patch.completedJourneys,
    dailyStats: patch.dailyStats === undefined ? base.dailyStats : patch.dailyStats,
    dailyChallenge: patch.dailyChallenge === undefined ? base.dailyChallenge : patch.dailyChallenge,
    recentWins: patch.recentWins === undefined ? base.recentWins : patch.recentWins,
    updatedAt: Date.now(),
  });
  return merged;
};

export const ensureDailyChallenge = (previous, now = new Date()) => {
  const base = sanitizeExploreProgression(previous);
  const currentDate = dateToken(now);
  const challengeDate = base.dailyChallenge?.dateKey;
  if (challengeDate === currentDate && base.dailyStats?.dateKey === currentDate) {
    return base;
  }
  return mergeExploreProgression(base, {
    dailyStats: defaultDailyStats(currentDate),
    dailyChallenge: createDailyChallenge(currentDate),
  });
};

const challengeProgressFor = (challenge, dailyStats) => {
  if (!challenge || !dailyStats) return 0;
  switch (challenge.metric) {
    case 'unique_moods':
      return dailyStats.moodIds.length;
    case 'saves':
      return dailyStats.saves;
    case 'surprises':
      return dailyStats.surprises;
    case 'journeys':
      return dailyStats.journeys;
    case 'plays':
    default:
      return dailyStats.plays;
  }
};

const withUpdatedStreak = (state, currentDate) => {
  const last = state.lastActiveDate;
  if (!last) {
    return { ...state, lastActiveDate: currentDate, streakDays: 1 };
  }
  if (last === currentDate) return state;
  const diff = dayDiff(currentDate, last);
  if (diff === 1) {
    return {
      ...state,
      lastActiveDate: currentDate,
      streakDays: Math.max(1, state.streakDays + 1),
    };
  }
  return {
    ...state,
    lastActiveDate: currentDate,
    streakDays: 1,
  };
};

const applyEventToDailyStats = (dailyStats, event) => {
  const next = {
    ...dailyStats,
    plays: dailyStats.plays + 1,
  };
  if (event?.moodId) {
    next.moodIds = normalizeList([...next.moodIds, event.moodId], 12);
  }
  if (event?.type === 'save') {
    next.saves += 1;
  } else if (event?.type === 'skip') {
    next.skips += 1;
  } else if (event?.type === 'surprise_play') {
    next.surprises += 1;
  } else if (event?.type === 'journey_start' || event?.type === 'journey_complete') {
    next.journeys += 1;
  }
  return next;
};

const pushWin = (state, challenge) => {
  const nextWin = {
    id: challenge.id,
    title: challenge.title,
    rewardXp: challenge.rewardXp,
    ts: Date.now(),
  };
  const recentWins = [nextWin, ...(state.recentWins || [])].slice(0, MAX_RECENT_WINS);
  const badges = challenge.badge
    ? normalizeList([...(state.badges || []), challenge.badge], MAX_BADGES)
    : state.badges;
  return {
    ...state,
    recentWins,
    badges,
  };
};

export const recordExploreProgressEvent = (previous, event = {}, now = new Date()) => {
  const safeEventType = normalizeString(event.type) || 'play';
  const eventXp = EVENT_XP[safeEventType] || EVENT_XP.play;
  const currentDate = dateToken(now);

  let state = ensureDailyChallenge(previous, now);
  state = withUpdatedStreak(state, currentDate);

  const dailyStats = applyEventToDailyStats(state.dailyStats, {
    ...event,
    type: safeEventType,
  });
  const challenge = {
    ...state.dailyChallenge,
  };
  const progress = challengeProgressFor(challenge, dailyStats);
  const completed = progress >= challenge.target;
  challenge.progress = Math.min(challenge.target, progress);

  let xp = state.xp + eventXp;
  let nextState = {
    ...state,
    dailyStats,
    dailyChallenge: {
      ...challenge,
      completed,
    },
    completedJourneys:
      safeEventType === 'journey_complete' && event?.journeyId
        ? normalizeList([...(state.completedJourneys || []), event.journeyId], MAX_COMPLETED_JOURNEYS)
        : state.completedJourneys,
    xp,
    updatedAt: Date.now(),
  };

  if (completed && !state.dailyChallenge.completed) {
    xp += challenge.rewardXp;
    nextState = pushWin(
      {
        ...nextState,
        xp,
      },
      challenge,
    );
  }

  return sanitizeExploreProgression(nextState);
};

export default {
  EXPLORE_PROGRESSION_KEY,
  DAILY_CHALLENGE_TEMPLATES,
  readExploreProgression,
  writeExploreProgression,
  mergeExploreProgression,
  ensureDailyChallenge,
  recordExploreProgressEvent,
  sanitizeExploreProgression,
};
