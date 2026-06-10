# API Reference

This document is the practical backend contract for frontend and tooling
consumers.

## Base URL And Conventions

Default local server:

- `http://localhost:5000`

API prefix:

- `/api`

Response format:

- JSON for all endpoints

## Health

### `GET /health`

Returns process liveness:

```json
{ "status": "ok" }
```

## Search Endpoints

### `GET /api/search`

Query params:

- `q` (string, required for non-empty results)
- `type` (`all` | `song` | `artist` | `album` | `playlist`, default `all`)
- `limit` (number, clamped server-side)

Notes:

- `type=playlist` currently returns an empty array.
- response is a mixed array for `type=all`.

Typical item variants:

- track-like (`type: "song"`, includes `videoId`)
- artist summary (`type: "artist"`)
- album summary (`type: "album"`)

### `GET /api/search/suggestions`

Query params:

- `q` (string)

Response:

```json
{ "suggestions": ["query one", "query two"] }
```

## Detail Endpoints

### `GET /api/album/:id`

Path params:

- `id` (YouTube Music album ID, e.g. `MPRE...`)

Returns album detail with track list:

```json
{
  "id": "MPRE...",
  "type": "album",
  "title": "Album Name",
  "artist": "Artist Name",
  "cover": "https://...",
  "tracks": [
    {
      "id": "videoId",
      "type": "song",
      "videoId": "videoId",
      "title": "Track Name",
      "artist": "Artist Name",
      "duration": "3:45",
      "playable": true
    }
  ]
}
```

### `GET /api/artist/:slugOrId`

Path params:

- `slugOrId` (channel ID `UC...` or human slug)

Returns artist detail:

```json
{
  "id": "UC...",
  "type": "artist",
  "slug": "UC...",
  "humanSlug": "artist-name",
  "name": "Artist Name",
  "topTracks": [],
  "albums": []
}
```

## Home And Discovery Endpoints

### `GET /api/home`

Query params:

- `limit` (number, default and clamp handled server-side)

Response shape:

```json
{
  "featured": [],
  "trending": [],
  "meta": {
    "source": "live",
    "generatedAt": "2026-06-10T00:00:00.000Z"
  }
}
```

### `GET /api/home/featured`

Returns featured cards array used by home hero surfaces.

### `GET /api/trending`

Query params:

- `limit` (1..100)

Returns array of track DTOs.

### `GET /api/genres`

Returns genre cards with a `sampleTrack` payload.

## Charts Endpoints

### `GET /api/charts`

Query params:

- `region` (`global`, `us`, `uk`, `japan`, `india`; aliases normalized)
- `window` (`today`, `this_week`, `this_month`, `all_time`)
- `limit` (1..100)

Response shape:

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

Item fields include rank, title/artist, `videoId`, cover, streams/listeners,
genre hints, and movement metadata (`prevRank`, `weeksOnChart`, `peakRank`).

### `GET /api/charts/artists`

Same query params as `/api/charts`.

Response shape mirrors charts envelope but with artist rows:

- `name`, `thumbnail`, `tracksOnChart`, `monthlyStreams`, `topSong`
- `chartedTracks` (top song rows for expanded UI)

Provider fallback:

- if primary chart providers fail, service can emit YTM fallback payload with
  `meta.source = "ytm-fallback"` and warning text.

## Explore Endpoints

### `GET /api/explore/pulse`

Query params:

- `region` (default `global`)

Response:

- `highlights` list for pulse cards
- `chartWindows` with `today` and `thisWeek` arrays
- `journeys` presets
- `meta` generation context

### `GET /api/explore/radio`

Query params:

- `mood` (optional)
- `genre` (optional)
- `seed` (optional)
- `diversity` (`default` or `high`)
- `limit` (6..60)

Response:

```json
{
  "items": [],
  "seed": {
    "mood": "focus",
    "genre": "ambient",
    "seed": "night drive",
    "diversity": "high"
  },
  "meta": {
    "source": "live",
    "diversity": "high"
  }
}
```

### `GET /api/explore/similar`

Query params:

- `trackId` (required)
- `limit` (4..30)

Returns:

- `items` array of similar/recommended tracks
- optional `anchor` info
- `meta`

Validation:

- missing `trackId` => `400 { "error": "trackId is required" }`

### `GET /api/explore/journeys/:id`

Path params:

- `id` journey preset ID

Query params:

- `region` (optional)

Returns journey metadata + `items`.

## Lyrics Endpoint

### `GET /api/lyrics`

Query params:

- `title` and `artist`, or
- `videoId` (aliases accepted: `id`, `trackId`)
- optional `duration` (seconds)

Validation:

- if neither `title+artist` nor `videoId` present:
  `400 { "error": "title+artist or videoId is required" }`

Success payload:

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

No lyrics:

- `404 { "error": "Lyrics not found" }`

Provider failure:

- `502 { "error": "Lyrics provider unavailable" }`

## Error Semantics

### Generic 404

Unknown route or not-found detail payload:

```json
{ "error": "Not found", "path": "/api/..." }
```

### Provider unavailability

Some endpoints return explicit provider errors:

- charts: `502` with provider-unavailable message
- explore endpoints: `502` with endpoint-specific unavailable message
- lyrics: `502` provider unavailable

### Fallback behavior

Not all upstream failures become errors. For many core endpoints, services use
live-or-fallback behavior and return static or alternate data rather than 5xx.

## Related Docs

- [Backend Guide](./backend-guide.md)
- [Data Models and Config](./data-models-and-config.md)
- [Troubleshooting](./troubleshooting.md)
