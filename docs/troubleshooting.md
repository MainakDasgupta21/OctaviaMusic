# Troubleshooting

This guide collects common local and runtime issues with likely fixes.

## Frontend Cannot Reach Backend

Symptoms:

- search/home/charts fail in UI
- network errors in browser console

Checks:

1. backend is running on `http://localhost:5000`
2. `VITE_API_BASE` points to `http://localhost:5000/api`
3. frontend dev server restarted after `.env` changes

Quick probe:

```bash
curl http://localhost:5000/health
```

## Backend Started But Uses Wrong Env File

Symptom:

- expected env values are ignored

Cause:

- backend scripts load `../.env` (repo root), not `server/.env`

Fix:

- place/update env values in root `.env`
- restart backend process

## Charts Endpoints Fail Or Return Provider Errors

Symptoms:

- `/api/charts` or `/api/charts/artists` return `502`
- warning about provider unavailable

Likely causes:

- missing `LASTFM_API_KEY`
- upstream Last.fm or MusicBrainz temporary outage

Fixes:

1. set `LASTFM_API_KEY` in root `.env`
2. restart backend
3. retry after short delay (provider transient failures)

Note:

- charts service can fall back to YTM-sourced payloads in some failure modes.

## CORS Problems In Production-Like Setup

Symptoms:

- browser blocks API calls with CORS error

Fix:

- set `CORS_ORIGIN` to allowed frontend origin(s), comma-separated
- verify backend restarted with updated env

## Search Works, Playback Does Not

Symptoms:

- track row renders but player shows unavailable state

Likely causes:

- missing/invalid `videoId` for selected track
- sanitized/blocked media URL

Checks:

- confirm selected track payload includes valid `videoId`
- try another track from charts/trending

## Lyrics Always Missing

Symptoms:

- repeated "Lyrics not found" or provider unavailable

Checks:

1. verify `/api/lyrics` request includes either:
   - `title` + `artist`, or
   - `videoId`
2. verify outbound access to `lrclib.net`
3. check backend logs for lyrics timeout/provider errors

Useful knobs:

- `LYRICS_TIMEOUT_MS`
- `LYRICS_BASE_URL`

## Vite HMR Not Updating On Windows

Symptom:

- saves do not trigger immediate hot update

Context:

- `vite.config.ts` already enables polling watch mode to mitigate this.

Actions:

- ensure you are running `npm run dev` from root
- if using network drives, keep repo on local disk where possible

## Vitest Hangs/Worker Spawn Issues On Windows

Context:

- config already uses thread pool + single worker.

If still unstable:

- run specific tests first: `npm run test:run -- <path>`
- then run full suite
- close other heavy Node processes

## Cache/Staleness Confusion In Charts

Symptoms:

- old chart data appears briefly

Explanation:

- charts service can serve stale cache and refresh in background.

Action:

- inspect `meta.stale` and `meta.warning` in response payload
- retry after refresh interval

## Build Warnings About Chunk Size

Context:

- large player/vendor chunks are expected due to media dependencies and explicit
  manual chunking strategy.

Action:

- treat as informational unless a new regression significantly changes bundle
  profile.

## Quick Recovery Checklist

If behavior seems broadly broken:

1. stop frontend and backend
2. verify root `.env` values
3. restart backend then frontend
4. run health and search curl checks
5. run `npm run lint` and focused tests for touched area

## Related Docs

- [Getting Started](./getting-started.md)
- [Testing and Quality](./testing-and-quality.md)
- [Backend Guide](./backend-guide.md)
