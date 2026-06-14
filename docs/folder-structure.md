# Folder Structure

> **What you'll learn here:** every folder and important file in the project, what lives in it, why it's grouped that way, and when you'd open it. Use this as a map when you're trying to find "where do I change X?"

---

## Top-level layout

```
harmony-hub/
├── index.html              # Frontend HTML entry; loads fonts, sets meta/SEO
├── package.json            # Frontend deps + scripts (dev/build/test/lint)
├── package-lock.json       # Locked frontend dependency versions
├── vite.config.ts          # Vite build/dev config (@ alias, port 8080, compression)
├── vitest.config.js        # Frontend test runner config
├── tsconfig.json           # TypeScript project references root
├── tsconfig.app.json       # TS config for app source
├── tsconfig.node.json      # TS config for node-side tooling (vite config)
├── tailwind.config.ts      # Tailwind theme (maps CSS vars → utilities)
├── postcss.config.js       # PostCSS pipeline (tailwind + autoprefixer)
├── components.json         # shadcn/ui generator config
├── eslint.config.js        # ESLint flat config
├── .env.example            # Documented template for all env vars
├── .gitignore              # Files Git ignores (node_modules, .env, dist...)
├── README.md               # Project overview + quick start
├── backend-setup.md        # Backend setup notes (root-level)
├── UX_VALIDATION.md        # Manual UX QA checklist + last run results
├── RESPONSIVE_QA_MATRIX.md # Responsive testing matrix
├── public/                 # Static assets served as-is
├── src/                    # ← Frontend application code
├── server/                 # ← Backend application code
├── tools/                  # Build-time helper scripts (favicon generator)
└── docs/                   # ← This documentation
```

---

## Root config files explained

These small files control how the project builds, lints, and runs. You won't edit them often, but understanding them prevents confusion.

### `index.html`
The single HTML page the browser loads. It sets the page title, SEO/Open Graph meta tags, JSON-LD structured data, favicons, `preconnect`/`dns-prefetch` hints for YouTube + Google Fonts hosts, and loads four Google fonts (Roboto, Roboto Mono, DM Serif Display, Syne Mono). It mounts the app into `<div id="root">` and loads `/src/main.jsx`.
*Open it when:* changing the site title, fonts, favicons, or preconnect hints.

### `package.json` (frontend)
Declares the frontend dependencies and scripts:
- `dev` → start Vite dev server, `build` → production build, `build:dev` → dev-mode build, `preview` → preview the build, `lint` → ESLint, `test` → Vitest watch, `test:run` → Vitest single run.
> The `name` is still `vite_react_shadcn_ts` (the scaffold default). This is cosmetic.

### `vite.config.ts`
Configures the build tool. Key settings:
- `@` alias → `./src` (so `@/components/...` works everywhere).
- Dev server on **port 8080**, host `::` (all interfaces).
- `watch.usePolling: true` — needed because some Windows/networked filesystems miss native file events, which would make HMR serve stale modules.
- Production-only gzip + brotli compression of assets >1 KB.
- `componentTagger()` only in dev (Lovable tooling).
*If removed:* the dev server, `@` imports, and HMR on Windows would break.

### `tailwind.config.ts`
Maps the CSS variables defined in `src/index.css` to Tailwind utility classes (colors like `bg-surface-2`, `text-ink`, fonts, the responsive breakpoint ladder from `watch` 280px → `8k` 7680px, radii, shadows, animations). Plugin: `tailwindcss-animate`. See [styling-guide.md](./styling-guide.md).

### `postcss.config.js`
Runs Tailwind and Autoprefixer over the CSS. Required for Tailwind to work at all.

### `components.json`
Configures the shadcn/ui CLI: where components/utils live (`@/components`, `@/lib/utils`), CSS-variables mode on, base color `slate`. Used when generating new shadcn primitives.

