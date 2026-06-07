// =============================================================================
// Charts service — orchestrates real data from Last.fm + MusicBrainz + YTMusic.
// Frontend pulls /api/charts and /api/charts/artists from server.js, which
// delegates to fetchRealChartData() below.
//
// Data sources (every visible value originates here, never hardcoded):
//   • Last.fm   — rank, title, artist name, play counts, listener counts,
//                 regional charts, top tags (genres), bio.
//   • MusicBrainz — artist country (nationality), recording release date.
//   • YTMusic    — playable videoId, album cover thumbnail, duration,
//                  artist photo (channel thumbnail).
//
// Spotify is intentionally not used: as of 2025 their Web API requires the
// app owner to hold an active Premium subscription, which makes the source
// unavailable for free-tier developers. Anywhere we previously enriched via
// Spotify we now use YTMusic + Last.fm + MusicBrainz instead.
// =============================================================================

const { formatDuration, pickThumbnail, ytImage, toTrackDTO } = require('./mappers');
const ytm = require('./ytmusic');
const {
  getTopTracks,
  getTopTracksByCountry,
  getTopArtists,
  getTopArtistsByCountry,
  getTrackInfo,
  getArtistInfo,
  getTrackTopTags,
  getArtistTopTags,
  getArtistTopTracks,
} = require('./lastfm');
const {
  getArtistCountry,
  getRecordingFirstReleaseDate,
} = require('./musicbrainz');

const WINDOW_TTL_MS = {
  today: 15 * 60 * 1000,
  this_week: 60 * 60 * 1000,
  this_month: 6 * 60 * 60 * 1000,
  all_time: 24 * 60 * 60 * 1000,
};

const WINDOW_ALIASES = {
  daily: 'today',
  weekly: 'this_week',
  month: 'this_month',
  monthly: 'this_month',
  alltime: 'all_time',
};

const REGION_ALIASES = {
  in: 'india',
  jp: 'japan',
  gb: 'uk',
  us: 'us',
};

const REGION_TO_COUNTRY = {
  global: null,
  india: 'india',
  us: 'united states',
  uk: 'united kingdom',
  japan: 'japan',
};

const ENRICH_BATCH_SIZE = 5;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const FALLBACK_TRACK_COVER = '/placeholders/track.svg';
const FALLBACK_ARTIST_IMAGE = '/placeholders/artist.svg';

const envPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CHART_CACHE_MAX_ENTRIES = envPositiveInt(process.env.CHART_CACHE_MAX_ENTRIES, 200);
const CHART_HISTORY_MAX_SCOPES = envPositiveInt(process.env.CHART_HISTORY_MAX_SCOPES, 25);
const CHART_HISTORY_MAX_ITEMS_PER_SCOPE = envPositiveInt(
  process.env.CHART_HISTORY_MAX_ITEMS_PER_SCOPE,
  5000,
);

const chartCache = new Map();
const chartHistory = new Map();
const chartRefreshInFlight = new Map();

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const exactNumber = new Intl.NumberFormat('en-US');

const normalizeMode = (mode) => {
  const raw = String(mode || '').trim().toLowerCase();
  return raw === 'artists' ? 'artists' : 'songs';
};

const normalizeRegion = (region) => {
  const raw = String(region || '').trim().toLowerCase();
  const next = REGION_ALIASES[raw] || raw;
  return Object.prototype.hasOwnProperty.call(REGION_TO_COUNTRY, next) ? next : 'global';
};

const normalizeWindow = (chartWindow) => {
  const raw = String(chartWindow || '').trim().toLowerCase();
  const next = WINDOW_ALIASES[raw] || raw;
  return Object.prototype.hasOwnProperty.call(WINDOW_TTL_MS, next) ? next : 'this_week';
};

const normalizeLimit = (limit) => {
  const numeric = Number(limit);
  if (!Number.isFinite(numeric)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.round(numeric)));
};

