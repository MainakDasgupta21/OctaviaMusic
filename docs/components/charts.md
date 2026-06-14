# Components · Charts

> **What you'll learn here:** the components that build the charts page — the orchestrator, filters, list, rows, and the share modal — plus the memoization pattern that keeps long lists fast.

**Folder:** `src/components/charts/`

The [Charts page](../pages/charts.md) (`src/pages/ChartsPage.jsx`) re-exports `ChartsPage` from this folder.

---

## `ChartsPage`

The full `/charts` orchestrator.

- **UI:** hero, filters, results list, share modal, and the "This day in music" card.
- **Reads:** `useChartFilters`, `useChartData`, `useChartSort`, `usePlayer`, `useFavorites`, `useNavigate`.
- **State:** `shareEntry`, `expandedArtistRows`, `announcement`, `dismissedThisDay`.
- **Actions:** play / favorite / share / navigate — all via **stable `useCallback` handlers** so the memoized rows don't re-render.
- **Children:** `ChartsHero`, `ChartsFilters`, `ChartsList`, `ChartShareModal`, `ThisDayInMusicCard`.
- **Quirks:** a screen-reader-only live region announces filter changes; the "This Day" card's dismissal is remembered in `localStorage`.

---

## `ChartsList`

The results panel: column headers, skeleton/rows, and infinite scroll.

- **Props:** `mode`, `window`, `listKey`, `rows`, loading/error flags, sort props, row callbacks, `currentTrackId`, `isPlaying`, etc.
- **State:** `visibleCount`, `isPaginating`, `sentinelRef`.
- **Actions:** `IntersectionObserver`-driven pagination (renders 20, then +20…); `onRetry`.
- **Children:** `ChartColumnHeaders`, `ChartRowSong` / `ChartRowArtist`, skeletons, error/empty states.

> **Memo trick:** only the current row receives the real `isPlaying` value; all other rows are passed `false`. This keeps the memoized rows from re-rendering on every play/pause tick.

---

## `ChartsFilters`

Sticky (on mobile) pill tablists for **Mode / Region / Window**.

- **Props:** `mode`, `region`, `window`, `setMode`, `setRegion`, `setWindow`.
- **Actions:** keyboard roving focus across the tablists; `aria-controls="charts-results-panel"`.
- **Children:** internal `FilterPillGroup`.
- **Quirks:** the available options come from `@/types/charts.types` (`MODE_OPTIONS`, etc.).

---

## `ChartsHero`

The page masthead.

- **Props:** `mode`, `region`, `window`, `lastUpdated`.
- **UI:** animated title/subtitle, a live-data badge, and a last-updated timestamp.
- **Children:** shadcn `Tooltip`; copy from `chartsUtils`.

---

## `ChartRowSong`

A single song row.

- **Props:** `entry`, `isCurrent`, `isPlaying`, `onPlay`, `onShare`, `onAddFavorite`, `onGoAlbum`, `onGoArtist`.
- **Actions:** row click / Enter plays; link clicks `stopPropagation` so they don't also play.
- **Children:** `SmartImage`, `ChartRankDelta`, `ChartRowActions`, `Tooltip`.
- **Wrapped in `React.memo`.**

---

## `ChartRowArtist`

An artist row with an expandable charted-tracks sub-list.

- **Props:** `entry`, `expanded`, `onToggleExpand`, `onPlayTrack`, `onShare`.
- **Children:** `SmartImage`, `ChartRankDelta`, internal `NationalityLabel`.
- **Wrapped in `React.memo`.**

---

## `ChartShareModal`

A dialog to preview/copy/share a chart position (link + SVG image).

- **Props:** `open`, `onOpenChange`, `entry`, `mode`, `filters`.
- **State:** a `shareLink` memo with a `focus` query param.
- **Actions:** `navigator.share`, copy link, copy SVG, `notify`.
- **Children:** shadcn `Dialog`, ui-v2 `Button`.

---

## `ChartRankDelta`

A small rank-movement pill (up/down/steady) with an optional PEAK badge.

- **Props:** `rank`, `prevRank`, `peakRank`, `className`.
- **Uses:** `getRankDelta` from `chartsUtils`.
- **Parents:** `ChartRowSong`, `ChartRowArtist`.

## Key things to remember

- Charts rows are **memoized**; `ChartsPage` provides **stable callbacks** and `ChartsList` only gives the current row a live `isPlaying` — preserve this pattern or you'll reintroduce list jank.
- Filters and options come from `charts.types`; the page itself is driven by URL state via `useChartFilters`.
