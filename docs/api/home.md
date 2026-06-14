# API · Home & Trending

> **What you'll learn here:** the home-feed, featured-cards, and trending endpoints.

| | |
|--|--|
| **Route files** | `server/src/routes/home.routes.js` |
| **Controllers** | `server/src/controllers/home.controller.js`, `trending.controller.js` |
| **Rate limit** | `homeLimiter` (120/min) for home/trending |

---

## `GET /api/home`

The unified home feed: featured hero cards + trending tracks in one call.

**Auth:** Public.

**Query parameters:** `limit` (number, default 20) — clamped **6–100**.

**Response:**

```json
{
  "featured": [
    { "id": "...", "eyebrow": "...", "title": "...", "description": "...", "cover": "https://...", "track": { /* track DTO */ }, "to": "/album/..." }
  ],
  "trending": [ /* track DTOs */ ],
  "meta": { "source": "live", "generatedAt": "..." }
}
```

**Errors:** `429`; falls back internally on live failure (`meta.source: "fallback"`).

**Called by:** `getHomeFeed()` → [Home page](../pages/home.md). If it 404s, the frontend composes the feed from `/home/featured` + `/trending` instead.

---

## `GET /api/home/featured`

Featured hero cards only (top 3, derived from charts).

**Auth:** Public. **Response:** a `featured[]` array (same card shape as above). **Errors:** `429`.

**Called by:** `getHomeFeatured()` (used inside the legacy `getHomeFeed` compose path).

---

## `GET /api/trending`

A list of trending tracks.

**Auth:** Public · `homeLimiter`.

**Query parameters:** `limit` (number, default 20) — clamped **1–100**.

**Response:** `TrackDTO[]` (a bare array). **Errors:** `429`.

**Called by:** `getTrending()` → [Trending page](../pages/trending.md), `useExploreData.js`, `discovery-strategies.js`.

## Key things to remember

- `GET /api/home` bundles featured + trending to **save a round-trip**; the separate endpoints are the legacy fallback.
- `GET /api/trending` returns a **bare array**; `GET /api/home` returns an **envelope**.