const getWindowTtlMs = (window) => WINDOW_TTL_MS[normalizeWindow(window)] || WINDOW_TTL_MS.this_week;

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(String(value ?? '').replace(/,/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const slugify = (value) => normalizeText(value).replace(/\s+/g, '-');

const dedupeStrings = (values, limit = 3) => {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const lower = String(raw || '').trim().toLowerCase();
    if (!lower || seen.has(lower)) continue;
    seen.add(lower);
    out.push(String(raw).trim());
    if (out.length >= limit) break;
  }
  return out;
};

const artistNameFromTrackRaw = (raw) =>
  raw?.artist?.name || raw?.artist?.['#text'] || raw?.artist || '';

const safeTrackId = (videoId, raw, rank) => {
  if (videoId) return `yt_${videoId}`;
  const mbid = raw?.mbid;
  if (mbid) return `lastfm_track_${mbid}`;
  return `lastfm_track_${normalizeText(raw?.name)}_${normalizeText(artistNameFromTrackRaw(raw))}_${rank}`;
};

const safeArtistId = (ytArtistId, raw, rank) => {
  if (ytArtistId) return `yt_${ytArtistId}`;
  const mbid = raw?.mbid;
  if (mbid) return `lastfm_artist_${mbid}`;
  return `lastfm_artist_${normalizeText(raw?.name)}_${rank}`;
};

const formatStreamsShort = (streams) => {
  if (!streams) return 'N/A';
  return `${compactNumber.format(streams)} streams`;
};

const formatExactStreams = (streams) => {
  if (!streams) return 'N/A';
  return `${exactNumber.format(streams)} streams`;
};

const formatListenersShort = (listeners) => {
  if (!listeners) return 'N/A';
  return `${compactNumber.format(listeners)} monthly`;
};

const ensureUniqueBy = (items, keyGetter) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyGetter(item);
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const trimOldest = (map, maxEntries) => {
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
};

const setRecent = (map, key, value, maxEntries) => {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  trimOldest(map, maxEntries);
};

const runInBatches = async (rows, size, worker) => {
  const out = [];
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const settled = await Promise.allSettled(
      chunk.map((row, index) => worker(row, i + index)),
    );
    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) out.push(result.value);
      if (result.status === 'rejected') {
        console.warn('[charts-service] enrichment failed:', result.reason?.message || result.reason);
      }
    });
  }
  return out;
};

const getRawSongChart = async ({ region, limit }) => {
  const country = REGION_TO_COUNTRY[region];
  if (country) return getTopTracksByCountry(country, limit);
  return getTopTracks(limit);
};

const getRawArtistChart = async ({ region, limit }) => {
  const country = REGION_TO_COUNTRY[region];
  if (country) return getTopArtistsByCountry(country, limit);
  return getTopArtists(limit);
};

const scoreThisMonthSong = (entry) => {
  const streams = Number(entry.streams) || 0;
  const listeners = Number(entry.listeners) || 0;
  return streams + listeners;
};

const scoreThisMonthArtist = (entry) => {
  const listeners = Number(entry.listeners) || 0;
  const playcount = Number(entry.playcount) || 0;
  return playcount + listeners;
};

const applyChartHistory = ({ mode, region, items }) => {
  const scopeKey = `${mode}:${region}`;
  const store = chartHistory.get(scopeKey) || new Map();
  const nextItems = items.map((item) => {
    const hit = store.get(item.id);
    const weeksOnChart = hit ? hit.weeksOnChart + 1 : 1;
    const peakRank = hit ? Math.min(hit.peakRank, item.rank) : item.rank;
    setRecent(store, item.id, {
      weeksOnChart,
      peakRank,
      updatedAt: Date.now(),
    }, CHART_HISTORY_MAX_ITEMS_PER_SCOPE);
    return {
      ...item,
      weeksOnChart,
      peakRank,
    };
  });
  setRecent(chartHistory, scopeKey, store, CHART_HISTORY_MAX_SCOPES);
  return nextItems;
};

const applyPrevRank = ({ previousItems, items }) => {
  const prevRank = new Map((previousItems || []).map((row) => [row.id, row.rank]));
  return items.map((item) => ({
    ...item,
    prevRank: prevRank.get(item.id) ?? null,
  }));
};

const collectTracksByArtist = (rawTracks) => {
  const grouped = new Map();
  (rawTracks || []).forEach((row, index) => {
    const artistName = artistNameFromTrackRaw(row);
    const key = normalizeText(artistName);
    if (!key) return;
    const list = grouped.get(key) || [];
    list.push({
      rank: Number(row?.['@attr']?.rank) || index + 1,
      title: row?.name || 'Untitled',
      artist: artistName || 'Unknown artist',
      streams: parsePositiveInt(row?.playcount),
      listeners: parsePositiveInt(row?.listeners),
      mbid: row?.mbid || null,
    });
    grouped.set(key, list);
  });
  return grouped;
};

