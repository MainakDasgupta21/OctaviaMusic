export const FILTER_MODES = ['songs', 'artists'];
export const FILTER_REGIONS = ['global', 'us', 'uk', 'japan', 'india'];
export const FILTER_WINDOWS = ['today', 'this_week', 'this_month', 'all_time'];

export const MODE_OPTIONS = [
  { id: 'songs', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
];

export const REGION_OPTIONS = [
  { id: 'global', label: 'Global', flag: '\ud83c\udf10', audience: 'the world', defaultNationality: 'Global' },
  { id: 'us', label: 'United States', flag: '\ud83c\uddfa\ud83c\uddf8', audience: 'the United States', defaultNationality: 'United States' },
  { id: 'uk', label: 'United Kingdom', flag: '\ud83c\uddec\ud83c\udde7', audience: 'the United Kingdom', defaultNationality: 'United Kingdom' },
  { id: 'japan', label: 'Japan', flag: '\ud83c\uddef\ud83c\uddf5', audience: 'Japan', defaultNationality: 'Japan' },
  { id: 'india', label: 'India', flag: '\ud83c\uddee\ud83c\uddf3', audience: 'India', defaultNationality: 'India' },
];

export const WINDOW_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'all_time', label: 'All time' },
];

export const WINDOW_TTL_MS = {
  today: 15 * 60 * 1000,
  this_week: 60 * 60 * 1000,
  this_month: 6 * 60 * 60 * 1000,
  all_time: 24 * 60 * 60 * 1000,
};

export const LEGACY_MODE_ALIASES = {
  song: 'songs',
  tracks: 'songs',
  artist: 'artists',
};

export const LEGACY_REGION_ALIASES = {
  jp: 'japan',
  in: 'india',
};

export const LEGACY_WINDOW_ALIASES = {
  daily: 'today',
  weekly: 'this_week',
  monthly: 'this_month',
  alltime: 'all_time',
};

/**
 * @typedef {Object} SongEntry
 * @property {number} rank
 * @property {number | null} prevRank
 * @property {string} title
 * @property {string} artist
 * @property {string} artistId
 * @property {string} coverUrl
 * @property {string} duration
 * @property {number} streams
 * @property {string} streamsLabel
 * @property {number} peakRank
 * @property {number} weeksOnChart
 * @property {boolean} isPlaying
 * @property {string[]} genre
 */

/**
 * @typedef {Object} ArtistEntry
 * @property {number} rank
 * @property {number | null} prevRank
 * @property {string} name
 * @property {string} artistId
 * @property {string} avatarUrl
 * @property {number} tracksOnChart
 * @property {string} monthlyStreams
 * @property {string} topSong
 * @property {string} nationality
 * @property {string[]} genre
 */
