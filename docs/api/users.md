# API · Users (Profile)

> **What you'll learn here:** the single profile-update endpoint and how it differs from `/api/me/settings`.

| | |
|--|--|
| **Route file** | `server/src/routes/users.routes.js` |
| **Controller** | `server/src/controllers/user.controller.js` → `library.service.updateCurrentUser` |

---

## `PATCH /api/users/me`

Updates profile fields on the **User document** itself (distinct from `/api/me/settings`, which only writes to `user.settings`).

**Auth:** `requireDatabaseConnection` + `requireAuth` + `requireCsrf`.

**Body** (`updateCurrentUserSchema`, at least one field):

| Field | Type | Notes |
|-------|------|-------|
| `displayName` | string | 1–80 chars |
| `avatarUrl` | string \| null | http(s) URL, base64 data URL, or `null`; **max ~400 KB** |
| `email` | string (email) | must be unique |
| `settings` | object | full `settingsSchema` |

**Response:** `{ user }` (the safe user JSON, with sensitive fields stripped).

**Errors:** `400` validation; `401`; `403` CSRF; `404`; `409` (email already taken); `503`.

**Called by:** `AuthContext.jsx` → `api.patch('/users/me', patch)` (profile + avatar updates from [Account](../pages/account.md) and [Settings](../pages/settings.md)).

## Key things to remember

- Use this for **identity** (name, email, avatar); use [`/api/me/settings`](./me.md) for **preferences**.
- Avatar payloads are capped (~400 KB) within the global 1 MB body limit. Oversized images are rejected on both client and server.