// Validation. We keep entries whose Last.fm row was real even if YTMusic
// never resolved a videoId — covers fall back to a placeholder, which the
// spec explicitly allows ("If match fails: use Last.fm data only, show
// placeholder cover, log warning").
const validateSongEntry = (entry) => {
  if (!entry) return false;
  if (!entry.id || !entry.title || !entry.artist) return false;
  if (!entry.rank) return false;
  return true;
};

const validateArtistEntry = (entry) => {
  if (!entry) return false;
  if (!entry.id || !entry.name || !entry.rank) return false;
  return true;
};

const safeCall = async (label, fn) => {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[charts-service] ${label} failed:`, err?.message || err);
    return null;
  }
};

// -------------------------------------------------------------------------
// Per-pipeline caches. We instantiate one of these inside each fetch so
// duplicate artist names / track titles inside a single chart request only
// trigger one upstream call. Across requests, the higher-level chartCache
// + per-source memo caches in lastfm.js / ytmusic.js / musicbrainz.js take
// over.
// -------------------------------------------------------------------------
const makeRequestCache = () => ({
  ytArtist: new Map(),     // normalized name -> { artistId, thumbnailUrl }
  ytVideo: new Map(),      // `${title}|${artist}` -> { videoId, thumbnailUrl, duration }
  trackInfo: new Map(),    // `${title}|${artist}` -> Last.fm getTrackInfo
  artistInfo: new Map(),   // normalized name -> Last.fm getArtistInfo
  artistTags: new Map(),   // normalized name -> string[]
  trackTags: new Map(),    // `${title}|${artist}` -> string[]
});

const resolveYtVideo = async (title, artist, cache) => {
  const key = `${normalizeText(title)}|${normalizeText(artist)}`;
  if (cache.ytVideo.has(key)) return cache.ytVideo.get(key);
  const hit = await safeCall(`ytm.resolveVideoId(${title})`, () => ytm.resolveVideoId(title, artist));
  const value = hit && hit.videoId
    ? {
        videoId: hit.videoId,
        thumbnailUrl: pickThumbnail(hit.thumbnails) || ytImage(hit.videoId),
        duration: Number.isFinite(hit.duration) ? hit.duration : null,
      }
    : null;
  cache.ytVideo.set(key, value);
  return value;
};

const resolveYtArtist = async (artistName, cache) => {
  const key = normalizeText(artistName);
  if (cache.ytArtist.has(key)) return cache.ytArtist.get(key);
  const hits = await safeCall(`ytm.searchArtists(${artistName})`, () => ytm.searchArtists(artistName, 1));
  const top = Array.isArray(hits) ? hits[0] : null;
  const value = top && top.artistId
    ? {
        artistId: top.artistId,
        thumbnailUrl: pickThumbnail(top.thumbnails) || null,
      }
    : null;
  cache.ytArtist.set(key, value);
  return value;
};

const fetchTrackInfo = async (artist, title, cache) => {
  const key = `${normalizeText(title)}|${normalizeText(artist)}`;
  if (cache.trackInfo.has(key)) return cache.trackInfo.get(key);
  const value = await safeCall(`lastfm.getTrackInfo(${title})`, () => getTrackInfo(artist, title));
  cache.trackInfo.set(key, value);
  return value;
};

const fetchArtistInfo = async (artist, cache) => {
  const key = normalizeText(artist);
  if (cache.artistInfo.has(key)) return cache.artistInfo.get(key);
  const value = await safeCall(`lastfm.getArtistInfo(${artist})`, () => getArtistInfo(artist));
  cache.artistInfo.set(key, value);
  return value;
};

const fetchArtistTags = async (artist, cache) => {
  const key = normalizeText(artist);
  if (cache.artistTags.has(key)) return cache.artistTags.get(key);
  const tags = await safeCall(`lastfm.getArtistTopTags(${artist})`, () => getArtistTopTags(artist));
  const value = Array.isArray(tags) ? tags : [];
  cache.artistTags.set(key, value);
  return value;
};

const fetchTrackTags = async (artist, title, cache) => {
  const key = `${normalizeText(title)}|${normalizeText(artist)}`;
  if (cache.trackTags.has(key)) return cache.trackTags.get(key);
  const tags = await safeCall(`lastfm.getTrackTopTags(${title})`, () => getTrackTopTags(artist, title));
  const value = Array.isArray(tags) ? tags : [];
  cache.trackTags.set(key, value);
  return value;
};

const tagsFromArtistInfo = (info) => {
  const list = info?.tags?.tag;
  if (!Array.isArray(list)) return [];
  return list.map((tag) => String(tag?.name || '').trim()).filter(Boolean);
};

// Last.fm sometimes embeds the duration in milliseconds inside `getTrackInfo`,
// other times in seconds. We coerce defensively.
const lastFmDurationToSec = (raw) => {
  const ms = parsePositiveInt(raw);
  if (!ms) return null;
  return ms > 1000 ? Math.round(ms / 1000) : ms;
};

// =============================================================================
// SONG ROW ENRICHMENT
// =============================================================================
const enrichSongRows = async ({ rawEntries, region, window, previousItems }) => {
  const cache = makeRequestCache();

  const enriched = await runInBatches(rawEntries, ENRICH_BATCH_SIZE, async (raw, index) => {
    const rankFromSource = Number(raw?.['@attr']?.rank);
    const baseRank = Number.isFinite(rankFromSource) ? rankFromSource : index + 1;
    const title = raw?.name || 'Untitled';
    const artistName = artistNameFromTrackRaw(raw) || 'Unknown artist';
    const artistSlug = slugify(artistName);

    // Last.fm chart rows often include the artist's MusicBrainz id under
    // `raw.artist.mbid`; using it shortcuts the country lookup past common
    // name collisions ("Drake", "Future", etc.).
    const artistMbid = raw?.artist?.mbid || null;

    // Run independent lookups in parallel — they don't depend on each other.
    // We always fetch the artist's top tags too because per-track tags on
    // Last.fm are often user-vanity values ("brighterdayinc", "isa-song")
    // for newer chart entries; artist-level tags are reliably stylistic
    // ("pop", "electropop") and serve as a clean fallback / fill-in.
    const [ytVideo, trackInfo, releaseDate, artistCountry, ytArtist, trackTags, artistTags] = await Promise.all([
      resolveYtVideo(title, artistName, cache),
      window === 'all_time' ? fetchTrackInfo(artistName, title, cache) : null,
      safeCall(`mb.releaseDate(${title})`, () => getRecordingFirstReleaseDate(title, artistName)),
      safeCall(`mb.country(${artistName})`, () => getArtistCountry(artistName, { mbid: artistMbid })),
      resolveYtArtist(artistName, cache),
      fetchTrackTags(artistName, title, cache),
      fetchArtistTags(artistName, cache),
    ]);

    // Prefer track-level Last.fm data when we asked for it (all_time window),
    // otherwise trust the chart row's playcount/listeners.
    const streams = parsePositiveInt(trackInfo?.playcount) || parsePositiveInt(raw?.playcount);
    const listeners = parsePositiveInt(trackInfo?.listeners) || parsePositiveInt(raw?.listeners);
    const lastFmDurationSec = lastFmDurationToSec(trackInfo?.duration);
    const durationSec = ytVideo?.duration || lastFmDurationSec || null;

    const albumName = trackInfo?.album?.title || null;
    // Last.fm's album image array is mostly placeholder URLs since 2019; we
    // don't trust it for covers. YTM thumbnail is the real source.
    const coverUrl = ytVideo?.thumbnailUrl || FALLBACK_TRACK_COVER;

    const videoId = ytVideo?.videoId || null;

    const trackId = safeTrackId(videoId, raw, baseRank);

    return {
      id: trackId,
      lastfmId: raw?.mbid || null,
      rank: baseRank,
      title,
      artist: artistName,
      artistId: artistSlug,
      ytArtistId: ytArtist?.artistId || null,
      artistSlug,
      artistAvatarUrl: ytArtist?.thumbnailUrl || FALLBACK_ARTIST_IMAGE,
      artistFollowers: null,
      artistCountry: artistCountry || null,
      album: albumName,
      albumId: null,
      coverUrl,
      thumbnail: coverUrl,
      audioUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      videoId,
      playable: Boolean(videoId),
      duration: durationSec ? formatDuration(durationSec) : '0:00',
      durationSec,
      streams,
      streamsLabel: formatStreamsShort(streams),
      exactStreamsLabel: formatExactStreams(streams),
      listeners,
      releaseDate: releaseDate || null,
      genre: dedupeStrings([...trackTags, ...artistTags], 3),
      plays: streams,
    };
  });

  let rows = enriched.filter(validateSongEntry);

  if (window === 'this_month') {
    rows = [...rows].sort((a, b) => scoreThisMonthSong(b) - scoreThisMonthSong(a));
  } else if (window === 'all_time') {
    rows = [...rows].sort((a, b) => (b.streams || 0) - (a.streams || 0));
  }

  rows = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  rows = ensureUniqueBy(rows, (row) => row.id);
  rows = ensureUniqueBy(rows, (row) => row.rank);
  rows = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  rows = applyPrevRank({ previousItems, items: rows });
  rows = applyChartHistory({ mode: 'songs', region, items: rows });
  return rows;
};

// =============================================================================
// ARTIST ROW ENRICHMENT
// =============================================================================
const enrichArtistRows = async ({ rawEntries, rawTracks, region, window, previousItems }) => {
  const cache = makeRequestCache();
  const tracksByArtist = collectTracksByArtist(rawTracks);

  const enriched = await runInBatches(rawEntries, ENRICH_BATCH_SIZE, async (raw, index) => {
    const rankFromSource = Number(raw?.['@attr']?.rank);
    const baseRank = Number.isFinite(rankFromSource) ? rankFromSource : index + 1;
    const artistName = raw?.name || 'Unknown artist';
    const artistSlug = slugify(artistName);
    const artistKey = normalizeText(artistName);

    // Last.fm artist chart rows carry `mbid` directly on the row; using it
    // bypasses the score/score-tie picking and gives unambiguous results.
    const artistMbid = raw?.mbid || null;

    const [ytArtist, artistInfo, artistCountry, lastFmTags] = await Promise.all([
      resolveYtArtist(artistName, cache),
      window === 'all_time' ? fetchArtistInfo(artistName, cache) : null,
      safeCall(`mb.country(${artistName})`, () => getArtistCountry(artistName, { mbid: artistMbid })),
      fetchArtistTags(artistName, cache),
    ]);

    // Prefer Last.fm's authoritative artist.getInfo numbers when we have
    // them (the all_time window asks for them). Otherwise the chart row's
    // playcount/listeners are already accurate for the active window.
    const listeners =
      parsePositiveInt(raw?.listeners)
      || parsePositiveInt(artistInfo?.stats?.listeners)
      || null;
    const playcount =
      parsePositiveInt(raw?.playcount)
      || parsePositiveInt(artistInfo?.stats?.playcount)
      || null;

    // Resolve up to five charted tracks for this artist so the expanded row
    // can reveal them. Each row gets a real YTM videoId for playback.
    const relatedTracks = (tracksByArtist.get(artistKey) || []).slice(0, 5);
    let chartedTracks = await runInBatches(relatedTracks, 3, async (track, trackIndex) => {
      const ytVideo = await resolveYtVideo(track.title, artistName, cache);
      const videoId = ytVideo?.videoId || null;
      const coverUrl = ytVideo?.thumbnailUrl || FALLBACK_TRACK_COVER;
      return {
        id: `${safeArtistId(ytArtist?.artistId, raw, baseRank)}-track-${trackIndex + 1}`,
        rank: track.rank || trackIndex + 1,
        title: track.title,
        artist: artistName,
        artistId: artistSlug,
        ytArtistId: ytArtist?.artistId || null,
        streams: track.streams || null,
        duration: ytVideo?.duration ? formatDuration(ytVideo.duration) : '0:00',
        coverUrl,
        thumbnail: coverUrl,
        videoId,
        audioUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
        playable: Boolean(videoId),
      };
    });
    // tracksOnChart represents how many of THIS region's chart entries the
    // artist appears on — keep that honest. But topSong should always be
    // a real song name. When the regional chart doesn't credit any track
    // to this artist (common for producers/composers like Pritam), pull
    // their all-time top tracks from Last.fm so the UI never shows N/A.
    const chartedCount = chartedTracks.length;
    let topSongTitle = chartedTracks[0]?.title || null;
    if (!topSongTitle) {
      const fallbackTopTracks = await safeCall(
        `lastfm.getArtistTopTracks(${artistName})`,
        () => getArtistTopTracks(artistName, 5),
      );
      const fallbackList = Array.isArray(fallbackTopTracks) ? fallbackTopTracks : [];
      if (fallbackList.length) {
        const fallbackEnriched = await runInBatches(fallbackList, 3, async (track, trackIndex) => {
          const title = String(track?.name || '').trim();
          if (!title) return null;
          const ytVideo = await resolveYtVideo(title, artistName, cache);
          const videoId = ytVideo?.videoId || null;
          const coverUrl = ytVideo?.thumbnailUrl || FALLBACK_TRACK_COVER;
          return {
            id: `${safeArtistId(ytArtist?.artistId, raw, baseRank)}-toptrack-${trackIndex + 1}`,
            rank: trackIndex + 1,
            title,
            artist: artistName,
            artistId: artistSlug,
            ytArtistId: ytArtist?.artistId || null,
            streams: parsePositiveInt(track?.playcount),
            duration: ytVideo?.duration ? formatDuration(ytVideo.duration) : '0:00',
            coverUrl,
            thumbnail: coverUrl,
            videoId,
            audioUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
            playable: Boolean(videoId),
          };
        });
        chartedTracks = fallbackEnriched.filter(Boolean);
        topSongTitle = chartedTracks[0]?.title || null;
      }
    }

    const genre = dedupeStrings(
      [...lastFmTags, ...tagsFromArtistInfo(artistInfo)],
      3,
    );

    return {
      id: safeArtistId(ytArtist?.artistId, raw, baseRank),
      rank: baseRank,
      name: artistName,
      artistId: artistSlug,
      ytArtistId: ytArtist?.artistId || null,
      avatarUrl: ytArtist?.thumbnailUrl || FALLBACK_ARTIST_IMAGE,
      thumbnail: ytArtist?.thumbnailUrl || FALLBACK_ARTIST_IMAGE,
      // Honour the chart-context count: how many of the artist's tracks
      // actually appear in the active region's chart. The fallback top-tracks
      // we may have substituted into chartedTracks above don't count toward
      // this — those just keep the expanded row useful.
      tracksOnChart: chartedCount,
      monthlyStreamsValue: listeners,
      monthlyStreams: formatListenersShort(listeners),
      topSong: topSongTitle || 'N/A',
      nationality: artistCountry || null,
      genre,
      // Without Spotify we don't have a "follower count" channel; Last.fm's
      // listener number is the closest equivalent (monthly listeners). We
      // surface both so the UI can pick — the column the spec calls
      // "Followers" stays a real, live number.
      followers: listeners,
      listeners,
      playcount,
      chartedTracks,
      plays: playcount || listeners || 0,
    };
  });

  let rows = enriched.filter(validateArtistEntry);

  if (window === 'this_month') {
    rows = [...rows].sort((a, b) => scoreThisMonthArtist(b) - scoreThisMonthArtist(a));
  } else if (window === 'all_time') {
    rows = [...rows].sort((a, b) => (b.playcount || 0) - (a.playcount || 0));
  }

  rows = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  rows = ensureUniqueBy(rows, (row) => row.id);
  rows = ensureUniqueBy(rows, (row) => row.rank);
  rows = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  rows = applyPrevRank({ previousItems, items: rows });
  rows = applyChartHistory({ mode: 'artists', region, items: rows });
  return rows;
};

// =============================================================================
// YTM FALLBACK PIPELINE (when Last.fm is unavailable)
// =============================================================================
const buildYtmSongFallbackRows = async ({ region, previousItems, limit, applyHistory = true }) => {
  const rawRows = await ytm.getChartsLive(Math.max(limit, 50));
  const tracks = ensureUniqueBy(
    rawRows
      .map((row) => toTrackDTO(row))
      .filter(Boolean),
    (row) => row.id,
  )
    .slice(0, limit)
    .map((track, index) => ({
      id: track.id,
      rank: index + 1,
      title: track.title,
      artist: track.artist,
      artistId: track.artistHumanSlug || track.artistSlug || slugify(track.artist),
      artistSlug: track.artistHumanSlug || track.artistSlug || slugify(track.artist),
      albumId: track.albumId || null,
      coverUrl: track.thumbnail || FALLBACK_TRACK_COVER,
      thumbnail: track.thumbnail || FALLBACK_TRACK_COVER,
      audioUrl: track.videoId ? `https://www.youtube.com/watch?v=${track.videoId}` : null,
      videoId: track.videoId || null,
      playable: Boolean(track.videoId),
      duration: track.duration || (track.durationSec ? formatDuration(track.durationSec) : '0:00'),
      durationSec: track.durationSec || null,
      streams: null,
      streamsLabel: 'N/A',
      exactStreamsLabel: 'N/A',
      genre: [],
      plays: null,
    }));

  const withPrevRank = applyPrevRank({ previousItems, items: tracks });
  if (!applyHistory) return withPrevRank;
  return applyChartHistory({ mode: 'songs', region, items: withPrevRank });
};

