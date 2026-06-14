# Album Page (`/album/:id`)

> **What you'll learn here:** the album detail page, its autoplay-from-search trick, and how album likes work.

| | |
|--|--|
| **Route** | `/album/:id` (e.g. `/album/MPREb_xyz?from=search&autoplay=1`) |
| **Access** | Public · inside `MainLayout` |
| **File** | `src/pages/AlbumPage.jsx` |

## What it does

Album detail: play or shuffle the tracklist, like the whole album, share it, and navigate to the artist. Shows total runtime and disables non-playable tracks.

## Key components

`SmartImage`, `HeartButton`, `AddToPlaylistButton`, a dropdown menu, and an `AlbumPageSkeleton`.

## Data it needs and where it comes from

- `useParams()` — the album `id`.
- `useSearchParams()` — `from=search` and `autoplay=1`.
- `getAlbum(id)` via `useQuery`, keyed `queryKeys.album(id)`.
- `usePlayer()` — `playTracksInOrder`, `currentTrack`, `isPlaying`.
- `useLikedAlbums()` — `isLiked`, `toggleLiked`.
- `useArtistPrefetchProps()`, `usePageError()`.

## Page-level logic

- **Autoplay once**: when opened with `?from=search&autoplay=1`, the album auto-plays once and then **strips those params** from the URL (so a refresh doesn't replay).
- Empty-album state when there are no tracks.
- Non-playable rows (missing `playable`/`videoId`) are disabled.

## Special behavior

- Album play uses `playTracksInOrder(..., { forceSequential: true })` so it plays in album order rather than shuffled.
- Total runtime is computed client-side.
- The "like" is an **album-level** action (via `useLikedAlbums`), distinct from per-track hearts. Liked albums appear in the [Library](./library.md), and their tracklists are fetched on demand when played from there.

## Key things to remember

- `?autoplay=1` fires **once** then clears itself from the URL.
- Liking an album is separate from favoriting its tracks.
