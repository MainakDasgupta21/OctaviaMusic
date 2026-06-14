# API · Authentication

> **What you'll learn here:** every `/api/auth/*` endpoint — register, login, refresh, logout, change-password, and `me` — with their inputs, cookies, and errors.

| | |
|--|--|
| **Route file** | `server/src/routes/auth.routes.js` |
| **Controller** | `server/src/controllers/auth.controller.js` |
| **Service** | `server/src/services/auth.service.js` |

All auth routes use **`requireDatabaseConnection`** (return `503` if MongoDB is down). For the full conceptual flow (JWT-in-cookies, CSRF, token rotation, reuse detection), read [../authentication.md](../authentication.md).

> **Cookies set on success:** `accessToken` (≈15m), `refreshToken` (≈30d), and `csrfToken`. All HttpOnly except `csrfToken` (which the SPA must read to echo back in the `x-csrf-token` header).

---

## `POST /api/auth/register`

Create an account and start a session.

**Auth:** Public · `authRegisterLimiter` (5/IP/min).

**Body** (`registerSchema`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string (email) | yes | |
| `username` | string | yes | 3–32 chars, `[a-zA-Z0-9._-]` |
| `password` | string | yes | 8–128 chars |
| `displayName` | string | no | 1–80 chars |

**Response (201):** `{ user, csrfToken }` + session cookies.
**Errors:** `400` validation; `409` duplicate email/username; `429`; `503`.
**Called by:** `registerAccount()` → `AuthContext` → [Register page](../pages/auth.md).

---

## `POST /api/auth/login`

**Auth:** Public · `authLimiter` (10/min, keyed `ip:email`).
**Body** (`loginSchema`): `email`, `password` (both required).
**Response (200):** `{ user, csrfToken }` + session cookies.
**Errors:** `400`; `401` `"Invalid credentials"`; `429`; `503`.
**Called by:** `loginAccount()` → `AuthContext` → [Login page](../pages/auth.md).

---

## `POST /api/auth/refresh`

Exchange a refresh token for a fresh access token (and a rotated refresh token).

**Auth:** Public (uses the refresh token itself, not the access token) · `authLimiter`.
**Body** (`refreshSchema`): `refreshToken` (optional — can instead use the `refreshToken` cookie).
**Response (200):** `{ user, csrfToken }` + new session cookies.
**Errors:** `401` (`Refresh token is required`, `Invalid refresh token`, `Session expired...`); `429`.
**Called by:** `refreshSession()` — invoked automatically by the axios 401 interceptor in `src/lib/api.js`.

> **Token rotation + reuse detection:** each refresh issues a new refresh token and invalidates the old one. Re-using an already-rotated token is treated as theft and revokes all sessions. See [../authentication.md](../authentication.md).

---

## `POST /api/auth/logout`

**Auth:** `requireAuth` + `requireCsrf`.
**Body:** optional `refreshToken` (or cookie).
**Response:** `204` (clears session cookies).
**Errors:** `401`; `403` (CSRF, cookie auth).
**Called by:** `logoutSession()` → `AuthContext`.

---

## `POST /api/auth/logout-all`

Revokes **all** refresh tokens for the user (logs out every device).

**Auth:** `requireAuth` + `requireCsrf`. **Response:** `204`. **Errors:** `401`; `403`.
**Called by:** `logoutAllSessions()` in `api.js` (no UI caller wired in yet).

---

## `POST /api/auth/change-password`

**Auth:** `requireAuth` + `requireCsrf`.
**Body** (`changePasswordSchema`): `currentPassword`, `newPassword` (8–128 each).
**Response:** `204` — and **clears all sessions**, so the user must log in again.
**Errors:** `400` (new == current); `401` (wrong current password); `403` (CSRF).
**Called by:** direct `api.post('/auth/change-password', …)` → [Account page](../pages/account.md).

---

## `GET /api/auth/me`

Returns the current user; also ensures a CSRF token is available (important for cross-site SPA hydration).

**Auth:** `requireAuth`.
**Response (200):** `{ user, csrfToken }` where `user` = `{ id, email, username, displayName, avatarUrl, role, settings, createdAt, updatedAt, lastLoginAt }`.
**Errors:** `401`; `503`.
**Called by:** `getCurrentUser()` → `AuthContext` (session hydration on app load).

## Key things to remember

- Sessions are **cookie-based** (HttpOnly); the SPA never stores the JWT in JS-readable storage.
- **Mutating auth routes require CSRF** when using cookie auth.
- **Changing the password logs you out everywhere** by design.