const buildYtmArtistFallbackRows = async ({ region, previousItems, limit }) => {
  const songRows = await buildYtmSongFallbackRows({
    region,
    previousItems: [],
    limit: Math.max(limit, 50),
    applyHistory: false,
  });
  const grouped = new Map();
  songRows.forEach((song) => {
    const key = song.artistId || slugify(song.artist);
    const current = grouped.get(key) || {
      key,
      artistId: key,
      name: song.artist,
      avatarUrl: song.coverUrl || FALLBACK_ARTIST_IMAGE,
      topSong: song.title,
      tracks: [],
      bestRank: Number.POSITIVE_INFINITY,
    };
    current.tracks.push({
      id: song.id,
      rank: song.rank,
      title: song.title,
      artist: song.artist,
      artistId: key,
      streams: song.streams,
      duration: song.duration,
      coverUrl: song.coverUrl,
      thumbnail: song.thumbnail,
      videoId: song.videoId,
      audioUrl: song.audioUrl,
      playable: song.playable,
    });
    if (song.rank < current.bestRank) {
      current.bestRank = song.rank;
      current.topSong = song.title;
      current.avatarUrl = song.coverUrl || current.avatarUrl;
    }
    grouped.set(key, current);
  });

  const ranked = [...grouped.values()]
    .sort((a, b) => b.tracks.length - a.tracks.length || a.bestRank - b.bestRank)
    .slice(0, limit)
    .map((artist, index) => ({
      id: artist.artistId,
      rank: index + 1,
      name: artist.name,
      artistId: artist.artistId,
      avatarUrl: artist.avatarUrl || FALLBACK_ARTIST_IMAGE,
      thumbnail: artist.avatarUrl || FALLBACK_ARTIST_IMAGE,
      tracksOnChart: artist.tracks.length,
      monthlyStreamsValue: null,
      monthlyStreams: 'N/A',
      topSong: artist.topSong || 'N/A',
      nationality: null,
      genre: [],
      followers: null,
      listeners: null,
      playcount: null,
      chartedTracks: artist.tracks.slice(0, 5),
      plays: null,
    }));

  const withPrevRank = applyPrevRank({ previousItems, items: ranked });
  return applyChartHistory({ mode: 'artists', region, items: withPrevRank });
};