### `tsconfig*.json`
TypeScript config. Note: the project is mostly JavaScript (`.jsx`), with `allowJs: true` and relaxed strictness. `@/*` is aliased to `./src/*` for the editor. The `vite.config.ts` is the only meaningful `.ts` file.

### `eslint.config.js`
Linting rules (React hooks, react-refresh). Run via `npm run lint`.

### `.env.example`
A fully-commented template listing **every** environment variable (frontend `VITE_*` and backend). Copy it to `.env`. See [environment-variables.md](./environment-variables.md).
*If removed:* new developers wouldn't know which env vars exist.

### `.gitignore`
Prevents committing `node_modules`, build output (`dist`), `.env` files, logs, etc.
*If removed:* secrets and huge folders could be accidentally committed.

---

## `public/` — static assets

Files served verbatim at the site root (no bundling). Referenced by absolute path (e.g. `/favicon-octavia.svg`).

```
public/
├── favicon-octavia.svg            # Brand favicon (versioned name to bust cache)
├── favicon.ico                    # Raster fallback for legacy browsers
├── apple-touch-icon-octavia.svg   # iOS home-screen icon
├── og-image.svg                   # Social share preview image
├── robots.txt                     # Crawler rules
├── sitemap.xml                    # SEO sitemap
└── placeholders/                  # Fallback art when a cover/photo is missing
    ├── album.svg
    ├── artist.svg
    ├── track.svg
    └── mix.svg
```
*Open it when:* updating brand icons or the placeholder images shown by `SmartImage`.

---

## `tools/` — build helpers

```
tools/
└── favicon/
    ├── gen.mjs          # Regenerates favicon.ico from the SVG
    └── package.json
```
A standalone script to rebuild the raster `.ico` whenever the SVG logo changes. Not part of the app runtime.

---

## `src/` — the frontend application

This is where 90% of frontend work happens. It's organized by **type** (`components`, `hooks`, `lib`, `contexts`) plus a **feature** layer (`features/`) and the legacy page implementations (`pages/`).

```
src/
├── main.jsx                # Tiny entry: imports app/main.jsx
├── index.css               # ALL global styles + design tokens (2500+ lines)
├── types.ts                # Shared type hints (light, JS project)
├── app/                    # App bootstrap, providers, routing
├── pages/                  # Page implementations (the real UI for routes)
├── features/               # Feature-oriented route entries + feature hooks
├── components/             # Reusable UI components (by domain)
├── contexts/               # React Context providers (client/session state)
├── hooks/                  # Reusable React hooks
├── lib/                    # Framework-agnostic logic (API, search, explore...)
├── design/                 # Shared motion tokens
└── test/                   # Test setup
```

### `src/app/` — bootstrap, providers, routing
The "wiring" of the app.

| File | Responsibility |
|------|----------------|
| `main.jsx` | Creates the React root, mounts `<App />`, runs pre-React anti-flash theme code. |
| `App.jsx` | Defines **all routes** and lazy-loads every page; wraps everything in `AppProviders`, layout, error boundary, toasts. **The routing source of truth.** |
| `providers.jsx` | Nests all Context providers + React Query's `QueryClientProvider` in the correct order. |
| `pages/NotFoundPage.jsx` | 404 route entry (re-exports `src/pages/NotFound.jsx`). |

*Open it when:* adding a route, adding a global provider, or changing the QueryClient defaults.

### `src/pages/` — page implementations
These contain the **actual UI** for each route. Examples: `HomePage.jsx`, `SearchPage.jsx`, `AlbumPage.jsx`, `ArtistPage.jsx`, `FavoritesPage.jsx`, `LibraryPage.jsx`, `PlaylistPage.jsx`, `SharedPlaylistPage.jsx`, `SettingsPage.jsx`, `TrendingPage.jsx`, `ExplorePageV2.jsx`, `ExploreFlowPage.jsx`, `GenresPage.jsx`, `ChartsArtistsPage.jsx`, `NotFound.jsx`.
*Open it when:* changing what a specific page looks like or does. See [pages/](./pages/).

