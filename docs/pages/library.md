# Library Page (`/library`)

> **What you'll learn here:** the personal-archive hub with its many tabs, and the on-demand fetch for playing liked albums.

| | |
|--|--|
| **Route** | `/library` |
| **Access** | **Protected** · inside `MainLayout` |
| **File** | `src/pages/LibraryPage.jsx` |

## What it does

Your personal archive, organized into tabs: **overview**, **playlists**, **history**, **favorites**, **followed artists**, **liked albums**, and **recent searches**. The overview shows slices of each collection with "see all" / "play all" shortcuts.

## Key components

`Tabs`, `SectionHeader`, internal `CompactTrack` / `LibraryTrackRow`, `PlaylistsTab`, `FollowedArtistList`, `LikedAlbumGrid`, `RecentSearches`, `AddToPlaylistButton`, `HeartButton`.

## Data it needs and where it comes from

This page is a hub that reads from **all the library contexts**:

| Tab | Source |
|-----|--------|
| History | `usePlayer()` → `history` |
| Favorites | `useFavorites()` |
| Followed artists | `useFollowedArtists()` |
| Liked albums | `useLikedAlbums()` |
| Recent searches | `useSearchHistory()` |
| Playlists | `usePlaylistActions()` (`playlists`, `createEmptyPlaylist`, `addTrackToPlaylistWithFeedback`, …) |

`topArtists` (overview) is derived client-side from history + favorites.

> **On-demand fetch.** Liked albums only store summary metadata, not their tracklists. So when you play a liked album, the page calls `queryClient.fetchQuery(queryKeys.album(id), getAlbum)` to load the full tracklist just-in-time.

## Page-level logic

- Tab state is local (`overview` by default).
- A global empty state shows when **all** collections are empty; otherwise each tab has its own empty state.
- Overview shows slices (≈6 items) per collection with "see all" and "play all".

## Special behavior

- The playlists tab can add the **current** track to a playlist inline.
- The search tab navigates to `/search?q=…` to re-run a past search.

## Key things to remember

- **Requires sign-in** — everything here is per-user server data.
- Liked albums **fetch their tracks on demand** when played (they're stored as summaries only).
