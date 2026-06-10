# Getting Started

This guide gets a new contributor from a clean machine to a working local
environment for both app layers:

- frontend: Vite + React on `http://localhost:8080`
- backend: Express API on `http://localhost:5000`

If you want the full system context after setup, continue with
[Architecture](./architecture.md).

## Prerequisites

- Node.js `20.6+` (backend scripts use Node's `--env-file` flag)
- npm (comes with Node)
- Network access to external providers used by the backend:
  - YouTube Music (`ytmusic-api`)
  - Last.fm (for charts endpoints)
  - MusicBrainz (metadata enrichment)
  - LRCLib (lyrics)

## Initial Setup

Run from repository root:

```bash
npm install
cp .env.example .env
```

Then install backend dependencies:

```bash
cd server
npm install
```

## Environment Configuration

The project uses one root `.env` file by default.

- Frontend reads `VITE_*` variables at build/dev-server time.
- Backend scripts in `server/package.json` load `../.env` (root file), not
  `server/.env`.

Minimum useful variables:

- `VITE_API_BASE=http://localhost:5000/api`
- `LASTFM_API_KEY=<your-key>` for real `/api/charts` and `/api/charts/artists`

Without a Last.fm key, chart endpoints cannot return the full real-data chart
pipeline.

## Run The Project (Two Terminals)

Terminal 1 (frontend, repo root):

```bash
npm run dev
```

Terminal 2 (backend):

```bash
cd server
npm run dev
```

Expected startup:

- frontend available at `http://localhost:8080`
- backend health endpoint at `http://localhost:5000/health`

## First Verification Checklist

After both servers are running:

1. Open the app and confirm home route `/` renders.
2. Search for a track in `/search`.
3. Start playback and confirm footer player starts streaming.
4. Open `/charts` and verify chart data loads.
5. Open `/lyrics` flow via player and verify lyrics lookup behavior.

Quick API checks:

```bash
curl http://localhost:5000/health
curl "http://localhost:5000/api/search?q=daft%20punk&type=song"
curl "http://localhost:5000/api/trending?limit=5"
```

## Build, Lint, And Test Commands

From repo root:

- `npm run lint` - ESLint checks
- `npm run test` - Vitest watch mode
- `npm run test:run` - Vitest single run
- `npm run build` - production frontend build

Backend run commands:

- `cd server && npm run dev` - watch mode
- `cd server && npm run start` - production-style run with `../.env`

## Windows Notes

- `vite.config.ts` enables polling file-watch mode (`watch.usePolling`) to
  avoid missed HMR updates on some Windows or networked filesystem setups.
- `vitest.config.js` uses thread workers with a single worker to avoid process
  spawn instability in this environment.

## Next Reading

- [Architecture](./architecture.md)
- [Frontend Guide](./frontend-guide.md)
- [Backend Guide](./backend-guide.md)
