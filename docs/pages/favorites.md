# Favorites Page (`/favorites`)

> **What you'll learn here:** the "liked songs" page, its sorting and keyboard navigation, and why it requires sign-in.

| | |
|--|--|
| **Route** | `/favorites` |
| **Access** | **Protected** (redirects to `/login` if signed out) · inside `MainLayout` |
| **File** | `src/pages/FavoritesPage.jsx` |

## What it does

Manage your liked songs: sort them, play all, shuffle, navigate with the keyboard, and remove favorites.

## Key components

Internal memoized `FavoritesRow`, plus `TrackContextMenu`, `Tabs`, `HeartButton`, `EmptyState`.

## Data it needs and where it comes from

- `useFavorites()` — `list`, `removeFavorite`, `toggleFavorite`. (Favorites are server-backed per-user via `/api/me/favorites`; see [../api/me.md](../api/me.md).)
- `usePlayer()` — `playTrack`, `playTracksInOrder`, `addToQueue`, `currentTrack`, `isPlaying`.
- `useListNavigation()` — vim-style list keyboard navigation.

## Page-level logic

- **Local sort state**: `recent` | `title` | `artist`.
- Empty state when you have no favorites.
- Rows are memoized for performance.

## Special behavior

- Each row has a right-click `TrackContextMenu`.
- Keyboard shortcuts via `useListNavigation`: `Enter` plays, `Q` queues, `L` unlikes the highlighted row.

## Key things to remember

- **Requires sign-in** — favorites are stored per-user on the server, not in `localStorage`.
- Sorting is purely client-side over the loaded list.
