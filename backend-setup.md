# Backend Setup Guide

This music player frontend talks to a small Node/Express server in
[`server/`](server/) running on `http://localhost:5000`. The server is a thin
adapter around the unofficial [`ytmusic-api`](https://www.npmjs.com/package/ytmusic-api)
package — no API key, no Google project, no quotas to manage.

## Quick start

```bash
cd server
npm install
npm run dev   # http://localhost:5000
```

That's it. The first request triggers a one-time InnerTube handshake; results
are then cached in memory so repeat requests are instant.

## Architecture

```
React (axios) ──► Express ──► server/lib/ytmusic.js ──► ytmusic-api
                                       │
                                       └─► TTL cache + mappers
                                                  │
                                                  └─► server/data/catalog.js (fallback)
```

Every route handler in [`server.js`](server/server.js) wraps its live call in
`liveOrFallback(...)`. When the upstream errors (rate-limit, network blip,
schema drift) the static curated catalog answers instead so the UI keeps
working.

## Required Endpoints

All endpoints return JSON. Errors yield `{ error: 'Not found' }` with status
404 — the frontend's `isNotFoundError` helper switches to an EmptyState on
that signal.

### `GET /api/search?q=<query>&type=<song|artist|album|all>`

Flat array of mixed `{ type: 'song' | 'artist' | 'album', ... }` records.

```json
[
  {
    "id": "dQw4w9WgXcQ",
    "type": "song",
    "videoId": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "artist": "Rick Astley",
    "artistId": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "artistSlug": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "album": "Whenever You Need Somebody",
    "albumId": "MPREb_...",
    "duration": "3:33",
    "thumbnail": "https://lh3.googleusercontent.com/...=w544-h544"
  }
]
```

### `GET /api/album/:id`

`id` is the YouTube Music album browse id (e.g. `MPREb_...`). Returns the
album summary plus a `tracks: TrackDTO[]` array.

### `GET /api/artist/:slugOrId`

`slugOrId` is the YouTube channel id (e.g. `UC...`). Returns the artist
summary plus `topTracks: TrackDTO[]` and `albums: AlbumSummary[]`.

### `GET /api/charts?limit=50`

Top-N tracks with synthesized `rank` + `prev` fields for the UI's
up/down arrows.

### `GET /api/trending?limit=20`

Recent / rising tracks. Same `TrackDTO` shape as charts (no rank fields).

### `GET /api/home/featured`

Three editorial picks built from the charts head, decorated with curated
`eyebrow` / `title` / `description` copy.

### `GET /api/genres`

Static genre defs (gradients + labels) enriched with a live `sampleTrack`.

## Configuration

All optional — see [.env.example](.env.example) for the full list:

| Env var                  | Default                       | What it does                                    |
| ------------------------ | ----------------------------- | ----------------------------------------------- |
| `PORT`                   | `5000`                        | Listen port                                     |
| `YTM_CHARTS_PLAYLIST`    | built-in hits playlist        | YouTube playlist id used for `/api/charts`      |
| `YTM_TRENDING_PLAYLIST`  | built-in hits playlist        | YouTube playlist id used for `/api/trending`    |
| `YTM_CACHE_SEARCH_MIN`   | `5`                           | TTL (min) for `/api/search` responses           |
| `YTM_CACHE_DETAIL_MIN`   | `30`                          | TTL (min) for album/artist responses            |
| `YTM_CACHE_CHARTS_MIN`   | `60`                          | TTL (min) for charts/trending/home              |
| `YTM_CACHE_GENRES_MIN`   | `60`                          | TTL (min) for genre sample tracks               |

## Playback note

`react-player` (in `src/components/layout/FooterPlayer.jsx`) is fed the
`videoId` from each `TrackDTO` and streams directly from YouTube. The server
never proxies media — it only resolves metadata.
