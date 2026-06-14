# API · Me (User Library)

> **What you'll learn here:** all the `/api/me/*` endpoints that store a signed-in user's personal data — favorites, liked albums, followed artists, playlists, history, searches, and settings.

| | |
|--|--|
| **Route file** | `server/src/routes/me.routes.js` |
| **Controller** | `server/src/controllers/library.controller.js` |
| **Service** | `server/src/services/library.service.js` |
| **Models** | See [../database.md](../database.md) |

**Router-level middleware:** every route here runs **`requireDatabaseConnection`** + **`requireAuth`**. Mutating routes (POST/PATCH/DELETE) also run **`requireCsrf`** when using cookie auth. So all of these are **per-user and require sign-in**.

Common error codes across this group: `400` (validation), `401` (not signed in), `403` (CSRF), `404` (not found / not owned), `503` (DB down).

---

## Favorites

| Method + path | Handler | Input | Response |
|---|---|---|---|
| `GET /api/me/favorites` | `listFavorites` | — | `{ items: FavoriteDTO[] }` |
| `POST /api/me/favorites` | `createFavorite` | `{ track: <trackSchema> }` | `201 { item }` |
| `DELETE /api/me/favorites/:trackId` | `deleteFavorite` | `trackId` (path) | `204` |

**`trackSchema`** fields: `id` (required), `title` (required), `videoId`, `artist`, `artistId`, `artistSlug`, `albumId`, `thumbnail`, `duration`.
**Favorite item JSON:** `{ id, videoId, title, artist, …, addedAt }`.
**Called by:** `FavoritesContext.jsx` → [Favorites page](../pages/favorites.md).

---

## Liked albums

| Method + path | Handler | Input | Response |
|---|---|---|---|
| `GET /api/me/liked-albums` | `listLikedAlbums` | — | `{ items }` |
| `POST /api/me/liked-albums` | `createLikedAlbum` | `{ album: { id, title, artist?, artistSlug?, thumbnail?, year? } }` | `201 { item }` |
| `DELETE /api/me/liked-albums/:albumId` | `deleteLikedAlbum` | `albumId` (path) | `204` |

**Called by:** `LikedAlbumsContext.jsx`. (Tracklists aren't stored — the Library fetches them on demand.)

---

## Followed artists

| Method + path | Handler | Input | Response |
|---|---|---|---|
| `GET /api/me/followed-artists` | `listFollowedArtists` | — | `{ items }` |
| `POST /api/me/followed-artists` | `createFollowedArtist` | `{ artist: { id, name, slug?, thumbnail? } }` | `201 { item }` |
| `DELETE /api/me/followed-artists/:artistId` | `deleteFollowedArtist` | `artistId` (path) | `204` |

**Called by:** `FollowedArtistsContext.jsx`.

---

## Playlists (owned)

| Method + path | Handler | Input | Response |
|---|---|---|---|
| `GET /api/me/playlists` | `listPlaylists` | — | `{ items: PlaylistDTO[] }` |
| `POST /api/me/playlists` | `createPlaylist` | `playlistInputSchema`: `name` (req), `description?`, `pinned?`, `visibility?` (`private`\|`public`), `tracks?[]`, `id?` | `201 { item }` |
| `PATCH /api/me/playlists/:id` | `updatePlaylist` | `name?`, `description?`, `pinned?`, `visibility?` (≥1 field) · **ownership** | `{ item }` |
| `DELETE /api/me/playlists/:id` | `deletePlaylist` | ownership | `204` |
| `POST /api/me/playlists/:id/tracks` | `addPlaylistTrack` | `{ track }` · ownership | `{ item }` |
| `DELETE /api/me/playlists/:id/tracks` | `removePlaylistTrack` | body `{ trackId }` · ownership | `{ item }` |
| `PATCH /api/me/playlists/:id/tracks` | `reorderPlaylistTracks` | `{ trackIds: string[] }` (min 1) · ownership | `{ item }` |

**Playlist DTO:** `{ id, name, description, pinned, visibility, shareId, tracks[], createdAt, updatedAt }`.
**Extra errors:** `404` (not found / not owned — enforced by `requireOwnership`), `409` (shareId collision).
**Called by:** `PlaylistContext.jsx` → [Playlist page](../pages/playlist.md), Sidebar, Library.

> Note: **public** playlist viewing/copying lives under a different router — see [playlists.md](./playlists.md).

---

## Listening history

| Method + path | Handler | Input | Response |
|---|---|---|---|
| `GET /api/me/history` | `listHistory` | `limit?` (1–200) | `{ items }` (server stores max **20**) |
| `POST /api/me/history` | `createHistoryEntry` | `{ track, playedAt? }` (unix ms) | `201 { item }` |

**Called by:** `PlayerContext.jsx`. History is capped at 20 entries server-side (oldest evicted).

---

## Search history

| Method + path | Handler | Input | Response |
|---|---|---|---|
| `GET /api/me/searches` | `listSearchHistory` | `limit?` (1–50) | `{ items: [{ id, query, searchedAt }] }` |
| `POST /api/me/searches` | `createSearchHistory` | `{ query }` (1–160 chars) | `201 { item }` |
| `DELETE /api/me/searches` | `deleteSearchHistory` | `query?` (query param) | `204` |

For `DELETE`: with a `query` param it removes that one term; without it, it clears all.
**Called by:** `SearchHistoryContext.jsx`.

---

## Settings

| Method + path | Handler | Input | Response |
|---|---|---|---|
| `GET /api/me/settings` | `getSettings` | — | `{ settings }` |
| `PATCH /api/me/settings` | `updateSettings` | `settingsPatchSchema` (any subset, ≥1 field) | `{ settings }` |

**`settingsSchema` fields:** `theme`, `accentColor`, `autoplay`, `crossfadeSeconds`, `highQualityAudio`, `reduceMotion`, `notifyNewReleases`, `notifyPlaylistUpdates`, `displayName`, `email`, `sidebarExpanded`, `textSize`, `vimNavigation`, `soundEffects`.
**Called by:** `SettingsContext.jsx` → [Settings page](../pages/settings.md).

> **`/api/me/settings` vs `/api/users/me`:** this endpoint only touches `user.settings`; profile/avatar updates go through [users.md](./users.md).

## Key things to remember

- **All `/me/*` routes require sign-in** and operate strictly on the calling user's own data.
- **Mutations need CSRF** (cookie auth).
- Listening history is **capped at 20** server-side.
- The frontend calls these via context providers (no `api.js` wrapper functions).
