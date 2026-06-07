import { formatDistanceToNowStrict } from 'date-fns';
import { formatMasthead } from '@/lib/editorial-meta';
import {
  FILTER_MODES,
  FILTER_REGIONS,
  FILTER_WINDOWS,
  LEGACY_MODE_ALIASES,
  LEGACY_REGION_ALIASES,
  LEGACY_WINDOW_ALIASES,
  REGION_OPTIONS,
  WINDOW_OPTIONS,
} from '@/types/charts.types';

const REGION_BY_ID = Object.fromEntries(REGION_OPTIONS.map((region) => [region.id, region]));
const WINDOW_BY_ID = Object.fromEntries(WINDOW_OPTIONS.map((window) => [window.id, window]));

export const normalizeMode = (rawMode) => {
  const next = String(rawMode || '').trim().toLowerCase();
  const normalized = LEGACY_MODE_ALIASES[next] || next;
  return FILTER_MODES.includes(normalized) ? normalized : 'artists';
};

export const normalizeRegion = (rawRegion) => {
  const next = String(rawRegion || '').trim().toLowerCase();
  const normalized = LEGACY_REGION_ALIASES[next] || next;
  return FILTER_REGIONS.includes(normalized) ? normalized : 'global';
};

export const normalizeWindow = (rawWindow) => {
  const next = String(rawWindow || '').trim().toLowerCase();
  const normalized = LEGACY_WINDOW_ALIASES[next] || next;
  return FILTER_WINDOWS.includes(normalized) ? normalized : 'this_week';
};

export const getRegionMeta = (region) => REGION_BY_ID[normalizeRegion(region)] || REGION_BY_ID.global;
export const getWindowMeta = (window) => WINDOW_BY_ID[normalizeWindow(window)] || WINDOW_BY_ID.this_week;

// Sentinel rendered for any field we genuinely don't have a value for.
// Spec contract (Section 1): never invent a number — show "—" instead of
// pretending null/0 is a real measurement.
export const EMPTY_VALUE = '\u2014';

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const exactFormatter = new Intl.NumberFormat('en-US');

const isPresentNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
};

export const formatCompactNumber = (value) =>
  isPresentNumber(value) ? compactFormatter.format(Number(value)) : EMPTY_VALUE;

export const formatExactNumber = (value) =>
  isPresentNumber(value) ? exactFormatter.format(Number(value)) : EMPTY_VALUE;

export const formatStreamsShort = (streams) =>
  isPresentNumber(streams) ? `${compactFormatter.format(Number(streams))} streams` : EMPTY_VALUE;

export const formatStreamsLabel = (streams, window) => {
  if (!isPresentNumber(streams)) return EMPTY_VALUE;
  const exact = exactFormatter.format(Number(streams));
  if (window === 'all_time') return `${exact} all-time streams`;
  if (window === 'today') return `${exact} streams today`;
  if (window === 'this_month') return `${exact} streams this month`;
  return `${exact} streams this week`;
};

export const parseDurationToSeconds = (duration) => {
  if (!duration || typeof duration !== 'string') return 0;
  const [minutes, seconds] = duration.split(':').map((chunk) => Number(chunk));
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0;
  return Math.max(0, minutes * 60 + seconds);
};

export const formatDurationFromSeconds = (seconds) => {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutesPart = Math.floor(safeSeconds / 60);
  const secondsPart = String(safeSeconds % 60).padStart(2, '0');
  return `${minutesPart}:${secondsPart}`;
};

export const getRankDelta = (rank, prevRank) => {
  if (prevRank == null) {
    return {
      type: 'new',
      amount: null,
      label: 'NEW',
      ariaLabel: 'New entry',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40',
    };
  }
  const change = prevRank - rank;
  if (change > 0) {
    return {
      type: 'up',
      amount: change,
      label: `\u2191 ${change}`,
      ariaLabel: `Up ${change} positions`,
      className: 'text-emerald-400 border-emerald-400/40 bg-emerald-500/10',
    };
  }
  if (change < 0) {
    return {
      type: 'down',
      amount: Math.abs(change),
      label: `\u2193 ${Math.abs(change)}`,
      ariaLabel: `Down ${Math.abs(change)} positions`,
      className: 'text-red-400 border-red-400/40 bg-red-500/10',
    };
  }
  return {
    type: 'flat',
    amount: 0,
    label: '\u2014',
    ariaLabel: 'No rank movement',
    className: 'text-ink-4 border-white/10 bg-white/5',
  };
};

const sentenceCase = (value) => String(value || '').replace(/^./, (char) => char.toUpperCase());

export const getHeroTitle = (mode) =>
  mode === 'songs'
    ? { lead: 'The songs,', accent: 'ranked.' }
    : { lead: 'The artists,', accent: 'ranked.' };

export const getHeroSubtitle = ({ mode, region, window }) => {
  const regionMeta = getRegionMeta(region);
  const audience = regionMeta.audience;

  if (window === 'today') {
    return mode === 'songs'
      ? 'The hottest tracks right now, updated every 15 minutes.'
      : `Who ${audience} is listening to right now, live.`;
  }
  if (window === 'this_month') {
    return mode === 'songs'
      ? 'The biggest songs of the month, by total streams.'
      : `The biggest artists of the month in ${sentenceCase(regionMeta.label)}.`;
  }
  if (window === 'all_time') {
    return mode === 'songs'
      ? 'The greatest tracks ever recorded, by all-time streams.'
      : 'The most enduring artists ever, measured by all-time impact.';
  }
  if (mode === 'songs') {
    return `The tracks ${audience} can't stop streaming.`;
  }
  return `Who ${audience} is listening to right now — ${regionMeta.label.toLowerCase()}, this week.`;
};

