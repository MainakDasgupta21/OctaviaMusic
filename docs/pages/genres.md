# Genres Page (`/genres`)

> **What you'll learn here:** the genre atlas, how a genre links into Explore, and the scroll-to-highlight behavior.

| | |
|--|--|
| **Route** | `/genres` (e.g. `/genres?genre=pop`) |
| **Access** | Public · inside `MainLayout` |
| **File** | `src/pages/GenresPage.jsx` |

## What it does

Browse the full atlas of music genres as a grid of tiles. Users can sample a genre's track or jump into Explore with that genre's queue.

## Key components

`SmartImage`, `EmptyState`, `Skeleton`.

## Data it needs and where it comes from

- `getGenres` via `useQuery`, keyed `queryKeys.genres()`. Each genre carries a live `sampleTrack`.
- URL param `?genre=` is used to **highlight and scroll to** a specific genre card.
- `usePlayer()` — `playTrack` for `genre.sampleTrack`.
- `useEditorialMeta()`, `usePageError()`.

## Page-level logic

- Error/empty states with retry; skeleton grid while loading.
- `smoothScrollIntoView` scrolls to the highlighted genre card when `?genre=` is present.

## Special behavior

- Genre cards link to `/explore?genre={id}` to start a full discovery queue.
- Optional hover-to-play the sample without navigating away.

## Key things to remember

- Genres come from the **same `getGenres` data** the Home and Explore pages use (shared cache).
- `?genre=` both **highlights and scrolls** to a card.
