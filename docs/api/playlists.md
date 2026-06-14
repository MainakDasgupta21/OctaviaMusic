# API · Public Playlists (Sharing)

> **What you'll learn here:** the two public playlist endpoints behind the share-a-playlist feature.

| | |
|--|--|
| **Route file** | `server/src/routes/playlists.routes.js` |
| **Controller** | `server/src/controllers/library.controller.js` |

These endpoints handle **publicly shared** playlists, separate from the owner-only `/api/me/playlists` routes (see [me.md](./me.md)). A playlist becomes shareable when its owner sets `visibility: 'public'`, which assigns it a `shareId` token.

---

## `GET /api/playlists/shared/:shareId`

Read-only access to a public playlist by its share token.

**Auth:** **Public** (only `requireDatabaseConnection`).

**Path params:** `shareId` (string, required).

**Response:** `{ item: { ...playlistDTO, owner: { displayName } } }`.

**Errors:** `404` (not found or not public); `503`.

**Called by:** `getSharedPlaylist()` → [Shared Playlist page](../pages/shared-playlist.md).

---

## `POST /api/playlists/shared/:shareId/copy`

Clones a public playlist into the authenticated user's own library (always created as **private**).

**Auth:** `requireAuth` + `requireCsrf`.

**Path params:** `shareId`.

**Response:** `201 { item }` — the newly-created playlist.

**Errors:** `401` (not signed in); `403` (CSRF); `404`; `503`.

**Called by:** `copySharedPlaylist()` → `PlaylistContext.jsx`.

## Key things to remember

- **Viewing** a shared playlist is public; **copying** it requires sign-in.
- A copied playlist is independent and **private** — later edits by the original owner don't affect it.
- The `shareId` is a separate token from the owner's internal playlist `id`.
