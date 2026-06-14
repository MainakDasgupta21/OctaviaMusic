# API · Explore (Discovery)

> **What you'll learn here:** the four discovery endpoints — pulse, radio, similar, and journeys — that power Explore and the smart queue.

| | |
|--|--|
| **Route file** | `server/src/routes/explore.routes.js` |
| **Controller** | `server/src/controllers/explore.controller.js` |
| **Backed by** | `explore-service.js` (Last.fm similarity + YouTube Music + charts) |

---

## `GET /api/explore/pulse`

The Explore landing "pulse": highlights, chart windows, and journey presets.

**Auth:** Public · `homeLimiter`.

**Query:** `region` (string, default `global`).

**Response:**

```json
{
  "highlights": [ { "id", "title", "subtitle", "thumbnail", "statLabel", "statValue", "track" } ],
  "chartWindows": { "today": [], "thisWeek": [] },
  "journeys": [ { "id", "title", "blurb", "mood", "genre", "seed" } ],
  "meta": { "source", "generatedAt" }
}
```

**Errors:** `502` `{ error: "Explore pulse unavailable", detail }`; `429`.

**Called by:** `getExplorePulse()` → `useExploreSocial.js`.

---

## `GET /api/explore/radio`

Generates a mood/genre/seed-based discovery playlist. This is the engine behind the "smart queue", "Surprise Me", and Explore Flow.

**Auth:** Public · `searchLimiter`.

**Query parameters:**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `mood`, `genre`, `seed` | string | — | Optional seeds |
| `region` | string | `global` | |
| `diversity` | string | `default` | `high` or `default` |
| `strategy` | string | `default` | one of `artist`, `keyword`, `alphabet`, `trending`, `fresh`, `classic`, `genre`, `mood`, `hidden`, `personalized`, `mixed`, `default` |
| `seedArtists` | string | — | comma-separated, max 5 |
| `limit` | number | 24 | Clamped **6–60** |

**Response:**

```json
{
  "items": [ /* track DTOs */ ],
  "seed": { "mood", "genre", "seed", "diversity", "strategy", "seedArtists" },
  "meta": { "source", "diversity", "strategy", "generatedAt" }
}
```

**Errors:** `502`; `429`.

**Called by:** `getExploreRadio()` → `PlayerContext` (smart queue), `useInfiniteDiscovery.js` ([Explore Flow](../pages/explore-flow.md)), [Home page](../pages/home.md), [Explore page](../pages/explore.md), `discovery-strategies.js`.

---

## `GET /api/explore/similar`

Returns tracks similar to a seed track (Last.fm similarity + YTM).

**Auth:** Public · `searchLimiter`.

**Query parameters:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `trackId` | string | **yes** | Missing → `400 { error: "trackId is required" }` |
| `limit` | number | no (default 12) | Clamped **4–30** |

**Response:**

```json
{ "items": [], "anchor": { "title", "artist", "trackId" }, "meta": { "source", "generatedAt" } }
```

**Errors:** `400`; `502`; `429`.

**Called by:** `getExploreSimilar()` → `PlayerContext`, `useInfiniteDiscovery.js`.

---

## `GET /api/explore/journeys/:id`

Resolves a curated journey preset into a radio queue for its mood/genre/seed.

**Auth:** Public · `homeLimiter`.

**Path params:** `id` (string, e.g. `journey-night-drive`) — empty → `400`.
**Query:** `region` (optional, default `global`).

**Response:** `{ id, title, blurb, mood, genre, seed, region, items: [...], meta: {...} }`.

**Errors:** `400`; `502`; `429`.

**Called by:** `getExploreJourney()` → `useExploreSocial.js`.

## Key things to remember

- **`/explore/radio`** is the core discovery engine — many features funnel through it.
- **`/explore/similar`** is the only one that **requires** a param (`trackId`).
- All return `502` when the upstream music data providers are unavailable.
