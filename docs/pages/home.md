# Home Page (`/`)

> **What you'll learn here:** what the landing page shows, the components that build it, every data source it reads, and the clever "surprise me" / cold-start logic.

| | |
|--|--|
| **Route** | `/` |
| **Access** | Public · inside `MainLayout` |
| **File** | `src/pages/HomePage.jsx` (re-exported by `src/features/home/pages/HomePage.jsx`) |

## What it does

The Home page is the **editorial landing feed** and the primary discovery entry point. A new visitor sees a magazine-style cover-story hero, followed by horizontally-scrolling rails (trending, charts, genres, top artists), personalized "daily mixes", a spotlight artist of the week, and a world music strip. Users can play any track, start a "Discover Mix", hit "Surprise Me", or click through to deeper pages (artist, album, genre, explore).

## Key components

`HeroCard`, `DiscoverRibbon`, `HorizontalRail`, `TileCard`, `ArtistCircle`, `SpotlightArtist`, `WorldStrip`, `SectionHeader`, `EmptyState`, `SmartImage`. See [../components/home.md](../components/home.md).

## Data it needs and where it comes from

All server data is fetched through **React Query** hooks (`useQuery`) using the shared `queryKeys` factory, so caches are reused across pages.

| Data | Hook / call | Query key |
|------|-------------|-----------|
| Home feed (hero + trending) | `getHomeFeed({ limit: 40 })` | `queryKeys.homeFeed(...)` |
| Genres | `getGenres` | `queryKeys.genres()` |
| Charts (top 12, this week) | `getCharts` | `queryKeys.charts('global','this_week',12)` |
| Spotlight artist detail | `getArtist(slug)` | `queryKeys.artist(slug)` — only enabled when a spotlight seed exists |

Local/context data: `usePlayer()` (`history`, `playTrack`, `playTracksInOrder`, `currentTrack`), `useFavorites()` (`list`), `useSettings()` (`displayName`), `useAuth()` (`user` — decides whether the CTA points to library vs player). Editorial framing comes from `useEditorialMeta()`; section assembly + cold-start detection from `useHomeSections()`; error normalization from `usePageError()`.

> **Clever bit — cache seeding.** An effect seeds the `queryKeys.trending(40)` cache from the home feed's trending list, so navigating to `/trending` shows data instantly without a second fetch. The Home page and Trending page deliberately **share** the same trending cache key.

## Page-level logic

- **Per-section loading skeletons** — each rail loads independently; one slow section doesn't block the rest.
- **Error handling** — `InlineIssue` blocks render per section for offline (`isNetworkError`) and for hero/trending/charts/genres failures, each with a retry button.
- **Cold start** — when `useHomeSections` detects there's no listening history yet, it shows a "cold start" rail of starter content instead of personalized mixes.
- **Conditional sections** — history, fresh finds, rising now, daily mixes, and top artists only render when there's data for them.

## Special behavior

- **"Surprise Me"** (on `DiscoverRibbon`): makes up to 3 attempts at a remote discovery radio (`getExploreRadio`), falls back to a local pool, and **de-duplicates within the session** using `surprise-random` helpers (`getSurpriseSeenSet`, etc.) so you don't get the same surprise twice.
- **Genre tiles** link to `/genres?genre=<id>`; **daily mixes** link to `/explore?mood=<mood>`.
- **`WorldStrip`** fetches a regional queue on demand via `searchMusic` + the query client.
- The hero track is memoized through `sanitizeTrack` to keep renders stable.

## Key things to remember

- Home shares the **`trending(40)`** cache with the Trending page — change one and consider the other.
- Sections fail and load independently; never assume all data arrives together.
- "Surprise Me" has session-level de-duplication — test it across multiple clicks.
