# Frontend Guide

This guide explains how the React application is organized and how data/state
flow through the UI.

## Frontend Structure

Top-level frontend directories in `src/`:

- `app/` - app bootstrap, provider composition, top-level route tree
- `features/` - route-oriented feature entrypoints
- `pages/` - page implementations (many features currently re-export these)
- `components/` - reusable UI and route-level composition components
- `contexts/` - global persistent and UI state providers
- `hooks/` - reusable behavior (data hooks, keyboard, UX interactions)
- `lib/` - API client, query keys, ranking logic, media utilities, smart queue
- `design/` - motion/theming helpers
- `types/` - app-specific type modules

## Bootstrap Sequence

Startup chain:

1. `src/main.jsx` imports `src/app/main.jsx`
2. `src/app/main.jsx`:
   - applies persisted theme/reduced-motion flags before first paint
   - preconnects to API origin when `VITE_API_BASE` is cross-origin
   - mounts app root
3. `src/app/App.jsx`:
   - wraps app in all providers
   - configures lazy routes
   - sets global toasts/metadata/error boundary

## Provider Composition

Providers are assembled in `src/app/providers.jsx`:

- `HelmetProvider`
- `QueryClientProvider`
- `SettingsProvider`
- `PlayerProvider`
- `FavoritesProvider`
- `LikedAlbumsProvider`
- `FollowedArtistsProvider`
- `PlaylistProvider`
- `NotificationsProvider`
- `UIProvider`
- `SoundProvider`
- `TooltipProvider`

This means most route components can assume these contexts exist globally.

## Routing Model

Routing is declared in `src/app/App.jsx` with lazy-loaded route components.

Primary routes:

- `/`, `/search`, `/player`, `/trending`
- `/charts`, `/charts/artists`
- `/explore`, `/explore/flow`, `/genres`
- `/favorites`, `/library`, `/settings`
- `/artist/:slug`, `/album/:id`, `/playlist/:id`

`MainLayout` wraps the routed pages and provides shell elements:

- sidebar/topbar
- footer player
- command palette
- responsive mobile navigation surfaces

## Data Fetching Strategy

### API Client

`src/lib/api.js` is the canonical HTTP client layer:

- uses axios with default timeout `25000ms`
- resolves base URL from `VITE_API_BASE` with sensible defaults:
  - dev: `http://localhost:5000/api`
  - prod fallback: `/api`
- normalizes image URLs to more stable quality variants
- exposes semantic helpers per endpoint (not generic call sites)

### Query Keys And Cache Policy

`src/lib/query-keys.js` centralizes:

- normalized query-key builders (`queryKeys.*`)
- cache/staleness policy (`cachePolicy`)

This prevents key drift and improves cache hit rates across pages that reuse
the same backend resource.

## State Management Model

The app uses two state classes:

- **Server state**: React Query (`@tanstack/react-query`)
- **Client durable/UI state**: React contexts with `localStorage` persistence

Key contexts:

- `PlayerContext` - playback state, queue, transport controls, smart queue
- `FavoritesContext` - favorite tracks map + list
- `PlaylistContext` - user playlists and track management
- `SettingsContext` - theme/audio/UI preferences

### PlayerContext Design Notes

`src/contexts/PlayerContext.jsx` is intentionally rich:

- separates durable playback control state from high-frequency progress state
- supports queue modes (`manual`, `collection`, `smart`)
- persists queue/history/settings snapshot to `localStorage`
- builds "smart queue" recommendations from similar/radio API calls

The companion hook `usePlayerProgress` prevents full-player rerenders on each
progress tick.

## Playback Pipeline

Playback is driven by:

- metadata track selection from pages/results
- queue + transport state in `PlayerContext`
- render/playback element in `src/components/layout/FooterPlayer.jsx`

`FooterPlayer` lazy-loads `react-player` and plays:

- `https://www.youtube.com/watch?v=<videoId>`

Implications:

- backend does not proxy media
- `videoId` is required for playable rows
- media sanitization in `src/lib/media-sanitize.js` is a critical safety layer

## Worker Usage

Search ranking is offloaded to `src/lib/search-rank.worker.js`, consumed by
ranked-search hooks. This keeps fuzzy/ranking computation off the main thread.

## Feature Flags

`src/lib/feature-flags.js` reads `VITE_EXPLORE_*` flags for explore feature
surfaces:

- `VITE_EXPLORE_V2_ENABLED`
- `VITE_EXPLORE_LOOPS_ENABLED`
- `VITE_EXPLORE_SOCIAL_ENABLED`
- `VITE_EXPLORE_INFINITE_ENABLED`

## Performance Patterns

Frontend performance is intentionally shaped by:

- route-level lazy imports in `App.jsx`
- route prefetch registration (`registerPrefetch(...)`)
- split vendor chunks in `vite.config.ts`
- player chunk isolation (`vendor-player`) so non-player sessions avoid large
  media dependency downloads

## Frontend Implementation Checklist (When Adding A Feature)

1. Add/extend API helper in `src/lib/api.js` if backend call needed.
2. Add stable query key shape in `src/lib/query-keys.js`.
3. Build feature hook in `src/hooks/` or `src/features/<feature>/hooks/`.
4. Add route page in `src/features/<feature>/pages/`.
5. Register route and optional prefetch in `src/app/App.jsx`.
6. Add/adjust tests close to logic (`*.test.js` / `*.test.jsx`).

## Related Docs

- [Architecture](./architecture.md)
- [Backend Guide](./backend-guide.md)
- [API Reference](./api-reference.md)
- [Data Models and Config](./data-models-and-config.md)
