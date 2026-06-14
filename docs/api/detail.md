# API · Album & Artist Detail

> **What you'll learn here:** the album and artist detail endpoints that power the album/artist pages.

| | |
|--|--|
| **Route file** | `server/src/routes/detail.routes.js` |
| **Controller** | `server/src/controllers/detail.controller.js` |
| **Backed by** | YouTube Music with static catalog fallback |
| **Rate limit** | `detailLimiter` (90/min) |

---

## `GET /api/album/:id`

Returns album detail.

**Auth:** Public.

**Path params:** `id` (string) — the album ID.

**Response:** an album detail DTO:

- Summary fields: `id`, `type`, `title`, `artist`, `artistId`, `artistSlug`, `artistHumanSlug`, `year`, `thumbnail`, `playlistId`
- Detail fields: `label`, `cover`, and `tracks[]` (each a track DTO with a `playable` flag)

**Errors:** `404` `{ error: "Not found", path }` if the album can't be found; `429`; `500`.

**Called by:** `getAlbum()` → [Album page](../pages/album.md), the search `RelatedRail`, `use-route-prefetch.js`, and the [Library page](../pages/library.md) (on-demand tracklist fetch for liked albums).

---

## `GET /api/artist/:slugOrId`

Returns artist detail. Accepts **either** a YouTube channel ID **or** a human slug (the slug is resolved via an artist search).

**Auth:** Public.

**Path params:** `slugOrId` (string).

**Response:** an artist detail DTO:

```json
{
  "id": "UC...",
  "type": "artist",
  "slug": "...",
  "humanSlug": "daft-punk",
  "name": "Daft Punk",
  "thumbnail": "https://...",
  "cover": "https://...",
  "bio": "...",
  "topTracks": [ /* track DTOs */ ],
  "albums": [ /* album summaries */ ]
}
```

**Errors:** `404`; `429`; `500`.

**Called by:** `getArtist()` → [Artist page](../pages/artist.md), [Home page](../pages/home.md) (spotlight), search `RelatedRail`, `use-route-prefetch.js`.

## Key things to remember

- The artist endpoint accepts **a slug or an ID** — the backend resolves slugs through search.
- Both endpoints fall back to the static catalog when the upstream is unavailable.
