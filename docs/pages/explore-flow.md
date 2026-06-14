# Explore Flow Page (`/explore/flow`)

> **What you'll learn here:** the infinite "flow" discovery mode, how its endless deck is built, and the feature flag that gates it.

| | |
|--|--|
| **Route** | `/explore/flow` (e.g. `/explore/flow?mood=focus&genre=pop`) |
| **Access** | Public · inside `MainLayout` · **gated by `EXPLORE_INFINITE_ENABLED`** |
| **File** | `src/pages/ExploreFlowPage.jsx` |

## What it does

An endless, single-card discovery experience: the user plays, saves, or skips through an infinite deck of tracks tuned to a mood/genre seed. Think "swipe forever" radio.

## Key components

`ExploreFlowShell` (which renders `ExploreFlowDeck`), plus a back link to `/explore`.

## Data it needs and where it comes from

- **Feature gate**: if `EXPLORE_INFINITE_ENABLED` is off, the page immediately renders `<Navigate to="/explore" replace />`.
- URL params (`useSearchParams`): `mood`, `genre`, `seed`.
- `useExploreTaste()`, `useExploreProgress()` — taste + gamification.
- `useDiscoveryFeed()` + `useExploreData()` — shared candidate pool with the main Explore page.
- **`useInfiniteDiscovery()`** — the core: pages through tracks using `getExploreRadio` and `getExploreSimilar`, with caching via `cachePolicy`.
- `usePlayer()`, `useFavorites()` (`toggleFavorite`, `isFavorite`).
- `discovery-memory` seen-sets to avoid repeats.

## Page-level logic

- `handlePlay`, `handleSave`, `handleSkip` each record feedback + progression events.
- `flow.loadMore` paginates the infinite deck.
- The flow seed is composed as `` `${seed||'flow'}:${mood}:${genre}` ``.
- Save/skip advance the deck via `flow.saveTop()` / `flow.skipTop()`.

## Key things to remember

- This page **only exists when `EXPLORE_INFINITE_ENABLED` is true**; otherwise it redirects to `/explore`.
- It reuses the **same candidate pool** as [Explore](./explore.md) but presents it as an infinite stream.
