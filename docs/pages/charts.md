# Charts Pages (`/charts` and `/charts/artists`)

> **What you'll learn here:** the region/time-window charts experience, how filters live in the URL, the song-vs-artist modes, and why `/charts/artists` is just a redirect.

| | |
|--|--|
| **Routes** | `/charts`, `/charts/artists` |
| **Access** | Public · inside `MainLayout` |
| **Files** | `src/pages/ChartsPage.jsx` → re-exports `src/components/charts/ChartsPage.jsx`; `src/pages/ChartsArtistsPage.jsx` |

## `/charts` — the main charts page

### What it does

Regional, time-windowed music charts for either **songs** or **artists**. Users filter by mode/region/window, sort, play tracks, favorite them, share a chart position, and expand artist rows to see their charting tracks.

### Key components

`ChartsHero`, `ChartsFilters`, `ChartsList`, `ChartShareModal`, `ThisDayInMusicCard`. See [../components/charts.md](../components/charts.md).

### Data it needs and where it comes from

- **`useChartFilters()`** — reads/writes the URL params `mode`, `region`, `window`. Defaults: `mode=artists`, `region=global`, `window=this_week`.
- **`useChartData({ mode, region, window })`** — fetches either `getCharts` (keyed `queryKeys.charts(...)`) or `getChartsArtists` (keyed `queryKeys.chartsArtists(...)`), limit 50, with stale/refetch intervals tuned to the window (e.g. "today" refreshes more often than "all_time").
- **`useChartSort({ mode, data })`** — client-side sorting.
- `usePlayer()`, `useFavorites()` (`toggleFavorite`).
- **`getThisDayInMusic({ region, date })`** — a client-side "this day in music history" fact card.
- `localStorage` key `octavia.this-day.{region}.{date}` remembers if you dismissed that card.

### Page-level logic

- An **`aria-live`** region announces filter changes for screen readers.
- A **stale-data warning banner** appears when the server returns cached/degraded chart data (e.g. when the Last.fm pipeline is degraded — see [../third-party-services.md](../third-party-services.md)).
- Loading/error/retry handled inside `ChartsList`.
- Expanded artist rows collapse when filters change.

### Special behavior

- **Background refetch** intervals depend on the selected window's TTL.
- **`ChartShareModal`** generates a shareable link/image for a specific chart entry.
- The **"This Day in Music"** card only shows when `window=today` and hasn't been dismissed.

## `/charts/artists` — redirect alias

This route has **no UI of its own**. It reads `region`/`window` from the incoming query string (normalized via `normalizeRegion` / `normalizeWindow`) and renders:

```jsx
<Navigate to="/charts?mode=artists&region=…&window=…" replace />
```

It exists so older links / deep links to the artist chart keep working, redirecting into the unified `/charts` page with `mode=artists`.

## Key things to remember

- **Filters are URL state** (`mode`, `region`, `window`) — charts are shareable by link.
- **`/charts/artists` is a redirect**, not a separate page.
- A **stale banner** means the backend served degraded/cached data (often a missing/limited `LASTFM_API_KEY`).
