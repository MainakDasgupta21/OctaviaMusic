# API · Genres

> **What you'll learn here:** the single genre-tiles endpoint.

| | |
|--|--|
| **Route file** | `server/src/routes/genres.routes.js` |
| **Controller** | `server/src/controllers/genres.controller.js` |
| **Rate limit** | `searchLimiter` (240/min) |

---

## `GET /api/genres`

Returns genre browse tiles, each with a live YouTube Music sample track.

**Auth:** Public.

**Response:** `GenreDTO[]`:

```json
[
  {
    "id": "pop",
    "label": "Pop",
    "thumbnail": "https://...",
    "from": "from-pink-500/60",
    "to": "to-rose-700/60",
    "sampleTrack": { /* track DTO */ }
  }
]
```

The `from`/`to` fields are Tailwind gradient classes used to color each tile (see [../styling-guide.md](../styling-guide.md)).

**Errors:** `429`; internal fallback to the static catalog on upstream failure.

**Called by:** `getGenres()` → [Genres page](../pages/genres.md), [Home page](../pages/home.md), `useExploreData.js`.

## Key things to remember

- Each genre ships a **playable `sampleTrack`** so the UI can preview without another request.
- The `from`/`to` gradient classes come from the server, keeping tile colors consistent everywhere.
