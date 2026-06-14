# Components · Playlist

> **What you'll learn here:** the two reusable "add to playlist" components used throughout the app.

**Folder:** `src/components/playlist/`

Both components wrap `usePlaylistActions` and provide the "add this track to a playlist (or create a new one)" interaction. The difference is the trigger surface: a standalone button vs a nested menu item.

---

## `AddToPlaylistButton`

A `+` button that opens a popover to add the current track to a playlist or create a new one.

- **Props:** `track`, `className`, `buttonLabel`, `align`, `side`, `sideOffset`, `contentClassName`, `navigateOnCreate`, `children`.
- **Reads:** `usePlaylistActions`.
- **State:** `open`.
- **Actions:** `createPlaylistFromTrack`, `addTrackToPlaylistWithFeedback`; stops click propagation (so it doesn't trigger a row's play handler).
- **Parents:** `FooterPlayer`, `TrackHeadline`, the [Search](../pages/search.md) and [Library](../pages/library.md) pages, and many track rows.

---

## `AddToPlaylistSubmenu`

The same capability, but as a **nested submenu** for context menus and dropdowns.

- **Props:** `track`, `menuType` (`dropdown`|`context`), `triggerLabel`, `onActionComplete`, `navigateOnCreate`, `contentClassName`.
- **Reads:** `usePlaylistActions`.
- **Actions:** same as the button, plus an `onActionComplete` callback so the parent menu can close.
- **Parents:** `TrackContextMenu`, `ChartRowActions`.

## Key things to remember

- Use **`AddToPlaylistButton`** for standalone UI; use **`AddToPlaylistSubmenu`** inside a context/dropdown menu.
- Both go through `usePlaylistActions`, which handles optimistic updates + toasts. See [../state-management.md](../state-management.md).
