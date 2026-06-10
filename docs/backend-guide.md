# Backend Guide

This guide explains how the Express backend is structured, how requests are
processed, and where provider-specific logic lives.

## Backend Entry Points

- `server/index.js` - process entrypoint, app startup, optional warmup
- `server/src/app.js` - Express app factory (CORS, compression, JSON parser,
  `/api` mount, `/health`, 404 handler)
- `server/src/routes/index.js` - aggregate route registration

Default runtime port:

- `PORT` env var or `5000`

## Startup And Warmup Behavior

On boot (`server/index.js`):

1. app starts listening
2. unless disabled (`NODE_ENV=test` or `YTM_WARMUP=false`), warmup primes:
   - YTMusic initialization
   - charts live call
   - trending live call

Warmup failures are logged and do not crash server startup.

## Layered Request Architecture

Backend is intentionally layered:

1. **Routes** (`server/src/routes/*.routes.js`)
2. **Controllers** (`server/src/controllers/*.controller.js`)
3. **Services** (`server/src/services/*.service.js`)
4. **Clients** (`server/src/clients/*.client.js`)
5. **Libraries** (`server/lib/*.js`)

### Why this split exists

- routes: URL shape + limiter middleware
- controllers: parse request params, set cache headers, format HTTP status
- services: business orchestration and fallback policy
- clients/libs: provider operations, enrichment logic, internal caching

## Route Families

Under `/api`:

- search: `/search`, `/search/suggestions`
- detail: `/album/:id`, `/artist/:slugOrId`
- charts: `/charts`, `/charts/artists`
- home/discovery: `/home`, `/home/featured`, `/trending`, `/genres`
- explore: `/explore/pulse`, `/explore/radio`, `/explore/similar`,
  `/explore/journeys/:id`
- lyrics: `/lyrics`

Health endpoint is outside `/api` at `/health`.

## Core Utilities And HTTP Behavior

### CORS

- configured in `server/src/middleware/cors.js`
- uses `CORS_ORIGIN` (comma-separated list)
- still permits localhost origins via config helper
- warns in production if explicit origins are not configured

### Compression

`server/src/app.js` enables gzip compression with:

- threshold `1024` bytes
- bypass support through `x-no-compression` request header

### Cache Headers

Controllers call `setCacheHeaders(...)` (`server/src/utils/cache.js`) to emit
`Cache-Control` with:

- browser `max-age` (short)
- shared cache `s-maxage` (longer)
- `stale-while-revalidate`

### Not Found Contract

`sendOrNotFound(...)` in `server/src/utils/http.js` preserves a stable 404
shape:

```json
{ "error": "Not found", "path": "/requested/path" }
```

Frontend helpers rely on this for page-level empty states.

## Fallback Strategy

Many services use `liveOrFallback(...)`:

- try live provider path first
- if provider fails or returns empty result, fallback to curated catalog data

Fallback source:

- `server/src/data/catalog.js` (and mirrored `server/data/catalog.js`)

This keeps the UI responsive under upstream instability.

## Rate Limiting

Rate limiters are configured in `server/src/middleware/rate-limiters.js`:

- `homeLimiter`
- `searchLimiter`
- `lyricsLimiter`
- `detailLimiter`

Each has environment-variable controls for window/max values.

## Provider Integration Libraries

### `server/lib/ytmusic.js`

Responsibilities:

- manages memoized YTMusic client instance
- performs request timeout/retry wrapping
- provides TTL cache + inflight deduplication + capped LRU-like retention
- exposes search/detail/charts/trending helper methods

### `server/lib/charts-service.js`

Responsibilities:

- merges Last.fm, MusicBrainz, and YTMusic data
- normalizes chart windows/regions
- enriches song and artist chart rows
- supports stale cache return + background refresh
- provides YTM-only fallback payload when primary chart path fails

### `server/lib/explore-service.js`

Responsibilities:

- explore pulse/radio/similar/journey generation
- uses charts/trending/lastfm-similar combinations
- has dedicated per-endpoint TTL caches

### `server/lib/lyrics.js`

Responsibilities:

- wraps LRCLib with strict and relaxed lookup paths
- handles optional YouTube metadata derivation fallback
- caches hits and misses separately

### `server/lib/lastfm.js` and `server/lib/musicbrainz.js`

Responsibilities:

- remote HTTP wrappers with timeout/retry/throttle behavior
- service-specific cache controls
- normalized return shapes for higher-level chart logic

## Service-to-Library Mapping

- search/detail/home/trending/genres services: mostly YTMusic + fallback catalog
- charts service: delegated to charts client (`server/lib/charts-service.js`)
- explore service: delegated to explore client (`server/lib/explore-service.js`)
- lyrics service: delegated to lyrics client (`server/lib/lyrics.js`)

## Operational Notes

- no persistent DB; all caching is in-process memory
- single process backend (no queue/worker subsystem)
- backend correctness depends on provider availability, but fallback policy
  protects baseline functionality

## Related Docs

- [Architecture](./architecture.md)
- [API Reference](./api-reference.md)
- [Data Models and Config](./data-models-and-config.md)
- [Troubleshooting](./troubleshooting.md)