const buildYtmFallbackPayload = async ({
  mode,
  region,
  window,
  limit,
  previousItems,
  causeMessage,
}) => {
  const items = mode === 'songs'
    ? await buildYtmSongFallbackRows({ region, previousItems, limit })
    : await buildYtmArtistFallbackRows({ region, previousItems, limit });
  const fetchedAtIso = new Date().toISOString();
  return {
    items,
    lastUpdated: fetchedAtIso,
    meta: {
      source: 'ytm-fallback',
      mode,
      region,
      window,
      fetchedAt: fetchedAtIso,
      stale: false,
      warning: `Primary chart provider unavailable (${causeMessage}). Showing live YouTube Music fallback.`,
    },
  };
};

const fetchFreshChartData = async ({ mode, region, window, limit, previousItems }) => {
  if (mode === 'songs') {
    const rawEntries = await getRawSongChart({ region, limit });
    const rows = await enrichSongRows({ rawEntries, region, window, previousItems });
    return rows.slice(0, limit);
  }

  const [rawEntries, rawTracks] = await Promise.all([
    getRawArtistChart({ region, limit }),
    getRawSongChart({ region, limit: Math.max(limit, 50) }),
  ]);
  const rows = await enrichArtistRows({
    rawEntries,
    rawTracks,
    region,
    window,
    previousItems,
  });
  return rows.slice(0, limit);
};

