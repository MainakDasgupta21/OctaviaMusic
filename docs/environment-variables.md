# Environment Variables

> **What you'll learn here:** every environment variable Octavia reads, what it controls, whether it's required, what breaks if it's wrong, an example value, and where in the code it's used. The authoritative template is `.env.example` at the repo root.

---

## How env vars are loaded

- **One file, both apps.** There is a single `.env` at the **repository root**.
- **Frontend (Vite):** only variables prefixed with **`VITE_`** are exposed to browser code, read via `import.meta.env`. They are baked in at **build time**.
- **Backend (Express):** the scripts in `server/package.json` run Node with `--env-file=../.env`, so the backend loads the **root** `.env` (not `server/.env`). These are read at **runtime** via `process.env`.

> **Security:** Never commit a real `.env`. Only `.env.example` is tracked. `VITE_*` values are public (they ship in the browser bundle) — never put secrets in a `VITE_` variable.

---

## Frontend variables (`VITE_*`)

### `VITE_API_BASE`
- **Controls:** the base URL the frontend uses for all backend API calls.
- **Required?** Optional (has smart defaults).
- **Default:** `http://localhost:5000/api` in dev; same-origin `/api` in production.
- **If missing/wrong:** API calls go to the wrong place → the whole app shows offline/error states. In production with no value set, it logs a warning and falls back to `/api`.
- **Example:** `VITE_API_BASE=http://localhost:5000/api` (dev) or `https://api.octavia.app/api` (prod).
- **Used in:** `src/lib/api.js` (`readApiBase`).

### Explore feature flags (all optional, default off unless noted)
These toggle parts of the Explore experience. They're read in `src/lib/feature-flags.js`.

| Variable | Controls | Example |
|----------|----------|---------|
| `VITE_EXPLORE_V2_ENABLED` | Onboarding quiz, surprise, swipe deck, journeys, mood board | `true` |
| `VITE_EXPLORE_LOOPS_ENABLED` | Gamification: XP, streaks, daily challenge, loop-win modal | `true` |
| `VITE_EXPLORE_SOCIAL_ENABLED` | Community strip + journey sharing | `true` |
| `VITE_EXPLORE_INFINITE_ENABLED` | The `/explore/flow` infinite-swipe entry | `true` |
| `VITE_EXPLORE_DISCOVERY_V3_ENABLED` | Multi-strategy discovery feed + seen-track memory | `true` |

- **If missing:** the corresponding Explore features stay hidden/disabled; the rest of the app is unaffected.
- **Used in:** `src/lib/feature-flags.js`, consumed by `src/pages/ExplorePageV2.jsx`, `ExploreFlowPage.jsx`, and explore hooks.

---

## Backend — Database

### `MONGODB_URI`
- **Controls:** the MongoDB connection string.
- **Required?** **Required in production.** Optional in dev (the server still starts, but auth/library routes return 503).
- **If missing:** in dev, a warning is logged and `/auth/*` + `/me/*` return `503 Service Unavailable`; in production, the server **refuses to start**.
- **Example:** `mongodb+srv://user:pass@cluster0.abcd.mongodb.net/octavia`
- **Used in:** `server/src/db/connect.js`, `server/src/config/index.js`.

---

## Backend — Auth & cookies

### `JWT_ACCESS_SECRET`
- **Controls:** the signing secret for short-lived **access** tokens.
- **Required?** **Required in production** (must be ≥ 32 bytes). Has a dev fallback.
- **If missing/weak:** production startup fails (`assertAuthConfig`); tokens can't be trusted.
- **Example:** a 48-byte hex string from `crypto.randomBytes(48).toString('hex')`.
- **Used in:** `server/src/utils/auth.js`, `auth.service.js`.

### `JWT_REFRESH_SECRET`
- **Controls:** the signing secret for long-lived **refresh** tokens.
- **Required?** **Required in production**, must be ≥ 32 bytes, and **must differ** from the access secret.
- **If missing/weak/same as access:** production startup fails.
- **Example:** a *different* 48-byte hex string.
- **Used in:** same as above.

### `JWT_ACCESS_TTL`
- **Controls:** access token lifetime.
- **Required?** Optional. **Default:** `15m`.
- **If wrong:** too long = larger window if a token leaks; too short = more frequent refreshes.
- **Example:** `15m`, `1h`. **Used in:** `server/src/config/index.js`.

### `JWT_REFRESH_TTL`
- **Controls:** refresh token (and "stay logged in") lifetime.
- **Required?** Optional. **Default:** `30d`.
- **Example:** `30d`, `7d`. **Used in:** `server/src/config/index.js`.