export const getLiveDataState = (window) => {
  if (window === 'today') {
    return {
      isDisabled: false,
      isPulse: true,
      dotClassName: 'bg-emerald-400 shadow-[0_0_0_0_rgba(52,211,153,0.65)] animate-pulse',
      tooltip: 'Chart data updates every 15 minutes',
    };
  }
  if (window === 'all_time') {
    return {
      isDisabled: false,
      isPulse: false,
      dotClassName: 'bg-emerald-400/55',
      tooltip: 'All-time aggregates refresh every 24 hours',
    };
  }
  if (window === 'this_month') {
    return {
      isDisabled: false,
      isPulse: false,
      dotClassName: 'bg-emerald-400/60',
      tooltip: 'Monthly chart updates every 6 hours',
    };
  }
  return {
    isDisabled: false,
    isPulse: false,
    dotClassName: 'bg-emerald-400/70',
    tooltip: 'Weekly chart updates every hour',
  };
};

export const getUpdatedAgoLabel = (updatedAt) => {
  if (!updatedAt) return null;
  try {
    return `Updated ${formatDistanceToNowStrict(updatedAt, { addSuffix: true })}`;
  } catch {
    return null;
  }
};

export const buildMasthead = ({ mode, now = new Date() }) =>
  `${formatMasthead(now)}   \u2726 THE OCTAVIA DAILY \u00b7 ${mode.toUpperCase()} \u2726   TOP 50`;

export const buildChartsSearch = ({ mode, region, window }) => {
  const params = new URLSearchParams();
  params.set('mode', normalizeMode(mode));
  params.set('region', normalizeRegion(region));
  params.set('window', normalizeWindow(window));
  return params.toString();
};

export const buildChartsUrl = ({ mode, region, window }) =>
  `/charts?${buildChartsSearch({ mode, region, window })}`;

export const formatDateForShare = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

// Map common country names + ISO-3166 alpha-2 codes (MusicBrainz returns the
// alpha-2 code for `artist.country`) to their regional indicator flag emoji.
// We normalize the input so "United States", "USA", "us", and "USA " all work.
const COUNTRY_NAME_TO_CODE = {
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  'u.s.a.': 'US',
  america: 'US',
  'united kingdom': 'GB',
  'great britain': 'GB',
  britain: 'GB',
  uk: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  japan: 'JP',
  india: 'IN',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  italy: 'IT',
  spain: 'ES',
  brazil: 'BR',
  mexico: 'MX',
  'south korea': 'KR',
  korea: 'KR',
  netherlands: 'NL',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  ireland: 'IE',
  'new zealand': 'NZ',
  china: 'CN',
  argentina: 'AR',
  colombia: 'CO',
  jamaica: 'JM',
  nigeria: 'NG',
  'south africa': 'ZA',
  russia: 'RU',
  poland: 'PL',
  belgium: 'BE',
  switzerland: 'CH',
  austria: 'AT',
  portugal: 'PT',
  greece: 'GR',
  turkey: 'TR',
  israel: 'IL',
  pakistan: 'PK',
  bangladesh: 'BD',
  indonesia: 'ID',
  philippines: 'PH',
  vietnam: 'VN',
  thailand: 'TH',
};

const codePointForLetter = (letter) => 0x1f1e6 + (letter.charCodeAt(0) - 'A'.charCodeAt(0));

// Returns a flag emoji string for a 2-letter ISO country code by mapping each
// letter to the matching regional indicator code point. Returns '' if input
// isn't exactly two ASCII letters.
export const flagFromCountryCode = (code) => {
  const trimmed = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) return '';
  return String.fromCodePoint(codePointForLetter(trimmed[0]), codePointForLetter(trimmed[1]));
};

// Resolves an arbitrary country description to a flag emoji. Accepts an ISO
// alpha-2 code directly (the typical MusicBrainz shape) or a localized name.
// Returns '' (not '\u2014') so callers can decide whether to render anything.
export const flagFromCountry = (country) => {
  const raw = String(country || '').trim();
  if (!raw) return '';
  if (/^[A-Za-z]{2}$/.test(raw)) return flagFromCountryCode(raw);
  const code = COUNTRY_NAME_TO_CODE[raw.toLowerCase()];
  return code ? flagFromCountryCode(code) : '';
};

// Best-effort code → display name. We prefer Intl.DisplayNames (modern
// browsers) and fall back to the inverse of our manual map for legacy
// environments (and for the test runner). Returns the original string if
// we genuinely can't translate.
const COUNTRY_CODE_TO_NAME = Object.entries(COUNTRY_NAME_TO_CODE).reduce((acc, [name, code]) => {
  if (!acc[code]) acc[code] = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return acc;
}, {});

export const formatCountryName = (country) => {
  const raw = String(country || '').trim();
  if (!raw) return '';
  if (!/^[A-Za-z]{2}$/.test(raw)) return raw;
  const upper = raw.toUpperCase();
  if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
    try {
      const names = new Intl.DisplayNames(['en'], { type: 'region' });
      const resolved = names.of(upper);
      if (resolved && resolved !== upper) return resolved;
    } catch {
      // Fall through to manual table.
    }
  }
  return COUNTRY_CODE_TO_NAME[upper] || upper;
};
