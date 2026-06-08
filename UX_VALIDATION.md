# UX Validation Checklist

This document defines the minimum validation pass for premium UX work and records the latest run.

## Validation Commands

Run these from repo root:

- `npm run lint`
- `npm run test:run -- src/hooks/use-playlist-actions.test.jsx src/components/playlist/AddToPlaylistButton.test.jsx`
- `npm run test:run` (full regression suite)
- `npm run build`

## Manual Journey Checks

Verify these flows on desktop and mobile widths:

1. **Navigation clarity**
   - Discover `Trending`, `Charts`, `Explore`, `Library`, and `Player` from primary nav.
   - Mobile detail routes (`artist`, `album`, `playlist`) show an in-app back affordance.
2. **Playback controls**
   - Footer transport buttons provide consistent press/hover feedback.
   - Footer seek preview tracks pointer drag; seek commits on release.
   - Now Playing artwork ring scrubs with pointer + keyboard.
3. **Loading polish**
   - Lyrics loading uses skeleton placeholders, not spinner-only.
   - Command palette shows loading placeholders during active search.
4. **Keyboard and accessibility**
   - Track rows in `Album`, `Library`, `Favorites`, and `Playlist` are keyboard-triggerable.
   - `L` global shortcut does not steal focus from list navigation selection.
5. **Responsive quality**
   - Charts rows stay legible at small widths.
   - Bottom mobile chrome does not crowd content.

## Latest Run (2026-06-09)

- `npm run lint`: **pass**
- `npm run test:run -- src/hooks/use-playlist-actions.test.jsx src/components/playlist/AddToPlaylistButton.test.jsx`: **pass** (2 files, 4 tests)
- `npm run test:run`: **fail**
  - Failing area: `src/pages/ExplorePage.test.jsx` (7 tests)
  - Shared failure: `usePlaylists must be used within a PlaylistProvider`
  - This is a test harness/provider setup issue for Explore tests, not a compile/lint break.
- `npm run build`: **pass**
  - Build emits expected chunk-size warnings and pre-existing compressed asset overwrite warnings.

## Suggested CI Gates

- Required: `lint`, focused unit tests, build.
- Nightly/full regression: complete `vitest run`.
- Follow-up: add Playwright + axe smoke checks for Home → Search → Player journey.
