# Components · Player

> **What you'll learn here:** the components that make up the Now Playing experience and the transport/queue/lyrics panels — plus why the visualizer is "fake".

**Folder:** `src/components/player/`

These render the `/player` page and the player panels. The audio itself comes from `FooterPlayer` (see [layout.md](./layout.md)); these components read shared player state via `usePlayer` / `usePlayerProgress`.

---

## `NowPlaying`

The full-screen Now Playing view (the entire `/player` page body).

- **UI:** vinyl artwork, transport, seek, volume, and a tabbed side panel (Queue / Lyrics / Related).
- **Reads:** `usePlayer`, `usePlayerProgress`, `useSearchParams`.
- **State:** `panel` (`queue`|`lyrics`|`related`), `seekPreview`, swipe refs.
- **Actions:** `seekTo`, `setPanel`, `navigate` (empty state), touch-swipe between panels; honors `?panel=` in the URL.
- **Children:** `AmbientBackdrop`, `TrackHeadline`, `TransportControls`, `VolumeControl`, `Tabs`, `QueuePanel`, `LyricsPanel`, `PlayerRelatedRail`, `EmptyState`, `Button`, shadcn `Slider`.
- **Parent:** `PlayerPage`.
- **Quirks:** upgrades the artwork to a higher-quality YouTube thumbnail; shares a `layoutId` with the footer for view-transition continuity; shows an empty state when there's no `currentTrack`.

---

## `TransportControls`

The centered shuffle / previous / play-pause / next / repeat cluster.

- **Reads:** `useTransportActions` (wraps `usePlayer` plus sound effects/haptics).
- **Actions:** `onToggleShuffle`, `onPlayPrevious`, `onTogglePlay`, `onPlayNext`, `onToggleRepeat`.
- **Parent:** `NowPlaying` (the footer player mirrors the same controls).
- **Quirks:** repeat-one uses the `Repeat1` icon; prev/next respect `canGoPrevious` / `canGoNext`.

---

## `QueuePanel`

The sortable play-queue list.

- **Reads:** `usePlayer`.
- **Actions:** play a queued track (`playTrack(..., { queueBehavior: 'queue', queueIndex })`), remove (`removeFromQueueAt`/`removeFromQueue`), reorder (`reorderQueue`).
- **Children:** internal `SortableQueueItem`, `SmartImage`, `EmptyState`.
- **Parent:** `NowPlaying`; also the footer's queue popover.
- **Quirks:** item IDs are `${track.id}::${index}`; the currently-playing row can't be removed; handlers are memoized.

---

## `LyricsPanel`

Synced (LRC) or plain lyrics with auto-scroll and tap-to-seek.

- **Reads:** `usePlayer`, `usePlayerProgress`; fetches via React Query `getLyrics` (see [../api/lyrics.md](../api/lyrics.md)).
- **State:** scroll refs; a `USER_SCROLL_GRACE_MS` (3500 ms) pause on auto-scroll after the user scrolls manually.
- **Actions:** `seekTo(line.time)` on tapping a line; `refetch` on error.
- **Children:** `EmptyState`, `Skeleton`, `Button`.
- **Parent:** `NowPlaying`.
- **Quirks:** a `404` (no lyrics) is **not** retried; handles instrumental/empty/plain fallbacks; a gradient mask fades the top/bottom of the scroll area.

---

## `RelatedRail` → `PlayerRelatedRail`

The "Related" tab — an artist hero plus history-based suggestions.

- **Reads:** `usePlayer` (`history`, `currentTrack`, `playTrack`); derives suggestions via a `useRelated` memo.
- **Actions:** `playTrack`; `Link` to `/artist/:slug`.
- **Children:** internal `ArtistHero`, `TrackRow`, `SmartImage`.
- **Parent:** `NowPlaying`.
- **Quirks:** "Monthly listeners" is a **deterministic faux stat** derived from the artist name hash. Don't confuse this with the search `RelatedRail` (`SearchRelatedRail`).

---

## `Visualizer`

A canvas audio-reactive visual (bars / wave / radial).

- **Props:** `isPlaying`, `seed`, `variant` (`bars`|`wave`|`radial`), `className`, `bars`, `gradient`, `glow`, `reflection`.
- **State:** a requestAnimationFrame loop; caches the `--track-accent` value every 300 ms.
- **Parent:** **not currently wired into `NowPlaying`** (the component exists as a swap-in point).

> ⚠️ **The visualizer is fake.** Because audio plays through a YouTube iframe, the app can't feed a real `AudioContext`/analyser, so the bars are deterministic seeded noise — not a real frequency analysis. See [../known-issues.md](../known-issues.md).

---

## `VolumeControl`

Mute + volume slider pill.

- **Props:** `className`, `compact`. **Reads:** `usePlayer`. **Actions:** `toggleMute`, `setVolume`.
- **Children:** shadcn `Slider`. **Parent:** `NowPlaying`.
- **Quirks:** icon switches between `Volume2`/`Volume1`/`VolumeX` by level.

---

## `TrackHeadline`

The Now Playing title block.

- **UI:** splits the title (brackets/parens get de-emphasized), links the artist/album, and offers like + add-to-playlist.
- **Reads:** `usePlayer`.
- **Children:** `HeartButton`, `AddToPlaylistButton`.
- **Parent:** `NowPlaying`.
- **Quirks:** animates on track change; `artistSlug` comes from `player-format`.

## Key things to remember

- These components **read** shared player state; the actual audio lives in `FooterPlayer`.
- **`PlayerRelatedRail` ≠ `SearchRelatedRail`** — same base name, different purpose.
- The **visualizer is decorative**, not a real audio analysis, due to the YouTube iframe.
- `usePlayerProgress` is kept separate from `usePlayer` so per-second ticks don't re-render everything.
