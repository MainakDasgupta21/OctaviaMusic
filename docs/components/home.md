# Components · Home

> **What you'll learn here:** the building blocks of the Home page — hero, tiles, rails, and the editorial/world-music sections.

**Folder:** `src/components/home/`

These are mostly **presentational** components that the [Home page](../pages/home.md) feeds with data. Each typically receives a `track`/`feature` and an `onPlay`-style callback.

---

## `HeroCard` / `HeroSkeleton`

The cover-story hero at the top of Home.

- **Props:** `feature` (`{ title, description, cover, eyebrow, label, to }`), `issueNum`, `onPlay`, `isPlayable`.
- **State:** a `splitWords` memo for the kinetic headline animation.
- **Actions:** `onPlay`; `Link` to `feature.to`.
- **Children:** `SmartImage`, `Button` (and a `HeroSkeleton` export).
- **Quirks:** the hero image uses `fetchpriority="high"`; an editorial vertical masthead shows at `md+`.

---

## `TileCard` / `TileSkeleton`

A track tile in a horizontal rail.

- **Props:** `track`, `onPlay(track)`, `isCurrent`, `index`.
- **Reads:** `useSounds` (for the click SFX/haptic).
- **Children:** `SmartImage`.
- **Quirks:** wrapped in `React.memo` — pass a **stable** `onPlay` handler (e.g. `useCallback`) or you lose the memo benefit. Shows a rank badge and a now-playing chip.

---

## `HorizontalRail`

The scroll-snap rail wrapper used to hold rows of tiles/cards.

- **Props:** `children`, `className`, `ariaLabel`, `scrollStep`.
- **State:** `edges` `{ left, right }` to drive edge-fade masks.
- **Actions:** `smoothScrollBy` left/right via arrow buttons.
- **Quirks:** the fade only appears on the side(s) with off-screen content; `py-2 -my-2` prevents hover effects from being clipped.

---

## `ArtistCircle`

A circular artist avatar + name.

- **Props:** `artist`, `sample` (image), `slug`, `fluid`, `className`.
- **Actions:** `Link` to `/artist/:slug` when a slug exists, otherwise a non-link fallback.
- **Children:** `SmartImage`.

---

## `DiscoverRibbon`

The "start listening" CTA block on Home.

- **Props:** `trending`, `onPlayTrack`, `onPlayTracks`, `onSurprise`, `surpriseLoading`, `isLoading`.
- **Actions:** play a shuffled "Discover Mix", "Surprise Me", and mood chips linking to `/explore?mood=`.
- **Children:** `Button`, `Skeleton`; moods from `EXPLORE_MOODS`.
- **Quirks:** if no `onSurprise` is supplied, it falls back to picking a random trending track.

---

## `WorldStrip`

Six regional "scene" cards (K-Pop, Afrobeats, etc.) that load and play a 12-track queue on tap.

- **Props:** `onPlayTracks`.
- **Reads:** `useQueryClient`, `searchMusic`.
- **State:** `loadingIds` (per-scene loading guard).
- **Actions:** `onPlayTracks(tracks, { replaceQueue: true, forceSequential: false })` + a toast.
- **Children:** `SectionHeader`.
- **Quirks:** scene queries are hardcoded in a `SCENES` list.

---

## `SpotlightArtist` / `SpotlightArtistSkeleton`

The "artist of the week" feature.

- **Props:** `artist` (with `topTracks`), `fallbackImage`, `onPlayTrack`, `onPlayAll`.
- **Actions:** play a track / play all / play all shuffled; `Link` to the artist.
- **Children:** `SmartImage`, `Button`, `Skeleton`.
- **Quirks:** returns `null` when there are no tracks; the slug is `humanSlug || slug || id`.

## Key things to remember

- These are **presentational** — they get data + callbacks from the Home page.
- `TileCard` is memoized; always pass **stable** handlers.
- `HorizontalRail` is the reusable scroll-snap row used across multiple sections.
