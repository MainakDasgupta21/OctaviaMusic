# Trending Page (`/trending`)

> **What you'll learn here:** the simple ranked-list page for hot tracks and how it shares a cache with Home.

| | |
|--|--|
| **Route** | `/trending` |
| **Access** | Public · inside `MainLayout` |
| **File** | `src/pages/TrendingPage.jsx` |

## What it does

Shows a ranked list of 40 currently-hot tracks. Users can "Play the whole feed", play any single row, favorite tracks, or add them to a playlist.

## Key components

Internal memoized `TrendingRow`, plus `EmptyState`, `Button`, `SmartImage`, `HeartButton`, `AddToPlaylistButton`.

## Data it needs and where it comes from

- `getTrending({ limit: 40 })` via `useQuery`, keyed **`queryKeys.trending(40)`**.
- `usePlayer()` — `playTrack`, `playTracksInOrder`, `currentTrack`, `isPlaying`.
- `useEditorialMeta()`, `usePageError()`.

> **Shared cache.** This uses the exact same `queryKeys.trending(40)` key that the Home page seeds, so arriving from Home shows data instantly.

## Page-level logic

- Error and empty states with retry.
- Skeleton rows while loading.
- "Play the whole feed" calls `playTracksInOrder(..., { forceSequential: true })` so the list plays top-to-bottom rather than shuffled.

## Special behavior

- Rows are memoized; the currently-playing row shows animated "now playing" bars.

## Key things to remember

- Shares the **`trending(40)`** cache with [Home](./home.md).
- `forceSequential: true` is what makes "play all" play in order.
