# Components · Common / Shared

> **What you'll learn here:** the app-wide utility components used across many pages — error boundaries, the image wrapper, the heart button, the command palette, and more.

**Folders:** top-level `src/components/`, `src/components/common/`, `src/components/brand/`

Some of these have both a top-level file and a `common/` re-export (a leftover from a folder reorganization — see [../folder-structure.md](../folder-structure.md)).

---

## `ErrorBoundary`

Catches render errors in its subtree and shows a fallback instead of a blank screen.

- **Files:** `src/components/ErrorBoundary.jsx` (re-exported by `common/ErrorBoundary.jsx`).
- **Props:** `children`, `fallback({ error, reset })` (render prop), `onError(error, info)`.
- **State:** `error`.
- **Actions:** `reset`; the default fallback offers `window.location.assign('/')`.
- **Parents:** `App.jsx` (global), and `MainLayout` (one around the routed page, plus a separate **silent** one around `FooterPlayer` so a player crash doesn't break the app).

---

## `RouteHead`

Sets per-route `<title>` and meta via `react-helmet-async`.

- **Reads:** `useLocation`. **Parent:** `App.jsx`.

---

## `SettingsEffects`

Applies user preferences to the `<html>` element: theme, reduced motion, text size, and accent palette.

- **Reads:** `useSettings`; uses `lockPalette`/`unlockPalette`.
- **Renders:** `null` (it's an effects-only component).
- **Parent:** `App.jsx`.

> This is the bridge between the Settings context and the actual CSS — see [../styling-guide.md](../styling-guide.md).

---

## `TitleCardIntro`

A one-time brand splash on first load (`octavia.intro.v5.seen` in `localStorage`); skipped under reduced motion.

- **Children:** `LogoMark`, `Wordmark`. **Parent:** `App.jsx`.

---

## `SmartImage`

The image wrapper used **everywhere** — sanitizes URLs, provides a fallback chain, `srcSet`, a loading skeleton, and an optional hover ring.

- **Props:** `src`, `alt`, `className`, `imgClassName`, `rounded`, `loading`, `kind`, `fallbackSrc`, `hash`, `interactive`, `sizes`, plus passthrough `<img>` attrs.
- **State:** `loaded`, `chainIndex` (which fallback it's on).
- **Parents:** Home, Search, Player, Charts — basically all media-bearing UI.

> Prefer `SmartImage` over a raw `<img>` so you get the fallback chain and skeleton for free (catalog thumbnails are flaky — see [../known-issues.md](../known-issues.md)).

---

## `HeartButton`

Toggles a track favorite, with a particle burst, sound effect, and toast.

- **Props:** `track`, `size` (`sm`|`md`|`lg`), `className`.
- **Reads:** `useFavorites`, `useSounds`.
- **Parents:** track rows, `FooterPlayer`, `TrackHeadline`, the Favorites page, etc.

---

## `TrackContextMenu`

A right-click wrapper offering: play, queue, add-to-playlist, go-to-artist/album, like, share, copy.

- **Props:** `track`, `children`, `onShareLink` (optional URL factory).
- **Reads:** `usePlayer`, `useFavorites`.
- **Children:** `AddToPlaylistSubmenu`, shadcn context menu.
- **Parents:** the Favorites page and various track lists.

---

## `CommandPalette`

The `Cmd/Ctrl+K` modal for navigation, playback, search, and playlists.

- **UI:** scoped prefixes — `:` (commands), `>` (navigate), `@` (artists), `#` (playlists), `?` (help).
- **Reads:** `useUI`, `usePlayer`, `useFavorites`, `usePlaylistActions`, `useRankedSearch`, and more.
- **State:** query, recents (`octavia.palette.recent.v1`), selection index.
- **Children:** `cmdk` `Command`, shadcn `Dialog`, `Kbd`, `SmartImage`, `SearchHighlight`.
- **Parent:** `MainLayout` (lazy — only mounts once opened).

---

## `SearchHighlight`

Wraps matched query tokens in `<mark>` (diacritic-folded matching).

- **Props:** `text`, `tokens`, `className`, `markClassName`.
- **Parents:** TopBar, Search page, CommandPalette.

---

## `NavLink`

A `react-router` `NavLink` enhanced with view-transition navigation and function-style `className`/`children`.

- **Props:** standard NavLink props + `activeClassName`, `pendingClassName`.
- **Parent:** `MobileNav` (the desktop `Sidebar` uses the raw react-router `NavLink`).

---

## `PlayerAnnouncer`

A screen-reader-only `aria-live` region announcing the current track and play/pause state.

- **Reads:** `usePlayer`. **Parent:** `MainLayout`.

---

## `Logo` (`brand/Logo.jsx`)

The brand mark and wordmark.

- **Exports:** `LogoMark`, `Wordmark`, `LogoLockup` (default = `LogoMark`).
- **Props:** `LogoMark` — `size`, `variant` (`solid`|`outline`|`mono`), `animated`. `Wordmark` — `size`, `variant`.
- **Parents:** `Sidebar`, `MobileDrawer`, `TitleCardIntro`, `NotFound`.

## Key things to remember

- **Always use `SmartImage`** for catalog art — it handles flaky thumbnails gracefully.
- `FooterPlayer` is wrapped in its **own silent `ErrorBoundary`** so playback crashes don't break the page.
- `SettingsEffects` is the **invisible bridge** that applies preferences to the DOM.
- The `CommandPalette` (`Cmd/Ctrl+K`) is the power-user entry point and supports scoped prefixes.