### `BCRYPT_ROUNDS`
- **Controls:** password-hash cost factor.
- **Required?** Optional. **Default:** `12` (also the enforced minimum).
- **If too low:** weaker hashes (min 12 is enforced regardless). Too high = slow logins.
- **Example:** `12`. **Used in:** `server/src/models/User.js`, `config`.

### `COOKIE_SECURE`
- **Controls:** whether auth cookies require HTTPS (`Secure` flag).
- **Required?** Optional. **Default:** `true` in production; should be `false` for local http dev.
- **If wrong locally:** with `true` over http, the browser drops the cookies → you appear logged out / 401 loops.
- **Example:** `false` (dev), `true` (prod). **Used in:** `server/src/utils/auth.js`.

### `COOKIE_DOMAIN`
- **Controls:** the `Domain` attribute on auth cookies.
- **Required?** Optional. **Default:** unset (host-only cookie).
- **When to set:** when the frontend and API share a parent domain (e.g. `.octavia.app`).
- **Example:** `.octavia.app`. **Used in:** `server/src/utils/auth.js`.

### `COOKIE_SAMESITE`
- **Controls:** the cookie `SameSite` attribute.
- **Required?** Optional. **Default:** auto — `none` when secure, else `lax`.
- **Example:** `lax`, `none`, `strict`. **Used in:** `server/src/utils/auth.js`.

### `CORS_ORIGIN`
- **Controls:** comma-separated allowlist of origins permitted to call the API with credentials.
- **Required?** Recommended in production (localhost is always allowed automatically).
- **If missing in prod:** a warning is logged and cross-origin browser requests from your real frontend may be blocked.
- **Example:** `https://octavia.app,https://www.octavia.app`. **Used in:** `server/src/middleware/cors.js`, `config`.

---

## Backend — Rate limiting

All optional. Each family has a window (ms) and a max count. Defaults shown.

