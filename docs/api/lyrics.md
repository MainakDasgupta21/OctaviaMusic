# API · Lyrics

> **What you'll learn here:** the lyrics proxy endpoint, its two lookup modes, and how it distinguishes "no lyrics" from "provider down".

| | |
|--|--|
| **Route file** | `server/src/routes/lyrics.routes.js` |
| **Controller** | `server/src/controllers/lyrics.controller.js` |
| **Backed by** | LRCLib (with optional YouTube oEmbed metadata lookup) — see [../third-party-services.md](../third-party-services.md) |
| **Rate limit** | `lyricsLimiter` (60/min) |

---

## `GET /api/lyrics`

Proxies LRCLib for synced (LRC) or plain lyrics.

**Auth:** Public.

**Query parameters** (one of two modes required):

| Mode | Params |
|------|--------|
| A | `title` + `artist` (strings) |
| B | `videoId` (also accepts `id` or `trackId` as aliases) |

Optional: `duration` (number, seconds) — helps LRCLib match the right version.

**Response (200):**

```json
{
  "id": null,
  "trackName": "...",
  "artistName": "...",
  "duration": 213,
  "plainLyrics": "...",
  "syncedLyrics": "[00:12.34] line...",
  "instrumental": false
}
```

`syncedLyrics` is LRC-format (timestamped) when available; the frontend parses it with `src/lib/lrc.js`.

**Errors:**

| Status | Body | Meaning |
|--------|------|---------|
| `400` | `{ error: "title+artist or videoId is required" }` | Neither mode supplied |
| `404` | `{ error: "Lyrics not found" }` | This song genuinely has no lyrics |
| `502` | `{ error: "Lyrics provider unavailable" }` | LRCLib is down |
| `429` | — | Rate limited |

> **Why split 404 vs 502?** So the UI can say "no lyrics for this track" (404) versus "couldn't reach the lyrics service, try again" (502). The `LyricsPanel` does not retry on a 404.

**Called by:** `getLyrics()` → `LyricsPanel.jsx` (maps to `syncedRaw`, `plain`, `instrumental`). See [../components/player.md](../components/player.md).

## Key things to remember

- Two lookup modes: **title+artist** or **videoId**.
- A `404` means "no lyrics exist"; a `502` means "service unavailable" — they're handled differently by the UI.
