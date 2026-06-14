# Components · Search

> **What you'll learn here:** the search-specific components — the filter bar, filter editors, presets, trending chips, voice search, and the contextual related rail.

**Folder:** `src/components/search/`

These power the [Search page](../pages/search.md). Filters are modeled as structured state (see `search-filter-state`), separate from the search query itself.

---

## `FilterChipBar`

The canonical `/search` filter UI: type tabs + active filter chips + an "Add filter" button + "Clear all".

- **Props:** `filters`, `type`, `onFiltersChange`, `onTypeChange`.
- **State:** internal popover `active` state in `AddFilterButton`.
- **Actions:** writes structured filters via `onFiltersChange`; changes the result type.
- **Children:** internal `FilterChip`, `AddFilterPalette`, and the editors from `FilterEditors`.
- **Quirks:** the **type** (song/artist/album) is kept separate from the **property filters** (year, duration, etc.); arrow keys navigate the toolbar.

---

## `FilterEditors`

Not a single component — a module exporting the popover bodies for each filter dimension.

- **Exports:** `SortEditor`, `YearEditor`, `DurationEditor`, `ArtistEditor`, `AlbumEditor`, `MoodEditor`, `CleanEditor`, `ExcludeEditor`, `EditorShell`, plus helpers `filterIsSet`, `formatFilterValue`, `removeFilter`.
- **Props (each editor):** `filters`, `onChange`, `onClose`, `embedded`.
- **State:** local input state in the Year/Duration/Exclude editors.
- **Actions:** mutate filters via `search-filter-state` helpers (`setFilter`, `toggleMood`, …).
- **Quirks:** Year/duration use **numeric inputs + presets**, not sliders — a deliberate choice for touch reliability.

---

## `QuickPresets`

A grid of one-click filter presets shown on the Search idle state.

- **Props:** `filters`, `onFiltersChange`, `className`.
- **Actions:** applies `preset.apply(filters)` from the `PRESETS` library.

---

## `TrendingChips`

A flame-labeled chip row of trending search terms.

- **Props:** `terms` (`{ kind, label }[]`), `onPick(label, entry)`, `title`, `className`.
- **Children:** kind icons (artist/song).
- **Parents:** the TopBar search popover and the Search page.

---

## `VoiceSearchButton`

A microphone button that renders **nothing** where the Web Speech API is unsupported (e.g. Firefox).

- **Props:** `onTranscript`, `className`, `size` (`sm`|`md`).
- **Reads:** `useVoiceSearch` (`isListening`, `error`).
- **Actions:** start/stop speech recognition.
- **Parents:** TopBar; Search page.

---

## `RelatedRail` → `SearchRelatedRail`

A contextual rail shown beside the search top result (albums/tracks by the same artist).

- **Props:** `topResult`.
- **Reads:** `usePlayer`; React Query `getArtist` / `getAlbum`.
- **Actions:** `playTrack`, `addToQueue` (middle-click), album `Link`.
- **Children:** internal `RelatedItem`, `SmartImage`.
- **Quirks:** exported with a `RelatedRail` alias for backwards compatibility, but it's **distinct from `PlayerRelatedRail`**.

## Key things to remember

- The **type** filter and the **property** filters are separate concerns.
- Filter editors use numeric inputs/presets (not sliders) on purpose.
- `VoiceSearchButton` silently disappears on unsupported browsers — don't assume it's always rendered.
- `SearchRelatedRail` ≠ `PlayerRelatedRail` despite the alias.