| Variable | Default | Controls |
|----------|---------|----------|
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` | `60000` / `10` | Login/refresh limiter (keyed by ip+email). Register is capped tighter at 5. |
| `HOME_RATE_LIMIT_WINDOW_MS` / `HOME_RATE_LIMIT_MAX` | `60000` / `120` | `/home`, `/trending`, `/explore/pulse`, `/explore/journeys` |
| `SEARCH_RATE_LIMIT_WINDOW_MS` / `SEARCH_RATE_LIMIT_MAX` | `60000` / `240` | `/search`, `/charts`, `/genres`, `/explore/radio`, `/explore/similar` |
| `DETAIL_RATE_LIMIT_WINDOW_MS` / `DETAIL_RATE_LIMIT_MAX` | `60000` / `90` | `/album/:id`, `/artist/:id` |
| `LYRICS_RATE_LIMIT_WINDOW_MS` / `LYRICS_RATE_LIMIT_MAX` | `60000` / `60` | `/lyrics` |

- **If too low:** legitimate users get `429 Too Many Requests`. **If too high:** less protection against abuse.
- **Used in:** `server/src/middleware/rate-limiters.js`.

---

## Backend — Admin bootstrap

### `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`
- **Controls:** the admin account created by `npm --prefix server run seed:admin`.
- **Required?** Only when running the seed script. Password must be ≥ 8 chars.
- **Used in:** `server/scripts/seed-admin.js`.

---

## Backend — YouTube Music tuning (all optional)

| Variable | Default | Controls |
|----------|---------|----------|
| `YTM_CHARTS_PLAYLIST` | built-in playlist id | Source playlist for `/charts` fallback |
| `YTM_TRENDING_PLAYLIST` | built-in playlist id | Source playlist for `/trending` |
| `YTM_CACHE_SEARCH_MIN` | `5` | Search result cache TTL (minutes) |
| `YTM_CACHE_DETAIL_MIN` | `30` | Album/artist detail cache TTL |
| `YTM_CACHE_CHARTS_MIN` | `60` | Charts cache TTL |
| `YTM_CACHE_GENRES_MIN` | `60` | Genres cache TTL |
| `YTM_CACHE_MAX_ENTRIES` | `500` | Max LRU cache entries |
| `YTM_REQUEST_TIMEOUT_MS` | `10000` | Per-request timeout to YTM |
| `YTM_REQUEST_RETRY_COUNT` | `1` | Retries on failure |
| `YTM_WARMUP` | (warmup on) | Set `false` to skip boot warmup |

- **If wrong:** mostly affects freshness vs speed; bad playlist ids fall back to a broad search.
- **Used in:** `server/lib/ytmusic.js`, `server/index.js`.

---

## Backend — Charts data (Last.fm + MusicBrainz)

### `LASTFM_API_KEY`
- **Controls:** access to the Last.fm API.
- **Required?** **Required for `/api/charts` and `/api/charts/artists`** to return real data.
- **If missing:** chart endpoints can't run the real pipeline (fall back to a YTM playlist chart where possible).
- **Example:** a 32-char key from https://www.last.fm/api/account/create.
- **Used in:** `server/lib/lastfm.js`, `server/lib/charts-service.js`.

Other optional Last.fm / MusicBrainz knobs:

| Variable | Default | Controls |
|----------|---------|----------|
| `LASTFM_CACHE_CHARTS_MS` | `300000` (5m) | Chart response cache |
| `LASTFM_CACHE_INFO_MS` | `1800000` (30m) | Track/artist info cache |
| `LASTFM_CACHE_TAGS_MS` | `21600000` (6h) | Tags cache |
| `LASTFM_TIMEOUT_MS` | `12000` | Request timeout |
| `LASTFM_RETRY_COUNT` | `1` | Retries |
| `MUSICBRAINZ_MIN_INTERVAL_MS` | `1000` | Min gap between MB requests (their rate limit) |
| `MUSICBRAINZ_CACHE_TTL_MS` | `86400000` (24h) | MB cache TTL |
| `CHART_CACHE_*` | 200 entries | Chart cache sizing |

> **Spotify is intentionally NOT used.** As of 2025 its Web API requires an active Premium subscription on the developer's account, so it's unavailable to free-tier developers. Last.fm + YouTube Music cover every field the charts page renders.

---

## Backend — Explore caching (all optional)

| Variable | Default | Controls |
|----------|---------|----------|
| `EXPLORE_CACHE_MAX_ENTRIES` | `300` | Max explore cache entries |
| `EXPLORE_PULSE_TTL_MS` | `120000` (2m) | `/explore/pulse` cache |
| `EXPLORE_RADIO_TTL_MS` | `90000` | `/explore/radio` cache |
| `EXPLORE_SIMILAR_TTL_MS` | `300000` (5m) | `/explore/similar` cache |
| `EXPLORE_JOURNEY_TTL_MS` | `180000` (3m) | `/explore/journeys` cache |

- **Used in:** `server/lib/explore-service.js`.

---

## Backend — Lyrics (LRCLib, all optional)

| Variable | Default | Controls |
|----------|---------|----------|
| `LYRICS_BASE_URL` | `https://lrclib.net` | LRCLib base URL |
| `LYRICS_YT_OEMBED_BASE_URL` | YouTube oEmbed | Fallback title/artist lookup |
| `LYRICS_TIMEOUT_MS` | `8000` | Request timeout |
| `LYRICS_CACHE_MIN` | `180` | Cache for found lyrics (minutes) |
| `LYRICS_CACHE_MISS_MIN` | `5` | Cache for "no lyrics" results |
| `LYRICS_CACHE_MAX_ENTRIES` | `500` | Max cache entries |
| `LYRICS_CLIENT_ID` | `Octavia (...)` | User-agent sent to LRCLib |

- **Used in:** `server/lib/lyrics.js`.

---

## Backend — Misc

| Variable | Default | Controls |
|----------|---------|----------|
| `PORT` | `5000` | Backend listen port |
| `NODE_ENV` | (unset) | `production` enables prod assertions/secure cookies |
| `HOME_CACHE_TTL_SEC` | `300` | HTTP `Cache-Control` TTL for cacheable music responses |

---

## Minimal configs (copy-paste)

**Browse-only (no login):**
```bash
VITE_API_BASE=http://localhost:5000/api
LASTFM_API_KEY=your-lastfm-key
```

**Full local dev (login + library):**
```bash
VITE_API_BASE=http://localhost:5000/api
LASTFM_API_KEY=your-lastfm-key
MONGODB_URI=mongodb+srv://user:pass@cluster/octavia
JWT_ACCESS_SECRET=<48-byte hex>
JWT_REFRESH_SECRET=<different 48-byte hex>
COOKIE_SECURE=false
CORS_ORIGIN=http://localhost:8080
```

---

## Key things to remember

- **`VITE_*` = public, build-time, browser.** Never put secrets there.
- **Backend reads the root `.env`** via `--env-file=../.env`.
- **In production, three vars are mandatory:** `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (the server won't start without them).
- **`LASTFM_API_KEY` is the only external key you need** — everything else (YTM, MusicBrainz, LRCLib) is keyless.
- **Set `COOKIE_SECURE=false` for local http dev** or auth cookies won't stick.
