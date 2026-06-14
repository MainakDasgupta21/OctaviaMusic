# Getting Started

> **What you'll learn here:** how to get Octavia running on your own machine from scratch — system requirements, install, configure, run, test, build, and how to fix the common problems new developers hit. Written so a junior developer can follow it without help.

By the end you'll have:
- the **frontend** at `http://localhost:8080`
- the **backend API** at `http://localhost:5000`

---

## 1. System requirements

| Requirement | Version / notes |
|-------------|-----------------|
| **Node.js** | **20.6 or newer** (the backend scripts use Node's `--env-file` flag, added in 20.6). Node 22 LTS is recommended. |
| **npm** | Comes bundled with Node. |
| **Git** | To clone the repository. |
| **OS** | Windows, macOS, or Linux all work. (The project includes Windows-specific tweaks — see notes below.) |
| **MongoDB** | *Optional for browsing.* Required only if you want login + personal library (favorites, playlists). Use a free MongoDB Atlas cluster or a local MongoDB. |
| **Internet access** | Required — the backend calls YouTube Music, Last.fm, MusicBrainz, and LRCLib live. |

Check your Node version:

```bash
node --version   # should print v20.6.0 or higher
```

---

## 2. Clone the repository

```bash
git clone <your-repo-url> harmony-hub
cd harmony-hub
```

---

## 3. Install dependencies

This is a **monorepo with two apps**, so you install dependencies twice — once for the frontend (repo root) and once for the backend (`server/`).

```bash
# Frontend dependencies (run from repo root)
npm install

# Backend dependencies
npm --prefix server install
```

> `npm --prefix server install` runs `npm install` inside `server/` without changing your current directory. You could also `cd server && npm install && cd ..`.

---

## 4. Set up environment variables

Copy the documented template to a real `.env` file at the **repository root**:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

> **One file, both apps:** The frontend reads `VITE_*` variables. The backend scripts in `server/package.json` load `../.env` (the **root** file), *not* `server/.env`. So keep everything in the single root `.env`.

For a minimal "just let me browse music" setup, these are enough:

```bash
VITE_API_BASE=http://localhost:5000/api
LASTFM_API_KEY=your-lastfm-key   # only needed for /charts; get one free at last.fm/api
```

Everything else has sensible defaults. To enable **login and a personal library**, you'll also need `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` (see step 7). For the full list of every variable and what it does, read **[environment-variables.md](./environment-variables.md)**.

---

## 5. Run the development servers

You need **two terminals** (one per app). Both support hot reload.

**Terminal 1 — backend** (from repo root):

```bash
npm --prefix server run dev
```
You should see: `Backend running on http://localhost:5000` and, shortly after, a `[warmup] YTMusic ready...` line.

**Terminal 2 — frontend** (from repo root):

```bash
npm run dev
```
Vite prints a local URL. Open **http://localhost:8080**.

> **Order doesn't strictly matter,** but starting the backend first means the first home/search request won't fail while the API boots.

---

## 6. Verify everything works

When it's working you should see:
1. The Octavia home page renders at `/` with rails of trending tracks, charts, and genres.
2. Searching in the top bar (or `/search`) returns results.
3. Clicking a track starts playback and the **footer player** appears and plays audio.
4. `/charts` shows ranked songs/artists (needs `LASTFM_API_KEY`).

Quick API smoke tests (in a third terminal):

```bash
curl http://localhost:5000/health
# → {"status":"ok"}

curl "http://localhost:5000/api/search?q=daft%20punk&type=song"
# → JSON with results

curl "http://localhost:5000/api/trending?limit=5"
# → JSON list of trending tracks
```

---

## 7. (Optional) Enable login + personal library

The catalog works without a database, but **favorites, playlists, settings sync, and accounts need MongoDB**.

1. Create a free **MongoDB Atlas** cluster and a database user (or run MongoDB locally).
2. Add these to your root `.env`:

```bash
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/octavia
JWT_ACCESS_SECRET=<32+ random bytes>
JWT_REFRESH_SECRET=<32+ random bytes>   # must differ from the access secret
COOKIE_SECURE=false                      # allow cookies over http during local dev
```

Generate strong secrets quickly:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

3. Restart the backend. You should see it connect to MongoDB.
4. (Optional) Create an admin account so you can access `/admin`:

```bash
# macOS / Linux
ADMIN_BOOTSTRAP_EMAIL=admin@example.com ADMIN_BOOTSTRAP_PASSWORD=a-strong-password \
  npm --prefix server run seed:admin

# Windows (PowerShell)
$env:ADMIN_BOOTSTRAP_EMAIL="admin@example.com"; $env:ADMIN_BOOTSTRAP_PASSWORD="a-strong-password"; npm --prefix server run seed:admin
```

> The seed script reads these from the environment (or from your `.env`). After it runs, you can register/log in through the UI and that account will be an admin.

See [authentication.md](./authentication.md) for how the whole auth flow works.

---

## 8. Run the tests

**Frontend** (from repo root):

```bash
npm run test         # watch mode (re-runs on change)
npm run test:run     # single run (use this in CI)
```

**Backend:**

```bash
npm --prefix server run test:run
```

> Note: a small number of Explore-page frontend tests are currently known to fail due to a test-harness provider issue (not a product bug). See [known-issues.md](./known-issues.md).

---

## 9. Build for production

**Frontend** (outputs static files to `dist/`):

```bash
npm run build      # production build (also emits .gz and .br compressed assets)
npm run preview    # serve the built dist/ locally to sanity-check it
```

**Backend** (run the server in production mode):

```bash
npm --prefix server run start   # loads ../.env, runs node index.js
```

For production, set `VITE_API_BASE` to your deployed API URL before building, configure `CORS_ORIGIN` to your frontend origin, and set `COOKIE_SECURE=true`. The frontend `dist/` can be served by any static host; the API runs as a Node process.

---

## 10. Common problems & fixes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Cannot use --env-file` or backend won't start | Node older than 20.6 | Upgrade Node to 20.6+ (22 LTS recommended). |
| Home/search shows "offline" or errors | Backend not running, or wrong `VITE_API_BASE` | Start the backend; confirm `VITE_API_BASE=http://localhost:5000/api`. |
| `/charts` is empty or errors | Missing `LASTFM_API_KEY` | Add a free Last.fm key to `.env` and restart the backend. |
| Login fails / "Service unavailable" (503) | No `MONGODB_URI`, or DB unreachable | Set a valid `MONGODB_URI`; the DB must be reachable for `/auth` and `/me` routes. |
| Login "works" but you get logged out / 401 loops locally | Cookies blocked over http | Set `COOKIE_SECURE=false` in dev. |
| CORS errors in the browser console | Frontend origin not allowlisted | Add your frontend origin to `CORS_ORIGIN` (localhost is always allowed). |
| Edits don't hot-reload (especially on Windows) | Native FS events missed | Already mitigated by `watch.usePolling` in `vite.config.ts`; if it still happens, restart `npm run dev`. |
| First search/charts request is slow | Cold in-memory cache + live upstream | Expected. The backend warms up on boot and caches; subsequent requests are fast. |
| Port 8080 or 5000 already in use | Another process is using it | Stop that process, or change the port (`server.port` in `vite.config.ts` for the frontend, `PORT` env for the backend). |

---

## 11. Platform notes (Windows)

- `vite.config.ts` enables **polling file-watch** (`watch.usePolling`) to avoid missed HMR updates on Windows/networked filesystems.
- Use PowerShell syntax for setting env vars inline (`$env:NAME="value"; command`) instead of the Unix `NAME=value command` form.

---

## What's next

- Understand the design: **[architecture.md](./architecture.md)**
- Learn where everything lives: **[folder-structure.md](./folder-structure.md)**
- Understand state + data flow: **[state-management.md](./state-management.md)** and **[data-flow.md](./data-flow.md)**

---

## Key things to remember

1. **Install dependencies twice** — root (frontend) and `server/` (backend).
2. **One `.env` at the repo root** serves both apps.
3. **Two terminals** to run both dev servers; frontend on **8080**, backend on **5000**.
4. **Browsing works without a database**; login/library needs `MONGODB_URI` + JWT secrets.
5. **Set `COOKIE_SECURE=false` locally** so cookie auth works over http.
6. **Node 20.6+ is mandatory** (the `--env-file` flag).
