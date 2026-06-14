# Artist Page (`/artist/:slug`)

> **What you'll learn here:** the artist profile page, its slug-based routing, follow/share/radio actions, and the page-scoped accent color trick.

| | |
|--|--|
| **Route** | `/artist/:slug` (e.g. `/artist/daft-punk`) |
| **Access** | Public · inside `MainLayout` |
| **File** | `src/pages/ArtistPage.jsx` |

## What it does

The artist profile. Users can play or shuffle the artist's top tracks, follow/unfollow the artist, share the page, start an artist radio, and browse a year-grouped discography.

## Key components

`SectionHeader`, `SmartImage`, `HeartButton`, `AddToPlaylistButton`, a dropdown menu, and an `ArtistPageSkeleton`.

## Data it needs and where it comes from

- `useParams()` — the `slug` (a human-readable identifier; see [glossary](../glossary.md)).
- `getArtist(slug)` via `useQuery`, keyed `queryKeys.artist(slug)`, `enabled: Boolean(slug)`. The backend accepts either a YouTube channel ID or a human slug (resolving the slug via artist search).
- `usePlayer()`, `useFollowedArtists()` (`isFollowing`, `toggleFollow`).
- `useScopedArtistAccent(portraitSrc)`, `useHoverPrefetch()`, `usePageError()`.

## Page-level logic

- Full-page skeleton while loading; distinct **not-found** vs **retryable error** states.
- A **sticky condensed bar** appears once you scroll past the hero, driven by an `IntersectionObserver`.
- Popular tracks show the first `POPULAR_INITIAL = 5` with expand/collapse.

## Special behavior

- **Page-scoped accent**: `useScopedArtistAccent` extracts a color from the cover and sets a `--artist-accent` CSS variable scoped to this page — so the page tints itself to the artist's art without affecting the global accent. See [../styling-guide.md](../styling-guide.md).
- **Artist radio** = a shuffled play of the top tracks.
- Share uses `shareOrCopy` (native share sheet, clipboard fallback).
- Album links prefetch on hover for instant navigation.

## Key things to remember

- The route uses a **slug**, but the API also accepts an ID — the backend resolves either.
- The page **re-tints itself** to the artist's cover via a scoped CSS variable.
