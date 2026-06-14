# Playlist Page (`/playlist/:id`)

> **What you'll learn here:** the owner's editable playlist page, drag-to-reorder, and how sharing flips a playlist to public.

| | |
|--|--|
| **Route** | `/playlist/:id` |
| **Access** | **Protected** · inside `MainLayout` |
| **File** | `src/pages/PlaylistPage.jsx` |

## What it does

The detail view for a playlist **you own**. Edit name/description, play, shuffle, pin, share via public link, drag to reorder tracks, and delete.

## Key components

`CollageCover`, `SortableTrack` with `@dnd-kit` drag-and-drop, `HeartButton`, `EmptyState`.

## Data it needs and where it comes from

- `useParams()` — the playlist `id`.
- **`usePlaylists()`** — the full playlist API surface: `playlists`, `updatePlaylist`, `deletePlaylist`, `removeTrackFromPlaylist`, `togglePin`, `reorderTracks`, `setPlaylistVisibility`.
- `usePlayer()` — `playTracksInOrder`, `currentTrack`.

> **No React Query here.** The playlist comes from the `PlaylistContext` (which itself syncs to storage/API), not a `useQuery`. So the data is already in context by the time this page renders.

## Page-level logic

- Not found → navigate back to `/library`.
- Inline edit mode for name/description.
- Drag-reorder via `DndContext`.
- Delete confirms, then navigates to `/library`.

## Special behavior

- **Sharing** flips `visibility` to `'public'` and copies the `/shared/{shareId}` link to the clipboard. The public view is the [Shared Playlist page](./shared-playlist.md).
- Pin toggle controls whether it appears pinned in the sidebar.
- `sonner` toasts confirm saves/deletes.

## Key things to remember

- This page is for **owned** playlists; the public read-only view is `/shared/:shareId`.
- Sharing **changes the playlist's visibility to public** — it's not a separate copy.
- Data comes from **context**, not React Query.
