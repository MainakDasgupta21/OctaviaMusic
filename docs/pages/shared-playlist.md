# Shared Playlist Page (`/shared/:shareId`)

> **What you'll learn here:** the public read-only playlist view, how anyone can open a shared link, and how a signed-in user copies it to their own library.

| | |
|--|--|
| **Route** | `/shared/:shareId` |
| **Access** | **Public** · inside `MainLayout` |
| **File** | `src/pages/SharedPlaylistPage.jsx` (and `src/features/playlist/pages/SharedPlaylistPage.jsx`) |

## What it does

Displays a publicly-shared playlist **read-only**. Anyone with the link can view and play it. A signed-in user can save a copy into their own library.

## Key components

`CollageCover` (a 4-up thumbnail mosaic), `EmptyState`, `SmartImage`, `Button`.

## Data it needs and where it comes from

- `useParams()` — `shareId` (the share token, not the owner's playlist id).
- `getSharedPlaylist(shareId)` via `useQuery`, keyed `['playlists','shared', shareId]`, `staleTime: 60_000`.
- `usePlayer()` — `playTracksInOrder`, `currentTrack`.
- `usePlaylists()` — `importSharedPlaylist`.
- `useAuth()` — `isAuthenticated`.
- `usePageError()`.

## Page-level logic

- Skeleton → error (not-found redirects home) → empty-tracks state.
- **Save copy**: if not signed in, prompts sign-in via `notify.signInRequired`; once saved, navigates to the new `/playlist/{newId}`.

## Special behavior

- The list is strictly **read-only** — no reordering or favoriting on this view.
- The cover is a 4-up collage built from the first tracks' thumbnails.
- Backed by the public endpoints `GET /api/playlists/shared/:shareId` and `POST /api/playlists/shared/:shareId/copy` (the copy requires auth + CSRF). See [../api/playlists.md](../api/playlists.md).

## Key things to remember

- This is the **only playlist view that's public** — it uses a `shareId` token, not the owner's playlist id.
- Saving a copy **requires sign-in**; the copy is always created as private.
