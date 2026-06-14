# Search Page (`/search`)

> **What you'll learn here:** how full-catalog search works — URL-driven filters, the client-side ranker that blends in your library, keyboard navigation, and idle-state suggestions.

| | |
|--|--|
| **Route** | `/search` (e.g. `/search?q=daft+punk&type=song`) |
| **Access** | Public · inside `MainLayout` |
| **File** | `src/pages/SearchPage.jsx` |

## What it does

Full-catalog search with filters, ranked results, keyboard navigation, and a rich idle state (presets, recent searches, trending terms). Users can play tracks, open artists/albums, add to playlists, or favorite — all from the results.

## Key components

`FilterChipBar`, `QuickPresets`, `SearchRelatedRail`, `TrendingChips`, `VoiceSearchButton`, `SearchHighlight`, `KindBadge`, `AddToPlaylistButton`, `HeartButton`, plus internal `TopResultCard` and memoized `SearchSongRow`. See [../components/search.md](../components/search.md).

## Data it needs and where it comes from

The search query and **all filters live in the URL** (`useSearchParams`): `q`, `type`, `sort`, `yearFrom`, `yearTo`, `duration`, `artist`, `album`, `clean`, `mood`, `exclude`. This makes searches shareable and back/forward-navigable.

| Data | Hook / call |
|------|-------------|
| Server search results | `searchMusic` via `useQuery` keyed `queryKeys.search(query, type, 60)` with `keepPreviousData` (no flicker between queries) |
| Ranked/merged results | `useRankedSearch()` — a Web-Worker-backed merge of server results with your library |
| Autocomplete | `useSearchSuggestions()` (YouTube Music suggestions) |
| Trending terms | `useTrendingSearches({ enabled })` |
| Personalization | `usePersonalizationSignals()` — `historyArtistCounts`, `recentSearchTerms` |
| Recent searches | `useSearchHistory()` — `recordSearch`, `removeSearch`, `clearSearches` |

Also uses `usePlayer()`, `useFavorites()`, `usePlaylists()`, `useSettings()` (`vimNavigation`), `useHoverPrefetch()`, `useEditorialMeta()`. URL/state parsing helpers come from `search-filter-state` (`parseQuery`, `composeQuery`, `filtersFromSearchParams`).

## Page-level logic

- **Bidirectional URL ↔ state sync** for `q`, filters, and `type`, with a **250 ms debounce** so typing doesn't spam the server.
- **`selectedIdx`** (the highlighted result) resets whenever the query or filters change.
- **Keyboard navigation**: arrow keys / `j` `k` to move, `g` `G` to jump to ends, `Enter` to play, `Ctrl/Cmd+Enter` to queue. Vim-style keys are gated by the `vimNavigation` setting.
- **States**: idle (presets/recents/trending) vs searched vs empty vs error vs a special "playlist filter" empty state.

## Special behavior

- **Client-side ranker** (`useRankedSearch`) merges your favorites, history, and playlists into up to ~120 results, boosting things you already engage with. This is why search feels personalized.
- **"Did you mean"** suggestions come from the ranker plus YouTube Music autocomplete.
- The **playlist** filter type shows a static empty state (there's no server-side playlist search).
- Results use a combobox ARIA pattern (`aria-activedescendant`) for accessibility, and rows are memoized for scroll performance.

## Key things to remember

- **Everything is in the URL** — a search is fully reproducible by its query string.
- Results are **ranked client-side** against your library, not just raw server order.
- Heavy ranking runs in a **Web Worker** (at ≥ 50 candidates) to keep the UI smooth.
