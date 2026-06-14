# API Reference

> **What you'll learn here:** every backend REST endpoint, grouped by route file — its method, path, inputs, response shape, errors, auth requirements, and which frontend code calls it.

The backend is an Express REST API. All routers are mounted under **`/api`** (see `server/src/routes/index.js` and `server/src/app.js`). The flow for every request is **route → controller → service → client/lib**; see [../architecture.md](../architecture.md).

## Endpoint groups

| Group | Base | What it serves | Doc |
|-------|------|----------------|-----|
| Health | `/health`, `/api/health` | Liveness checks | (below) |
| Search | `/api/search` | Catalog search + suggestions | [search.md](./search.md) |
| Detail | `/api/album`, `/api/artist` | Album & artist detail | [detail.md](./detail.md) |
| Charts | `/api/charts` | Song & artist charts | [charts.md](./charts.md) |
| Home | `/api/home`, `/api/trending` | Home feed & trending | [home.md](./home.md) |
| Genres | `/api/genres` | Genre tiles | [genres.md](./genres.md) |
| Explore | `/api/explore/*` | Discovery radio, similar, pulse, journeys | [explore.md](./explore.md) |
| Lyrics | `/api/lyrics` | Synced/plain lyrics | [lyrics.md](./lyrics.md) |
| Auth | `/api/auth/*` | Register/login/refresh/logout/me | [auth.md](./auth.md) |
| Me (library) | `/api/me/*` | Favorites, playlists, history, settings… | [me.md](./me.md) |
| Users | `/api/users/me` | Profile/avatar updates | [users.md](./users.md) |
| Playlists (public) | `/api/playlists/shared/*` | Shared playlist view & copy | [playlists.md](./playlists.md) |
| Admin | `/api/admin/*` | User administration | [admin.md](./admin.md) |

## Global middleware (order in `app.js`)

1. `trust proxy = 1`
2. **CORS** (`createCorsMiddleware`) — `credentials: true`, origin from config
3. **Helmet** (security headers)
4. **cookie-parser**
5. **compression** (gzip, threshold 1024 bytes)
6. **`express.json`** — body limit **1 MB**
7. **`express.urlencoded`** — `extended: false`
8. API routes at `/api`
9. **404 handler** — `{ error: "Not found", path }`
10. **`errorHandler`** — standardized JSON error envelope

## Health endpoints

| Method + path | Response | Notes |
|---|---|---|
| `GET /health` | `{ "status": "ok" }` | Defined inline in `app.js` (not under `/api` router) |
| `GET /api/health` | `{ "status": "ok" }` | Same shape |

Frontend: `getServerHealth()` → `api.get('/health')`, used by `use-server-health.js` (an offline banner that's [built but not yet wired in](../known-issues.md)).

## Standard error envelope

All errors flow through `errorHandler` and look like:

```json
{ "error": "AuthError", "message": "...", "details": {} }
```

| Status | `error` name | When |
|--------|--------------|------|
| 400 | `ValidationError` | Zod / validation failure |
| 401 | `AuthError` | Missing/invalid JWT, bad credentials |
| 403 | `ForbiddenError` | CSRF mismatch, insufficient role |
| 404 | `NotFoundError` | Resource not found, bad ID |
| 409 | `ConflictError` | Duplicate key (e.g. email/username) |
| 429 | *(rate limiter)* | Too many requests |
| 502 | provider errors | Upstream music API unavailable |
| 503 | `ServiceUnavailableError` | MongoDB not connected (`requireDatabaseConnection`) |
| 500 | `InternalServerError` | Unhandled error |

## Rate limiters (`middleware/rate-limiters.js`)

| Limiter | Window | Max | Applied to |
|---------|--------|-----|-----------|
| `homeLimiter` | 60s | 120 | home, explore/pulse, explore/journeys |
| `searchLimiter` | 60s | 240 | search, charts, genres, explore/radio, explore/similar |
| `detailLimiter` | 60s | 90 | album, artist |
| `lyricsLimiter` | 60s | 60 | lyrics |
| `authLimiter` | 60s | 10 | login, refresh (keyed by `ip:email`) |
| `authRegisterLimiter` | 60s | 5 | register (keyed by `ip`) |

## Authentication & CSRF (summary)

- A request is authenticated via an **`Authorization: Bearer <token>`** header **or** the **`accessToken`** HttpOnly cookie.
- **`requireAuth`** → 401 if absent/invalid. **`requireRole('admin')`** → 403. **`requireOwnership(...)`** → 404 if you don't own the resource.
- **`requireCsrf`** runs on POST/PATCH/PUT/DELETE **only when a cookie session is present**; it requires a matching `csrfToken` cookie + `x-csrf-token` header. Bearer-token clients skip CSRF.

Full details in [../authentication.md](../authentication.md).

## Auth matrix (quick reference)

| Group | Public | Auth | Admin | CSRF (cookie) | Rate limit |
|-------|:--:|:--:|:--:|:--:|:--:|
| search, detail, charts, home, genres, explore, lyrics | ✓ | | | | ✓ |
| auth: register/login/refresh | ✓ | | | | ✓ |
| auth: logout/logout-all/change-password | | ✓ | | ✓ | |
| auth/me | | ✓ | | | |
| me/* | | ✓ | | ✓ (mutations) | |
| users/me | | ✓ | | ✓ | |
| playlists/shared (GET) | ✓ | | | | |
| playlists/shared/copy | | ✓ | | ✓ | |
| admin/* | | ✓ | ✓ | ✓ (mutations) | |

## Frontend wrapper map (`src/lib/api.js`)

The public/catalog and auth endpoints have named wrappers in `src/lib/api.js`. The `/me/*`, `/users/me`, `/auth/change-password`, and `/admin/*` endpoints are called via the raw `api` axios instance from inside context providers.

| Wrapper | Endpoint |
|---------|----------|
| `searchMusic` | `GET /search` |
| `getSearchSuggestions` | `GET /search/suggestions` |
| `getAlbum` | `GET /album/:id` |
| `getArtist` | `GET /artist/:slugOrId` |
| `getCharts` / `getChartsArtists` | `GET /charts` / `GET /charts/artists` |
| `getTrending` | `GET /trending` |
| `getHomeFeed` / `getHomeFeatured` | `GET /home` / `GET /home/featured` |
| `getGenres` | `GET /genres` |
| `getExplorePulse` / `getExploreRadio` / `getExploreSimilar` / `getExploreJourney` | `GET /explore/*` |
| `getLyrics` | `GET /lyrics` |
| `getSharedPlaylist` / `copySharedPlaylist` | `GET` / `POST /playlists/shared/:shareId(/copy)` |
| `registerAccount` / `loginAccount` / `refreshSession` / `logoutSession` / `logoutAllSessions` / `getCurrentUser` | `POST /auth/*`, `GET /auth/me` |
