# Octavia

A modern, glass-themed music streaming web app built with React, Vite, Tailwind CSS, shadcn/ui, and Framer Motion. Search and play music from YouTube Music in real time, browse live charts and trending tracks, build a personal favorites library, and control playback with a polished UI and keyboard shortcuts.

## Features

- Beautiful dark glassmorphism interface with smooth Framer Motion transitions
- Expandable sidebar with grouped navigation (Discover / Library)
- Global top bar with history navigation, search, and a `⌘K` command palette
- Persistent favorites (saved to `localStorage`)
- Full-fidelity now-playing view with stable waveform visualization
- Footer mini-player that expands into a full now-playing overlay
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
# 1. Install frontend dependencies
npm install

# 2. Configure the API base URL
cp .env.example .env

# 3. Start the frontend
npm run dev
```

The dev server runs at <http://localhost:8080>. A companion Express server in
`server/` serves the catalog/search endpoints the frontend calls:

```bash
cd server
npm install
npm run dev   # starts the API on http://localhost:5000
```

### Environment variables

Configuration is supplied via Vite env files (`.env`, `.env.local`) for the
frontend, and ordinary process env vars for the backend. See `.env.example`
for the full list.

**Frontend**

- `VITE_API_BASE` — base URL of the backend API (defaults to `http://localhost:5000/api`)

**Backend** (all optional, sensible defaults baked in)

- `YTM_CHARTS_PLAYLIST` / `YTM_TRENDING_PLAYLIST` — YouTube Music playlist IDs
  to drive `/api/charts` and `/api/trending`. When unset, the server falls back
  to a broad search query.
- `YTM_CACHE_SEARCH_MIN`, `YTM_CACHE_DETAIL_MIN`, `YTM_CACHE_CHARTS_MIN`,
  `YTM_CACHE_GENRES_MIN` — in-memory TTL (minutes) per endpoint family.

Never commit a real `.env`; only `.env.example` is tracked.

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
- `npm run lint` — run ESLint

## Project layout

```
.
├── public/             Static assets (robots.txt, sitemap.xml, og-image.svg)
├── server/             Companion Express API
│   ├── data/           In-memory music catalog + query helpers
│   └── server.js       REST endpoints (search, album, artist, charts, …)
├── src/
│   ├── components/     Feature components (CommandPalette, ExpandedPlayer, …)
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

## License

MIT
