# API · Admin

> **What you'll learn here:** the admin-only user-management endpoints.

| | |
|--|--|
| **Route file** | `server/src/routes/admin.routes.js` |
| **Controller** | `server/src/controllers/admin.controller.js` |

**Router-level middleware:** every route runs **`requireDatabaseConnection`** + **`requireAuth`** + **`requireRole('admin')`**. Non-admins get `403`. Mutations also require CSRF under cookie auth.

---

## `GET /api/admin/users`

Lists users.

**Query:** `limit?` (1–200, default 100).
**Response:** `{ items: [{ id, email, username, displayName, avatarUrl, role, createdAt, updatedAt, lastLoginAt }] }`.
**Errors:** `401`; `403`; `503`.
**Called by:** [Admin page](../pages/admin.md) → `api.get('/admin/users')`.

---

## `PATCH /api/admin/users/:id/role`

Promote/demote a user.

**Path:** `id` (user id). **Body:** `{ role: "user" | "admin" }`.
**Response:** `{ user }`.
**Errors:** `400`; `401`; `403`; `404`; `503`; CSRF on cookie auth.
**Called by:** Admin page.

---

## `DELETE /api/admin/users/:id`

Deletes a user **and all their library data** (favorites, liked albums, followed artists, playlists, listening history, search history).

**Path:** `id`. **Response:** `204`.
**Errors:** `401`; `403`; `404`; `503`; CSRF.
**Called by:** Admin page.

## Key things to remember

- Protected at **two layers**: frontend `RoleRoute` + backend `requireRole('admin')`.
- Deleting a user **cascades** to all of their library collections.
