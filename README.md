# Octavia

A modern, glass-themed music streaming web app built with React, Vite, Tailwind CSS, shadcn/ui, and Framer Motion. Search and play music from YouTube Music in real time, browse live charts and trending tracks, build a personal favorites library, and control playback with a polished UI and keyboard shortcuts.

## Features

- Beautiful dark glassmorphism interface with smooth Framer Motion transitions
- Expandable sidebar with grouped navigation (Discover / Library)
- Global top bar with history navigation, search, and a `⌘K` command palette
- Persistent favorites (saved to `localStorage`)
- Full-fidelity now-playing view with stable waveform visualization
- Footer mini-player with quick access to the full now-playing page
- Keyboard shortcuts: `Space` play/pause, `←/→` seek, `Shift+←/→` prev/next, `M` mute, `L` like, `/` focus search, `⌘K` palette, `Esc` close
- Mobile-aware shell: drawer sidebar, bottom tab bar, compact footer player

## Tech stack

- **Build:** Vite + SWC React plugin
- **UI:** React 18, Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion, lucide-react
- **State:** React Context (`PlayerContext`, `FavoritesContext`), TanStack Query
- **Routing:** react-router-dom v6
- **Audio:** react-player v3 (YouTube source)
- **Catalog:** Express + [`ytmusic-api`](https://www.npmjs.com/package/ytmusic-api) (unofficial YouTube Music client; no API key required)

## Getting started

```bash
# 1) Install frontend + backend dependencies
npm install
npm --prefix server install

# 2) Configure environment values
cp .env.example .env

# 3) Start backend API (http://localhost:5000)
npm --prefix server run dev

# 4) Start frontend (http://localhost:8080)
npm run dev
```

The frontend talks to the Express API under `server/` for both live catalog
data and authenticated `/api/auth`, `/api/me`, `/api/users`, and `/api/admin`
routes.

### Environment variables

Configuration is supplied via Vite env files (`.env`, `.env.local`) for the
frontend, and ordinary process env vars for the backend. See `.env.example`
for the full list.

**Frontend**

- `VITE_API_BASE` — base URL of the backend API (defaults to `http://localhost:5000/api`)

**Backend required for auth + data persistence**

- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_ACCESS_SECRET` — access-token signing secret (32+ random bytes)
- `JWT_REFRESH_SECRET` — refresh-token signing secret (32+ random bytes)
- `JWT_ACCESS_TTL` — access token lifetime (default `15m`)
- `JWT_REFRESH_TTL` — refresh token lifetime (default `30d`)
- `BCRYPT_ROUNDS` — password-hash cost (default `12`, minimum `12`)
- `CORS_ORIGIN` — allowlisted frontend origin for cookie auth
- `COOKIE_SECURE` — `true` in production
- `COOKIE_DOMAIN` — optional cookie domain override
- `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` — auth route limiter

**Backend optional catalog tuning**

- `YTM_CHARTS_PLAYLIST` / `YTM_TRENDING_PLAYLIST` — YouTube Music playlist IDs
  used by `/api/charts` and `/api/trending`
- `YTM_CACHE_SEARCH_MIN`, `YTM_CACHE_DETAIL_MIN`, `YTM_CACHE_CHARTS_MIN`,
  `YTM_CACHE_GENRES_MIN` — cache TTL minutes per endpoint family
- `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` — used by
  `npm --prefix server run seed:admin`

Never commit a real `.env`; only `.env.example` is tracked.

### MongoDB Atlas + admin bootstrap

1. Create a free Atlas cluster and database user.
2. Add your connection string to `MONGODB_URI`.
3. Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to strong random values.
4. Seed an admin account:

```bash
set ADMIN_BOOTSTRAP_EMAIL=admin@example.com
set ADMIN_BOOTSTRAP_PASSWORD=replace-with-strong-password
npm --prefix server run seed:admin
```

Use `export ...` on macOS/Linux shells instead of `set`.

### Live YouTube Music fetching

Searches, album / artist pages, charts, trending, home, and genres are all
served by the Express layer in `server/` which calls
[`ytmusic-api`](https://www.npmjs.com/package/ytmusic-api) under the hood. The
upstream is unofficial and occasionally rate-limits; the server caches every
response in memory (with configurable TTLs) and falls back to a curated static
catalog when a live call fails so the UI never blanks out. Playback itself
goes straight from the browser to YouTube via `react-player` — the server only
hands the client a `videoId`.

### Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run build:dev` — development-mode build
- `npm run preview` — preview the production build
- `npm run test:run` — run frontend Vitest tests
- `npm run lint` — run ESLint
- `npm --prefix server run dev` — start backend API
- `npm --prefix server run test:run` — run backend Vitest tests
- `npm --prefix server run seed:admin` — create/update admin user

## Project layout

```
.
├── public/             Static assets (robots.txt, sitemap.xml, og-image.svg)
├── server/             Companion Express API
│   ├── index.js        Backend entrypoint
│   ├── scripts/        Utility scripts (e.g. seed-admin)
│   └── src/            App, routes, middleware, services, models, validators
├── src/
│   ├── components/     Feature components (CommandPalette, player surfaces, …)
│   │   ├── brand/      Logo / brand marks
│   │   ├── layout/     App shell (Sidebar, TopBar, FooterPlayer, MainLayout, …)
│   │   ├── player/     Now-playing UI (LyricsPanel, QueuePanel, Visualizer)
│   │   ├── ui/         shadcn/ui primitives (Radix-based, kebab-case)
│   │   └── ui-v2/      Higher-level design-system components
│   ├── contexts/       Player, Favorites, Playlist, Settings, Sound, UI providers
│   ├── design/         Shared motion tokens
│   ├── hooks/          Reusable hooks (use-keyboard-shortcuts, use-tilt, …)
│   ├── lib/            API client, audio, lyrics, notifications, utils
│   ├── pages/          Route-level views (Home, Search, Player, Album, …)
│   ├── App.jsx         Providers, routes, lazy-loaded pages
│   └── main.jsx        App bootstrap (theme, smooth scroll, React root)
└── index.html
```

### Conventions

- **Components** use `PascalCase` filenames (`Sidebar.jsx`).
- **shadcn/ui primitives** keep their generated `kebab-case` names (`dropdown-menu.jsx`).
- **Hooks** use the `use-*` `kebab-case` convention (`use-keyboard-shortcuts.js`).
- The `@` alias maps to `src/` (configured in `vite.config.ts` / `tsconfig`).

## Documentation

Comprehensive project documentation now lives in [`docs/`](docs/).

- Start here: [`docs/README.md`](docs/README.md)
- Setup: [`docs/getting-started.md`](docs/getting-started.md)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- API contract: [`docs/api-reference.md`](docs/api-reference.md)
- Contribution workflow: [`docs/contributing.md`](docs/contributing.md)

## License

MIT
