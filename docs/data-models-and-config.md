# Data Models and Config

This document centralizes the key runtime contracts and configuration knobs used
by the app.

## Core Server DTOs

Canonical DTO mapping lives in `server/lib/mappers.js`.

## Track DTO (`toTrackDTO`)

Primary shape used by search results, charts, trending, album tracks, queue, and
player surfaces.

```json
{
  "id": "videoId",
  "type": "song",
  "kind": "song",
  "videoId": "dQw4w9WgXcQ",
  "title": "Track Title",
  "artist": "Artist Name",
  "artistId": "UC...",
  "artistSlug": "UC...",
  "artistHumanSlug": "artist-name",
  "album": "Album Name",
  "albumId": "MPRE...",
  "duration": "3:33",
  "durationSec": 213,
  "thumbnail": "https://...",
  "playable": true,
  "plays": null,
  "releaseDate": null,
  "rank": 4
}
```

### Important notes

- `videoId` is required for real playback.
- `kind` distinguishes YTM `SONG` and `VIDEO` source rows.
- `artistSlug` keeps channel-ID compatibility; `artistHumanSlug` supports
  human-readable links/search facets.

## Album DTOs

### Album summary (`toAlbumSummaryDTO`)

- used in search and artist discography lists
- includes `playlistId` when available for album-wide playback convenience

### Album detail (`toAlbumDetailDTO`)

- extends summary with:
  - `cover`
  - `label`
  - `tracks: TrackDTO[]`
- can attempt `videoId` resolution for incomplete upstream rows

## Artist DTOs

### Artist summary (`toArtistSummaryDTO`)

- `id`, `slug`, `humanSlug`, `name`, `thumbnail`, `verified`, `rank`

### Artist detail (`toArtistDetailDTO`)

- extends summary with:
  - `cover`
  - `bio`
  - `topTracks: TrackDTO[]`
  - `albums: AlbumSummary[]`

## Charts Payload Models

Charts service envelope:

```json
{
  "items": [],
  "lastUpdated": "2026-06-10T00:00:00.000Z",
  "meta": {
    "source": "lastfm+musicbrainz+ytm",
    "mode": "songs",
    "region": "global",
    "window": "this_week",
    "fetchedAt": "2026-06-10T00:00:00.000Z",
    "stale": false,
    "warning": null
  }
}
```

### Song chart item (representative)

- `id`, `rank`, `prevRank`
- `title`, `artist`, `artistId`, `artistSlug`
- `videoId`, `audioUrl`, `playable`
- `coverUrl`, `thumbnail`
- `duration`, `durationSec`
- `streams`, `listeners`
- `genre[]`
- `weeksOnChart`, `peakRank`

### Artist chart item (representative)

- `id`, `rank`, `prevRank`
- `name`, `artistId`
- `thumbnail`
- `tracksOnChart`
- `monthlyStreams`, `monthlyStreamsValue`
- `topSong`
- `nationality`
- `genre[]`
- `followers`, `listeners`, `playcount`
- `chartedTracks[]`
- `weeksOnChart`, `peakRank`

## Explore Payload Models

Defined by `server/lib/explore-service.js`.

- **Pulse**: `{ highlights, chartWindows, journeys, meta }`
- **Radio**: `{ items, seed, meta }`
- **Similar**: `{ items, anchor, meta }`
- **Journey**: `{ id, title, blurb, mood, genre, seed, region, items, meta }`

## Lyrics Payload Model

Raw backend payload (`/api/lyrics`):

```json
{
  "id": 12345,
  "trackName": "Song Name",
  "artistName": "Artist Name",
  "duration": 225,
  "plainLyrics": "...",
  "syncedLyrics": "[00:01.00]...",
  "instrumental": false
}
```

Frontend transforms this in `src/lib/api.js` to:

```json
{
  "syncedRaw": "...",
  "plain": "...",
  "instrumental": false
}
```

## Frontend Persistence Models (`localStorage`)

| Key | Owner | Stored shape |
| --- | --- | --- |
| `octavia.player.v1` | `PlayerContext` | `{ currentTrack, volume, queue, queueIndex, queueMode, history, shuffle, repeat }` |
| `octavia.favorites.v1` | `FavoritesContext` | map by track id of favorited track summaries |
| `octavia.playlists.v1` | `PlaylistContext` | array of playlist objects (`id`, `name`, `description`, `tracks`, `pinned`, timestamps) |
| `octavia.settings.v1` | `SettingsContext` | user settings (theme, autoplay, sound effects, motion prefs, etc.) |
| `octavia.liked-albums.v1` | `LikedAlbumsContext` | map by album id with summary fields + `likedAt` |
| `octavia.followed-artists.v1` | `FollowedArtistsContext` | map by artist slug/id with summary fields + `followedAt` |
| `octavia.notifications.v1` | `NotificationsContext` | array of notification entries with `read` state |

## Query-Key Contract

`src/lib/query-keys.js` is the source of truth for frontend cache keys.

Characteristics:

- key normalization for search text, chart region/window aliases, limits
- distinct keys for endpoint families (`home`, `search`, `charts`, `explore`,
  `lyrics`, etc.)
- explicit cache policy per resource (`staleTime`, `gcTime`)

When adding a fetch surface, extend query keys first to avoid ad-hoc key drift.

## Environment Variables

Variables are split between frontend (`VITE_*`) and backend runtime (`server/*`).

