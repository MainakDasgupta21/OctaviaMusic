# Backend Setup Guide

The frontend talks to an Express 4 API in [`server/`](server/) (`http://localhost:5000` in
dev). The backend now includes:

- live YouTube Music catalog/search endpoints
- JWT auth with refresh-token rotation
- MongoDB Atlas persistence for user accounts and per-user library data
- role-based admin routes

## Quick start

```bash
cd server
npm install
npm run dev
```

The backend reads `../.env` automatically (`node --env-file=../.env ...`).

## MongoDB Atlas setup

1. Create a free Atlas cluster.
2. Create a database user with read/write permissions.
3. Add your connection URI to `MONGODB_URI` in `.env`.
4. Add strong JWT secrets (32+ random bytes each).
5. Start the server and confirm `GET /health` returns `200`.

## Required environment variables

Add these to `.env` (see `.env.example`):

| Env var | Example/default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb+srv://...` | Atlas connection string |
| `JWT_ACCESS_SECRET` | random 32+ bytes | Sign access tokens |
| `JWT_REFRESH_SECRET` | random 32+ bytes | Sign refresh tokens |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL` | `30d` | Refresh token lifetime |
| `BCRYPT_ROUNDS` | `12` | Password hash cost (minimum 12) |
| `CORS_ORIGIN` | `http://localhost:8080` | Allowed frontend origin (cookie auth) |
| `COOKIE_SECURE` | `true` in production | Secure cookie flag |
| `COOKIE_DOMAIN` | empty unless needed | Optional cookie domain |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `60000` | Auth rate limit window |
| `AUTH_RATE_LIMIT_MAX` | `10` | Max auth attempts per window |

Production startup fails fast when required auth secrets are missing.

## Auth token strategy

- Access token cookie: `accessToken`, `httpOnly`, `SameSite=Lax`, `Secure` in prod
- Refresh token cookie: `refreshToken`, same flags, `Path=/api/auth`
- CSRF cookie: `csrfToken` (double-submit with `x-csrf-token` on mutating requests)
- Access payload: `{ sub, role, jti }`
- Refresh payload: `{ sub, jti }`
- Refresh rotation on every `/api/auth/refresh`
- Refresh reuse detection revokes all refresh sessions for that user

## Auth and user routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `PATCH /api/users/me`
- `GET/POST/DELETE /api/me/favorites[/:trackId]`
- `GET/POST/DELETE /api/me/liked-albums[/:albumId]`
- `GET/POST/DELETE /api/me/followed-artists[/:artistId]`
- `GET/POST/PATCH/DELETE /api/me/playlists[/:id]`
- `POST /api/me/playlists/:id/tracks`
- `DELETE /api/me/playlists/:id/tracks/:trackId`
- `PATCH /api/me/playlists/:id/tracks/reorder`
- `GET/POST /api/me/history`
- `GET/PATCH /api/me/settings`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`

All `/api/me/*` and `/api/admin/*` routes require auth; admin routes also require `role=admin`.

## cURL examples (cookie flow)

Use a cookie jar so refresh/access cookies persist between calls:

```bash
# register
curl -i -c cookies.txt -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@example.com\",\"username\":\"demo\",\"displayName\":\"Demo\",\"password\":\"Password123!\"}"

# login
curl -i -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@example.com\",\"password\":\"Password123!\"}"

# refresh
curl -i -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/refresh
```

For mutating protected routes, include CSRF header:

```bash
curl -i -b cookies.txt -X PATCH http://localhost:5000/api/users/me \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <csrfToken cookie value>" \
  -d "{\"displayName\":\"Updated Name\"}"
```

## Seed an admin user

```bash
# Windows PowerShell
$env:ADMIN_BOOTSTRAP_EMAIL="admin@example.com"
$env:ADMIN_BOOTSTRAP_PASSWORD="replace-with-strong-password"
npm run seed:admin
```

```bash
# macOS/Linux
ADMIN_BOOTSTRAP_EMAIL=admin@example.com \
ADMIN_BOOTSTRAP_PASSWORD=replace-with-strong-password \
npm run seed:admin
```

The script creates the user if missing, or upgrades an existing user to admin.

## Testing

```bash
# backend unit tests
npm run test:run
```

From repo root:

```bash
npm run test:run
npm --prefix server run test:run
```