const buildLivePayload = ({ items, mode, region, window }) => {
  const fetchedAtIso = new Date().toISOString();
  return {
    items,
    lastUpdated: fetchedAtIso,
    meta: {
      source: 'lastfm+musicbrainz+ytm',
      mode,
      region,
      window,
      fetchedAt: fetchedAtIso,
      stale: false,
      warning: null,
    },
  };
};

const writeChartCache = (cacheKey, payload) => {
  setRecent(
    chartCache,
    cacheKey,
    { fetchedAt: Date.now(), payload },
    CHART_CACHE_MAX_ENTRIES,
  );
};

const withFreshMeta = (payload) => ({
  ...payload,
  meta: {
    ...payload.meta,
    stale: false,
    staleReason: null,
    warning:
      payload?.meta?.source === 'ytm-fallback'
        ? payload?.meta?.warning || null
        : null,
  },
});

const withStaleMeta = (payload, warning, staleReason = null) => ({
  ...payload,
  meta: {
    ...payload.meta,
    stale: true,
    warning,
    staleReason,
  },
});

const refreshAndCacheLivePayload = async ({
  cacheKey,
  mode,
  region,
  window,
  limit,
}) => {
  const previousItems = chartCache.get(cacheKey)?.payload?.items || [];
  const items = await fetchFreshChartData({
    mode,
    region,
    window,
    limit,
    previousItems,
  });
  const payload = buildLivePayload({
    items,
    mode,
    region,
    window,
  });
  writeChartCache(cacheKey, payload);
  return payload;
};

