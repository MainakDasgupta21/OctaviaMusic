# Contributing

This document defines the practical contribution workflow for Octavia.

## Working Agreement

- keep user-facing behavior stable unless intentionally changing product behavior
- prefer small, reviewable changes with clear rationale
- preserve fallback/resilience behavior when touching backend provider logic
- avoid introducing hidden config coupling; document new env vars immediately

## Naming And File Conventions

Current conventions (from codebase and existing README guidance):

- component files: `PascalCase` (example: `Sidebar.jsx`)
- hooks: `use-*` in kebab-case (example: `use-keyboard-shortcuts.js`)
- generated shadcn/ui primitives keep kebab-case
- imports should prefer `@` alias (`@/` maps to `src/`)

## Frontend Change Workflow

When adding/changing frontend behavior:

1. identify route/component ownership (`src/features`, `src/pages`, `src/components`)
2. add/update API helper if backend data contract changes (`src/lib/api.js`)
3. add/update query key contract (`src/lib/query-keys.js`) for server-state resources
4. keep context persistence backwards-compatible when changing stored models
5. add tests near changed logic (`*.test.js` / `*.test.jsx`)

If modifying playback behavior:

- validate `PlayerContext` queue semantics and `FooterPlayer` integration
- ensure `videoId` handling and media sanitization remain intact

## Backend Change Workflow

When adding/changing API behavior:

1. route declaration in `server/src/routes/*.routes.js`
2. controller in `server/src/controllers/*` (params, status, headers)
3. service in `server/src/services/*` (business/fallback logic)
4. integrate provider/client logic via `server/src/clients/*` and/or `server/lib/*`
5. update API docs and model docs in `docs/`

Guidelines:

- keep HTTP concerns out of low-level provider libraries
- preserve stable 404 and error contracts unless explicitly versioning behavior
- apply rate limiting and cache-header logic appropriately for new endpoints

## Documentation Requirements

A code change is incomplete if relevant docs are stale. Update docs for:

- new routes/endpoints
- payload shape changes
- new environment variables
- changed startup commands/workflow
- altered manual QA expectations

## Validation Checklist Before Merge

Minimum:

1. `npm run lint`
2. focused tests for touched area
3. `npm run build`
4. manual spot-check of affected user flow

For larger changes:

- full `npm run test:run`
- responsive checks for touched routes

## High-Risk Areas (Extra Care)

- `src/contexts/PlayerContext.jsx` and playback controls
- backend chart aggregation (`server/lib/charts-service.js`)
- provider wrappers/caches (`server/lib/ytmusic.js`, `server/lib/lastfm.js`,
  `server/lib/musicbrainz.js`, `server/lib/lyrics.js`)
- persisted localStorage schema keys in contexts

## Commit And PR Guidance

Prefer commits that explain intent ("why"), not just file movement. Good PRs
include:

- what changed
- why it changed
- how it was validated
- follow-up items or known limitations

## Related Docs

- [Getting Started](./getting-started.md)
- [Testing and Quality](./testing-and-quality.md)
- [API Reference](./api-reference.md)
