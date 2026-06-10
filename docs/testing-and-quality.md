# Testing and Quality

This guide describes the quality gates used in the project today.

## Automated Commands

Run from repo root:

- `npm run lint` - ESLint checks across app code
- `npm run test` - Vitest watch mode
- `npm run test:run` - full non-watch Vitest run
- `npm run build` - production bundle validation

Backend runtime checks:

- `cd server && npm run dev` - verifies backend boot + watch mode
- `cd server && npm run start` - verifies production-style startup

## Suggested Validation Order

Recommended sequence before shipping substantial changes:

1. `npm run lint`
2. focused tests for touched features
3. `npm run test:run` for full regression pass
4. `npm run build`

This mirrors the baseline in `UX_VALIDATION.md`.

## Test Architecture

Framework:

- Vitest + Testing Library + jsdom

Config source:

- `vitest.config.js`
- `src/test/setup.js`

Windows-specific tuning:

- test pool uses threads
- max workers set to `1`

## Where Tests Live

Current test distribution:

- `src/lib/*.test.js` - pure logic and utility behavior
- `src/hooks/*.test.js|jsx` - hook behavior and edge cases
- `src/components/**/*.test.jsx` - UI component behavior
- `src/pages/*.test.jsx` - page-level behavior integration
- `server/lib/*.test.js` - backend service logic tests

## Quality Reference Documents

Existing operation docs in repo root:

- `UX_VALIDATION.md` - command checklist + latest run outcome
- `RESPONSIVE_QA_MATRIX.md` - responsive acceptance matrix by route and device

Use these as the current manual QA contract unless superseded by future docs.

## Manual QA Focus Areas

Minimum manual pass should cover:

- global navigation and route transitions
- search -> result -> playback flow
- queue controls and transport keyboard shortcuts
- chart and explore loading/error states
- responsive behavior across representative breakpoints

## Current Known Test Caveat

`UX_VALIDATION.md` records a known full-suite failure around explore page tests
related to provider setup (`usePlaylists` outside provider). Treat this as a
test harness issue unless behavior regression suggests otherwise.

## CI / Pipeline Recommendation

If adding CI automation, use this gate design:

- required checks: `lint`, focused tests, `build`
- broader nightly: full `test:run`
- follow-up opportunity: add E2E smoke checks (Home -> Search -> Player path)

## Definition Of Done (Practical)

A change is generally safe to merge when:

- touched areas have passing targeted tests
- lint passes
- build passes
- key manual journey for the changed area is verified
- no unexplained console/runtime errors appear in local run

## Related Docs

- [Getting Started](./getting-started.md)
- [Troubleshooting](./troubleshooting.md)
- [Contributing](./contributing.md)