## Frontend variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE` | `http://localhost:5000/api` in dev, `/api` in prod fallback | backend base URL for axios client |
| `VITE_EXPLORE_V2_ENABLED` | `true` | explore v2 UI enable flag |
| `VITE_EXPLORE_LOOPS_ENABLED` | `true` | explore loops surfaces |
| `VITE_EXPLORE_SOCIAL_ENABLED` | `true` | social/discovery surfaces |
| `VITE_EXPLORE_INFINITE_ENABLED` | `true` | infinite discovery mode |

## Backend core variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | backend listen port |
| `YTM_WARMUP` | enabled | startup warmup control (`false` disables) |
| `CORS_ORIGIN` | empty | allowed production origins (comma-separated) |
| `HOME_CACHE_TTL_SEC` | `300` | default cache header TTL baseline |

## YTMusic integration variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `YTM_CHARTS_PLAYLIST` | built-in playlist ID | source playlist for charts fallback pipeline |
| `YTM_TRENDING_PLAYLIST` | built-in playlist ID | source playlist for trending fallback |
| `YTM_CACHE_SEARCH_MIN` | `5` | TTL for search caches |
| `YTM_CACHE_DETAIL_MIN` | `30` | TTL for album/artist detail caches |
| `YTM_CACHE_CHARTS_MIN` | `60` | TTL for chart/trending caches |
| `YTM_CACHE_GENRES_MIN` | `60` | TTL for genre sampling caches |
| `YTM_REQUEST_TIMEOUT_MS` | `10000` | timeout for YTM upstream calls |
| `YTM_REQUEST_RETRY_COUNT` | `1` | retry count for YTM calls |
| `YTM_CACHE_MAX_ENTRIES` | `500` | max in-memory YTM cache entries |

## Charts/Last.fm/MusicBrainz variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `LASTFM_API_KEY` | none | required for primary chart provider calls |
| `LASTFM_TIMEOUT_MS` | `12000` | Last.fm HTTP timeout |
| `LASTFM_RETRY_COUNT` | `1` | Last.fm retry attempts |
| `LASTFM_CACHE_CHARTS_MS` | `300000` | Last.fm chart-cache TTL |
| `LASTFM_CACHE_INFO_MS` | `1800000` | Last.fm info-cache TTL |
| `LASTFM_CACHE_TAGS_MS` | `21600000` | Last.fm tags-cache TTL |
| `LASTFM_CACHE_MAX_ENTRIES` | `4000` | Last.fm in-memory cache bound |
| `MUSICBRAINZ_TIMEOUT_MS` | `10000` | MusicBrainz HTTP timeout |
| `MUSICBRAINZ_CACHE_TTL_MS` | `86400000` | MusicBrainz cache TTL |
| `MUSICBRAINZ_CACHE_MAX_ENTRIES` | `6000` | MusicBrainz cache bound |
| `MUSICBRAINZ_MIN_INTERVAL_MS` | `1000` | MusicBrainz throttle interval |
| `CHART_CACHE_MAX_ENTRIES` | `200` | chart payload cache bound |
| `CHART_HISTORY_MAX_SCOPES` | `25` | number of chart scopes tracked |
| `CHART_HISTORY_MAX_ITEMS_PER_SCOPE` | `5000` | chart history entries per scope |

## Explore variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `EXPLORE_CACHE_MAX_ENTRIES` | `300` | explore cache bound |
| `EXPLORE_PULSE_TTL_MS` | `120000` | pulse cache TTL |
| `EXPLORE_RADIO_TTL_MS` | `90000` | radio cache TTL |
| `EXPLORE_SIMILAR_TTL_MS` | `300000` | similar cache TTL |
| `EXPLORE_JOURNEY_TTL_MS` | `180000` | journey cache TTL |

## Lyrics variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `LYRICS_BASE_URL` | `https://lrclib.net` | LRCLib API base |
| `LYRICS_YT_OEMBED_BASE_URL` | `https://www.youtube.com/oembed` | YouTube metadata fallback base |
| `LYRICS_TIMEOUT_MS` | `8000` | timeout for lyrics/upstream calls |
| `LYRICS_CACHE_MIN` | `180` | cache duration for lyrics hits (minutes) |
| `LYRICS_CACHE_MISS_MIN` | `5` | cache duration for misses (minutes) |
| `LYRICS_CLIENT_ID` | `Octavia (https://octavia.local)` | outbound user-agent label |
| `LYRICS_CACHE_MAX_ENTRIES` | `500` | lyrics cache bound |

## Rate-limit variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOME_RATE_LIMIT_WINDOW_MS` | `60000` | home/trending window |
| `HOME_RATE_LIMIT_MAX` | `120` | max home/trending requests per window |
| `SEARCH_RATE_LIMIT_WINDOW_MS` | `60000` | search/charts window |
| `SEARCH_RATE_LIMIT_MAX` | `240` | max search/charts requests per window |
| `LYRICS_RATE_LIMIT_WINDOW_MS` | `60000` | lyrics window |
| `LYRICS_RATE_LIMIT_MAX` | `60` | max lyrics requests per window |
| `DETAIL_RATE_LIMIT_WINDOW_MS` | `60000` | album/artist detail window |
| `DETAIL_RATE_LIMIT_MAX` | `90` | max detail requests per window |

## Related Docs

- [API Reference](./api-reference.md)
- [Frontend Guide](./frontend-guide.md)
- [Backend Guide](./backend-guide.md)
