# Components · Layout (App Shell)

> **What you'll learn here:** the components that form Octavia's persistent UI shell — sidebar, top bar, footer player, and the mobile navigation pieces — and the subtle performance/scroll tricks inside them.

**Folder:** `src/components/layout/`

These components wrap every routed page (except the auth pages and 404). `MainLayout` is the root that assembles them.

---

## `MainLayout`

The root app shell that wraps all routed pages.

- **UI:** fixed sidebar (desktop), sticky top bar, scrollable `<main>`, bottom footer player, and mobile bottom nav. Includes a skip link and a route-enter animation.
- **Props:** none (it renders the route `<Outlet />`).
- **Reads:** `usePlayer`, `useSettings`, `useUI`, `useLocation`; plus `useKeyboardShortcuts`, `useFirstRunHints`, `useLenisScroll`.
- **State:** `useStickyTrue` latches whether the command palette / mobile drawer were ever opened (so they mount lazily, only once needed).
- **Actions/effects:** sets the `--sidebar-w` CSS variable on `<html>`; resets scroll on pathname change; sets a `data-scrolling` flag during scroll (used to disable expensive effects — see [../styling-guide.md](../styling-guide.md)); disables smooth (Lenis) scrolling on `/player` or when reduced motion is set.
- **Children:** `RouteProgress`, `Sidebar`, `MobileDrawer` (lazy), `TopBar`, the page `<Outlet>` (inside an `ErrorBoundary`), `FooterPlayer` (in its **own** boundary), `MobileNav`, `CommandPalette` (lazy), `PlayerAnnouncer`.
- **Parent:** `App.jsx`.

> **Quirks:** The sidebar width constants (248 / 76 px) must stay in sync with `Sidebar.jsx`. It uses an enter-only page transition (no `AnimatePresence` "wait" mode) to avoid blank routes while lazy chunks load. The `/player` route locks viewport scroll and removes main padding.

---

## `Sidebar`

Desktop left navigation (visible at `lg+`, fixed position).

- **UI:** Discover + Library nav groups, pinned playlists (drag-to-reorder), settings link, and an expand/collapse toggle.
- **Props:** `onNavigate` (optional click handler).
- **Reads:** `useSettings`, `usePlaylists`, `usePlayer`, `useLocation`, `useNavigate`, `usePrefetchProps`.
- **State:** `isDesktopWide` (≥1280 px); "expanded" = `settings.sidebarExpanded && isDesktopWide`.
- **Actions:** route navigation; create-playlist-then-navigate; `reorderPlaylists`; persists `sidebarExpanded`.
- **Children:** `LogoMark`, `Wordmark`, internal `NavItem`, `SortablePinnedPlaylist` (dnd-kit).
- **Parent:** `MainLayout`.

> **Quirks:** Active-route matching is nested (`/library` also highlights for `/playlist/...`). The "Now Playing" entry shows animated bars when `isPlaying`. Collapsed mode hides the scrollbar so icons don't touch the scroll line.

---

## `TopBar`

The sticky header on every shell page.

- **UI:** mobile menu/back button, desktop back/forward + breadcrumb, an instant-search popover, favorites shortcut, a notifications bell, and the auth/account menu.
- **Props:** none.
- **Reads:** `useUI`, `useSettings`, `usePlayer`, `useAuth`, `useNotifications`, `useSounds`, `useInstantSearch`, `useSearchSuggestions`, `useTrendingSearches`, `useHoverPrefetch`.
- **State:** `searchValue`, `searchOpen`, navigation history index/length.
- **Actions:** `navigate` (with view transitions), `playTrack`, `addToQueue`, `openPalette`, `openMobileDrawer`, `logoutUser`, notification `markAllRead` / `clearNotifications`.
- **Children:** internal `Breadcrumb`, `TrendingChips`, `VoiceSearchButton`, `SearchHighlight`, `SmartImage`, plus shadcn `DropdownMenu`/`Popover`/`Tooltip`.
- **Parent:** `MainLayout`.

> **Quirks:** Autocomplete suggestions only show when the top result's score is weak. `Ctrl/Cmd+Enter` queues a song instead of playing. Below the phablet breakpoint it collapses search into a shortcut button.

---

## `FooterPlayer`

The global playback chrome — and the **home of the actual audio element**.

- **UI:** desktop full footer; on mobile a compact mini-bar above `MobileNav`. Hidden on `/player`. Hosts the hidden `ReactPlayer` (YouTube) that produces the sound for the whole app.
- **Props:** none.
- **Reads:** `usePlayer`, `usePlayerProgress`, `useSettings`, `useTransportActions`, `usePlaybackLoading`, `useColorExtraction`.
- **State:** `fadeGain` (crossfade), `seekPreview`, `mobileSheetOpen`, long-press refs, a crossfade controller.
- **Actions:** full transport, seek, volume, queue popover, **Media Session API** (lock-screen controls), background-playback resume, audio-quality selection, and `navigate('/player')`.
- **Children:** `ReactPlayer`, `FooterPlaybackEffects`, `FooterDesktopTrackButton`, `FooterDesktopSeek`, `FooterMobileRing`, `FooterMobileStrip`, `ProgressRing`, `QueuePanel`, `HeartButton`, `AddToPlaylistButton`, `MobileMiniPlayerSheet`.
- **Parent:** `MainLayout` (in an isolated `ErrorBoundary` so a player crash never takes down the whole app).

> **Quirks:** Progress subscribers are split out so a per-second tick doesn't re-render the whole footer. A ~500 ms long-press opens the mobile quick-actions sheet. An invalid `videoId` shows an error footer with a "Try next" action. It deliberately omits Media Session seek-backward/forward to keep the Android notification layout clean. **This is the single most important component for playback** — the audio comes from here.

---

## `MobileNav`

Five-tab bottom bar (hidden at `lg`): Home, Search, Trending, Player, Library.

- **Props/state:** none. **Actions:** route navigation via the custom `NavLink`. **Children:** `NavLink`, internal `MobileNavItem`. **Parent:** `MainLayout`.
- **Quirks:** uses a render-prop `NavLink` for active styling; prefetches each tab's route chunk.

---

## `MobileDrawer`

Left slide-out nav (hamburger) mirroring the sidebar.

- **UI:** sidebar groups + pinned playlists + settings, in a shadcn `Sheet`.
- **Reads:** `useUI` (`mobileDrawerOpen`, `closeMobileDrawer`), `usePlaylists`.
- **Children:** `Sheet`, `LogoMark`, `Wordmark`, `NavLink`.
- **Parent:** `MainLayout` (lazy, only mounted once the drawer has been opened).
- **Quirks:** read-only playlist list (no create/reorder, unlike the desktop sidebar).

---

## `MobileMiniPlayerSheet`

A bottom sheet (hidden at phablet+) opened by long-pressing the mobile mini-player.

- **Props:** `open`, `onClose`.
- **Reads:** `usePlayer`, `useTransportActions`, `usePlaylistActions`.
- **Actions:** shuffle/repeat, volume, add/create playlist, navigate to `/player` or `/player?panel=queue`.
- **Parent:** `FooterPlayer`.
- **Quirks:** Escape dismisses it; it closes automatically when navigating to `/player`.

## Key things to remember

- **`FooterPlayer` owns the audio** and lives in its own error boundary — never move the `ReactPlayer` out of it.
- The `data-scrolling` flag set by `MainLayout` is what keeps scrolling smooth; respect it when adding visual effects.
- Sidebar width constants must match between `MainLayout` and `Sidebar`.