### `src/features/` — feature-oriented entries + feature hooks
This is a newer organizational layer. Each feature folder (`home`, `search`, `player`, `charts`, `explore`, `artist`, `album`, `playlist`, `library`, `favorites`, `settings`, `auth`, `admin`, `trending`, `genres`) has a `pages/` folder.

> **Important pattern (don't get confused!):** Most files in `features/*/pages/` are **thin re-exports**. For example, `src/features/home/pages/HomePage.jsx` just re-exports `src/pages/HomePage.jsx`. `App.jsx` imports from `features/`, but the real code is in `pages/`. The exceptions (native implementations under `features/`) are the auth pages (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `AccountPage`) and `AdminPage`.

Some features also have a `hooks/` folder for feature-specific data hooks (e.g. `features/charts/hooks/useChartData.js`, `features/explore/hooks/useExploreData.js`, `features/search/hooks/useRankedSearch.js`) — these usually re-export from `src/hooks/`. And `features/player/components/RelatedRail.jsx` + `features/search/components/RelatedRail.jsx` hold feature-scoped components.

*Open it when:* you want to find which implementation a route uses, or add a feature-scoped hook.

### `src/components/` — reusable components by domain

```
components/
├── layout/      # App chrome: MainLayout, Sidebar, TopBar, FooterPlayer, MobileNav, MobileDrawer, MobileMiniPlayerSheet
├── player/      # NowPlaying, TransportControls, VolumeControl, QueuePanel, LyricsPanel, Visualizer, TrackHeadline, ProgressRing
├── home/        # HeroCard, HorizontalRail, TileCard, DiscoverRibbon, WorldStrip, SpotlightArtist, ArtistCircle
├── search/      # FilterChipBar, FilterEditors, VoiceSearchButton, QuickPresets, TrendingChips, RelatedRail
├── charts/      # ChartsPage, ChartsHero, ChartsFilters, ChartsList, ChartRow*, ChartShareModal, ThisDayInMusicCard, grid-templates.js
├── explore/     # MoodBoard, SwipeDeck, ExploreFlow*, SurpriseMeButton, CuratedJourneys, LivePulse, DiscoveryStreakBar, etc.
├── playlist/    # AddToPlaylistButton, AddToPlaylistSubmenu
├── auth/        # ProtectedRoute, RoleRoute (route guards)
├── common/      # SettingsEffects, RouteHead, ErrorBoundary, TitleCardIntro (side-effect/wrapper components)
├── brand/       # Logo (LogoMark, Wordmark, LogoLockup)
├── account/     # AvatarField, AvatarEditorDialog (settings avatar)
├── ui/          # shadcn/ui primitives (Radix-based, kebab-case files)
├── ui-v2/       # Octavia design-system components (Button, Input, EmptyState, SectionHeader...)
└── *.jsx        # Cross-cutting: SmartImage, HeartButton, PlayerAnnouncer, CommandPalette, NavLink, RouteProgress, RouteHead, ErrorBoundary, TitleCardIntro, SearchHighlight, TrackContextMenu
```

**Why two UI folders?** `ui/` holds the raw shadcn/ui primitives (generated, kept in their original form). `ui-v2/` holds **branded, higher-level** components built on top of the design tokens. New product UI should prefer `ui-v2/`. See [components/](./components/).

*Open it when:* building or changing any reusable UI.

### `src/contexts/` — client/session state
React Context providers that hold state shared across the app. See [state-management.md](./state-management.md).

| File | Holds |
|------|-------|
| `AuthContext.jsx` | Current user + login/logout/refresh |
| `PlayerContext.jsx` | Playback: current track, queue, volume, shuffle, repeat (+ a split progress context) |
| `SettingsContext.jsx` | User preferences (theme, accent, audio, motion...) |
| `FavoritesContext.jsx` | Liked tracks |
| `LikedAlbumsContext.jsx` | Liked albums |
| `FollowedArtistsContext.jsx` | Followed artists |
| `PlaylistContext.jsx` | User playlists (CRUD) |
| `SearchHistoryContext.jsx` | Recent searches |
| `NotificationsContext.jsx` | In-app activity feed |
| `UIContext.jsx` | Command palette, mobile drawer, search focus |
| `SoundContext.jsx` | UI sound effects |

### `src/hooks/` — reusable hooks
Custom React hooks (kebab-case `use-*.js`). Cover playback (`use-transport-actions`), search (`use-instant-search`, `use-ranked-search`), discovery (`useDiscoveryFeed`, `useExploreData`), charts (`useChartData`, `useChartFilters`, `useChartSort`), appearance (`use-accent-rotator`, `use-color-extraction`), infra (`use-route-prefetch`, `use-keyboard-shortcuts`), and more. See [state-management.md](./state-management.md) for the full list.
*Open it when:* you need reusable stateful logic that isn't tied to one component.

### `src/lib/` — framework-agnostic logic
Plain modules (no React) holding the API client and business logic. Highlights:

| File | Purpose |
|------|---------|
| `api.js` | The axios client + every backend endpoint wrapper + auth/CSRF interceptors |
| `api/`, `utils/` | Re-export barrels |
| `utils.js` | `cn()` — the Tailwind class merge helper |
| `query-keys.js` | React Query cache-key factories + cache policies |
| `search-*.js` | The search ranking engine, filters, intent, aliases, operators, presets |
| `explore-*.js` | Discovery: recommendations, journeys, progression (XP/streaks), social, infinite flow, memory |
| `player-format.js`, `smart-queue.js`, `shuffle.js`, `slug.js` | Player/data helpers |
| `media-sanitize.js` | Sanitizes image URLs and video IDs |
| `accent-presets.js`, `audio.js`, `lrc.js`, `view-transition.js`, `scroll.js`, `notify.js` | Theming, crossfade, lyrics parsing, transitions, scroll, toasts |
| `chartsUtils.js`, `editorial-meta.js`, `thisDayInMusic.js`, `spotlight-pick.js`, `surprise-random.js`, `feature-flags.js` | Charts/editorial/discovery utilities + feature flags |
| `search-rank.worker.js` | Web Worker that ranks large search result sets off the main thread |

Many `lib/` files have `.test.js` companions — this is the most heavily unit-tested part of the codebase.

### `src/design/`
`motion.js` — shared Framer Motion timing/easing tokens.

### `src/test/`
`setup.js` — Vitest + Testing Library global setup (jsdom, jest-dom matchers).

---

## `server/` — the backend application

A layered Express API. See [api/](./api/), [authentication.md](./authentication.md), [database.md](./database.md).

```
server/
├── index.js              # Process entry: config check → DB connect → listen → warmup
├── server.js             # Back-compat shim (require('./index'))
├── package.json          # Backend deps + scripts (start/dev/seed:admin/test)
├── vitest.config.js      # Backend test config
├── scripts/
│   └── seed-admin.js     # Create/update an admin user from env vars
├── data/
│   └── catalog.js        # Static fallback catalog (used when live sources fail)
├── lib/                  # External-provider clients + heavy logic
│   ├── ytmusic.js        # YouTube Music client (ytmusic-api) + LRU cache + coalescing
│   ├── lastfm.js         # Last.fm client (charts, similar, tags)
│   ├── musicbrainz.js    # MusicBrainz client (artist country, release dates)
│   ├── lyrics.js         # LRCLib lyrics client + YouTube oEmbed fallback
│   ├── charts-service.js # Builds the charts pipeline (Last.fm → enrich → DTO)
│   ├── explore-service.js# Explore pulse/radio/similar/journeys
│   ├── mappers.js        # Maps raw upstream shapes → frontend DTOs
│   └── aggregators.js    # Derives artist rankings from track charts
└── src/
    ├── app.js            # Express app factory (middleware order, route mount)
    ├── config/index.js   # CORS + auth config, prod assertions
    ├── db/connect.js     # Mongoose connection (retry, pool, strict mode)
    ├── routes/           # URL definitions (one file per domain)
    ├── controllers/      # HTTP request/response handlers
    ├── services/         # Business logic
    ├── clients/          # Thin re-exports bridging src/ → lib/ and data/
    ├── mappers/          # dto.mappers.js (re-export of lib/mappers)
    ├── models/           # Mongoose schemas (User, Favorite, Playlist...)
    ├── middleware/       # cors, auth, db-ready, errors, validate, rate-limiters
    ├── validators/       # Zod schemas for request validation
    ├── utils/            # auth (cookies/jwt), cache headers, errors, http helpers
    └── data/catalog.js   # Re-export of the static catalog
```

### `server/src/routes/`
Declares URLs and attaches middleware. One file per domain: `auth.routes.js`, `me.routes.js`, `users.routes.js`, `admin.routes.js`, `playlists.routes.js`, `search.routes.js`, `detail.routes.js`, `charts.routes.js`, `home.routes.js`, `genres.routes.js`, `explore.routes.js`, `lyrics.routes.js`. They're all mounted under `/api` by `routes/index.js`.

### `server/src/controllers/`
Each controller reads the request, calls a service, and writes the HTTP response (status + JSON). They never contain business logic — that's the service's job.

### `server/src/services/`
The business logic. Music services (`search`, `detail`, `charts`, `home`, `trending`, `genres`, `explore`, `lyrics`) mostly delegate to `clients/` → `lib/`. The big one is `library.service.js` (favorites/playlists/history/settings) and `auth.service.js` (sessions/tokens).

### `server/src/clients/`
A thin indirection layer so `src/` code never reaches directly into `lib/` or `data/`. E.g. `ytmusic.client.js` re-exports `server/lib/ytmusic.js`. *Why?* It keeps `lib/` swappable and import paths stable.

### `server/src/models/`
Mongoose schemas: `User.js`, `Favorite.js`, `LikedAlbum.js`, `FollowedArtist.js`, `Playlist.js`, `ListeningHistory.js`, `SearchHistory.js`, and `shared.js` (the reusable track-snapshot sub-schema). See [database.md](./database.md).

### `server/src/middleware/`
`cors.js`, `auth.js` (JWT verification, role checks, ownership, CSRF), `db-ready.js` (503 if no DB), `errors.js` (central error→HTTP mapper), `validate.js` (Zod), `rate-limiters.js` (per-route-family limits).

### `server/src/validators/`
Zod schemas validating request bodies/params/queries: `auth.validators.js`, `user.validators.js`, `admin.validators.js`, `library.validators.js`, `common.js`.

### `server/src/utils/`
`auth.js` (cookie options, JWT signing/verifying, CSRF/JTI generation, token hashing), `cache.js` (HTTP `Cache-Control` headers), `app-errors.js` (typed error classes), `async-handler.js` (wraps async handlers to forward errors), `http.js` (`sendOrNotFound`, `liveOrFallback`, `dedupeById`, `clampInt`).

---

## Tests

Tests live **next to the code they test** with a `.test.js`/`.test.jsx` suffix (e.g. `src/lib/search-rank.test.js`, `server/src/services/library.service.test.js`). Frontend tests use Vitest + Testing Library + jsdom; backend uses Vitest. See [testing-and-quality.md](./testing-and-quality.md).

---

## Key things to remember

- **`App.jsx` is the routing source of truth.** Start there to trace any page.
- **`features/*/pages/` are usually thin re-exports of `src/pages/`.** The real UI is in `pages/` (except auth + admin, which are native under `features/`).
- **`components/ui/` = raw shadcn primitives; `components/ui-v2/` = branded design system.** Prefer `ui-v2/` for new UI.
- **`src/lib/` is React-free logic** and is the most-tested area.
- **Backend is layered:** `routes → controllers → services → clients → lib`. External APIs and the DB are reached only through `lib/` and `models/`.
- Tests sit beside their source files.