const refreshAndCacheFallbackPayload = async ({
  cacheKey,
  mode,
  region,
  window,
  limit,
  causeMessage,
}) => {
  const fallbackPayload = await buildYtmFallbackPayload({
    mode,
    region,
    window,
    limit,
    previousItems: [],
    causeMessage,
  });
  writeChartCache(cacheKey, fallbackPayload);
  return fallbackPayload;
};

const scheduleChartRefresh = (params) => {
  const { cacheKey } = params;
  const inFlight = chartRefreshInFlight.get(cacheKey);
  if (inFlight) return inFlight;

  const task = (async () => {
    try {
      return await refreshAndCacheLivePayload(params);
    } catch (error) {
      try {
        return await refreshAndCacheFallbackPayload({
          ...params,
          causeMessage: error?.message || 'unknown error',
        });
      } catch {
        throw error;
      }
    } finally {
      chartRefreshInFlight.delete(cacheKey);
    }
  })();

  chartRefreshInFlight.set(cacheKey, task);
  return task;
};

const buildCacheKey = ({ mode, region, window, limit }) => {
  const normalizedMode = normalizeMode(mode);
  const normalizedRegion = normalizeRegion(region);
  const normalizedWindow = normalizeWindow(window);
  const safeLimit = normalizeLimit(limit);
  return {
    cacheKey: `charts:${normalizedMode}:${normalizedRegion}:${normalizedWindow}:${safeLimit}`,
    normalizedMode,
    normalizedRegion,
    normalizedWindow,
    safeLimit,
  };
};

