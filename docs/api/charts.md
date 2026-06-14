# API · Charts

> **What you'll learn here:** the song-chart and artist-chart endpoints, their region/window options, the rich response envelope, and the multi-source pipeline behind them.

| | |
|--|--|
| **Route file** | `server/src/routes/charts.routes.js` |
| **Controller** | `server/src/controllers/charts.controller.js` |
| **Backed by** | Last.fm rankings + MusicBrainz enrichment + YouTube Music playables (`charts-service.js`) |
| **Rate limit** | `searchLimiter` (240/min) |

> Charts need `LASTFM_API_KEY` for full fidelity; without it they degrade to a YouTube Music playlist source. See [../third-party-services.md](../third-party-services.md).

---

## `GET /api/charts`

Ranked **song** chart.

**Auth:** Public.

**Query parameters:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `region` | string | `global` | `global`, `india`, `us`, `uk`, `japan` (+ aliases `in`, `jp`, `gb`) |
| `window` | string | `this_week` | `today`, `this_week`, `this_month`, `all_time` |
| `limit` | number | 50 | Clamped **1–100** |

**Response:**

```json
{
  "items": [
    {
      "id": "...", "rank": 1, "prevRank": 2,
      "title": "...", "artist": "...", "videoId": "...", "playable": true,
      "streams": 1234567, "genre": "pop",
      "weeksOnChart": 5, "peakRank": 1
    }
  ],
  "lastUpdated": "2026-06-15T00:00:00.000Z",
  "meta": { "source": "lastfm", "mode": "songs", "region": "global", "window": "this_week", "fetchedAt": "...", "stale": false, "warning": null }
}
```

**Errors:** `502` `{ error: "Chart data provider unavailable", detail }` when upstreams fail; `429`.

**Called by:** `getCharts()` → `useChartData.js` ([Charts page](../pages/charts.md)), [Home page](../pages/home.md), `discovery-strategies.js`.

---

## `GET /api/charts/artists`

Ranked **artist** chart (derived from the same pipeline).

**Auth:** Public · same query params as `/api/charts`.

**Response:** same envelope; each item adds artist fields: `name`, `avatarUrl`, `tracksOnChart`, `topSong`, `chartedTracks[]`, `nationality`, `genre`, `listeners`, `playcount`.

**Errors:** `502`; `429`.

**Called by:** `getChartsArtists()` → `useChartData.js`.

## Key things to remember

- Both endpoints return an envelope `{ items, lastUpdated, meta }`.
- `meta.stale` / `meta.warning` tell the UI to show a "data may be out of date" banner.
- `meta.source` reveals whether the data came from Last.fm or the YTM fallback.
