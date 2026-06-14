# API · Search

> **What you'll learn here:** the catalog search endpoint and the autocomplete-suggestions endpoint.

| | |
|--|--|
| **Route file** | `server/src/routes/search.routes.js` |
| **Controller** | `server/src/controllers/search.controller.js` |
| **Backed by** | YouTube Music (`ytmusic-api`) with a static catalog fallback — see [../third-party-services.md](../third-party-services.md) |

---

## `GET /api/search`

Searches YouTube Music and returns a **flat array** of track/album/artist DTOs.

**Auth:** Public · `searchLimiter` (240/min).

**Query parameters:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `q` | string | yes (effectively) | Empty query returns `[]` |
| `type` | string | no (default `all`) | `all` \| `song` \| `artist` \| `album` \| `playlist` (`playlist` always returns `[]`) |
| `limit` | number | no (default 30) | Clamped to **1–60** |
| `filter` | string | no | Alias accepted for `type` |

**Response:** an array of DTOs (`TrackDTO[]`, `AlbumSummaryDTO[]`, `ArtistSummaryDTO[]`, or mixed for `type=all`). Example track DTO:

```json
{
  "id": "dQw4w9WgXcQ",
  "type": "song",
  "videoId": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "artist": "Rick Astley",
  "duration": "3:33",
  "thumbnail": "https://...",
  "playable": true
}
```

**Errors:** `429` (rate limit); `500` on unhandled failure (upstream failures fall back to the static catalog rather than erroring).

**Called by:** `searchMusic()` → [Search page](../pages/search.md), `use-instant-search.js` (TopBar), `discovery-strategies.js`.

---

## `GET /api/search/suggestions`

Returns YouTube Music autocomplete suggestions.

**Auth:** Public · `searchLimiter`.

**Query parameters:** `q` (string) — empty query returns `{ suggestions: [] }`.

**Response:**

```json
{ "suggestions": ["term one", "term two"] }
```

**Errors:** `429`; upstream failures degrade to `[]` (best-effort, never throws to the client).

**Called by:** `getSearchSuggestions()` → `use-search-suggestions.js` (used by both the Search page and the TopBar search popover).

## Key things to remember

- `GET /api/search` returns a **bare array**, not an envelope.
- Searching is best-effort: upstream failures fall back to the static catalog, so it rarely returns an error.
- `videoId` is the field the player needs to actually stream a track.