const fetchRealChartData = async ({
  mode = 'songs',
  region = 'global',
  window = 'this_week',
  limit = DEFAULT_LIMIT,
  backgroundRefresh = true,
} = {}) => {
  const {
    cacheKey,
    normalizedMode,
    normalizedRegion,
    normalizedWindow,
    safeLimit,
  } = buildCacheKey({ mode, region, window, limit });
  const ttlMs = getWindowTtlMs(normalizedWindow);
  const now = Date.now();
  const cached = chartCache.get(cacheKey);

  if (cached) {
    setRecent(chartCache, cacheKey, cached, CHART_CACHE_MAX_ENTRIES);
  }

  if (cached && now - cached.fetchedAt < ttlMs) {
    return withFreshMeta(cached.payload);
  }

  const refreshParams = {
    cacheKey,
    mode: normalizedMode,
    region: normalizedRegion,
    window: normalizedWindow,
    limit: safeLimit,
  };

  if (cached?.payload) {
    const cachedAt = cached.payload.lastUpdated || new Date(cached.fetchedAt).toISOString();
    const staleWarning = backgroundRefresh
      ? `Showing cached data from ${cachedAt}. Refreshing in background.`
      : `Showing cached data from ${cachedAt}.`;
    if (backgroundRefresh) {
      scheduleChartRefresh(refreshParams).catch((error) => {
        console.warn('[charts-service] background refresh failed:', error?.message || error);
      });
    }
    return withStaleMeta(cached.payload, staleWarning);
  }

  try {
    const payload = await scheduleChartRefresh(refreshParams);
    return withFreshMeta(payload);
  } catch (error) {
    throw error;
  }
};

const __testing = {
  clearCaches: () => {
    chartCache.clear();
    chartHistory.clear();
    chartRefreshInFlight.clear();
  },
  seedChartCache: ({ mode, region, window, limit, fetchedAt, payload }) => {
    const { cacheKey } = buildCacheKey({ mode, region, window, limit });
    setRecent(
      chartCache,
      cacheKey,
      {
        fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : Date.now(),
        payload,
      },
      CHART_CACHE_MAX_ENTRIES,
    );
    return cacheKey;
  },
};

module.exports = {
  fetchRealChartData,
  normalizeMode,
  normalizeRegion,
  normalizeWindow,
  getWindowTtlMs,
  __testing,
};
