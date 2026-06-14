# Now Playing Page (`/player`)

> **What you'll learn here:** the full-screen player surface, its tabbed side panels, and how the URL controls which panel is open.

| | |
|--|--|
| **Route** | `/player` (e.g. `/player?panel=lyrics`) |
| **Access** | Public · inside `MainLayout` (viewport scroll is **locked** for this route) |
| **File** | `src/pages/PlayerPage.jsx` — a thin wrapper around the `NowPlaying` component |

## What it does

The immersive "Now Playing" view: large vinyl-style artwork, full transport controls, a seek bar, volume, and a tabbed side panel that switches between **Queue**, **Lyrics**, and **Related**. It's where users go to focus on the current track.

## Key components

Just `NowPlaying` (`src/components/player/NowPlaying.jsx`), which composes `AmbientBackdrop`, `TrackHeadline`, `TransportControls`, `VolumeControl`, `Tabs`, `QueuePanel`, `LyricsPanel`, `PlayerRelatedRail`, and `EmptyState`. See [../components/player.md](../components/player.md).

## Data it needs and where it comes from

- `usePlayer()` — `currentTrack`, `queue`, `isPlaying`, `seekTo`.
- `usePlayerProgress()` — `progress`, `duration` (kept separate so per-second ticks don't re-render the whole player).
- `useSearchParams()` — `?panel=queue|lyrics|related` controls the active side panel.
- The child panels (`QueuePanel`, `LyricsPanel`, `PlayerRelatedRail`) fetch their own data internally (e.g. `LyricsPanel` calls `getLyrics`).

> **Important:** the actual audio element is **not** on this page — it lives (hidden) in `FooterPlayer` so playback continues across navigation. This page is a *view* onto that shared player state.

## Page-level logic

- **Empty state** — if there's no `currentTrack`, it shows a prompt to go Home or Search.
- **Panel from URL** — the open panel is driven by `?panel=`, so links can deep-link directly to lyrics or the queue.
- **Seek preview** — dragging the slider shows a preview position before committing the seek.
- **Mobile swipe** — users can swipe between the three side panels on touch devices.

## Special behavior

- A **Ken Burns blurred backdrop** is derived from the artwork; the artwork URL is upgraded to a higher-quality YouTube thumbnail.
- The artwork spins like a vinyl record and uses `layoutId`-style shared-element transitions with the footer player.
- Honors reduced-motion preferences.

## Key things to remember

- This page **renders player state**; it does not own the audio (that's `FooterPlayer`).
- The active panel is **URL-driven** (`?panel=`), making it deep-linkable.
- Scrolling is intentionally locked here for an immersive, full-screen feel.
