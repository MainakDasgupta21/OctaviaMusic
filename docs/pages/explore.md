# Explore Page (`/explore`)

> **What you'll learn here:** Octavia's personalized discovery hub — its many feature-flagged sections, how taste/onboarding is stored, the swipe deck, gamification, and deep-link auto-play.

| | |
|--|--|
| **Route** | `/explore` (e.g. `/explore?mood=focus`, `/explore?genre=pop`, `/explore?journey=night-drive`) |
| **Access** | Public · inside `MainLayout` |
| **File** | `src/pages/ExplorePageV2.jsx` (re-exported by `src/features/explore/pages/ExplorePage.jsx`) |

## What it does

The discovery hub. Depending on enabled feature flags, it shows: a first-run onboarding quiz, a mood board + genre picker, a Tinder-style swipe deck, curated "journeys", daily mixes, hidden gems, a "because you liked…" rail, a live community/social strip, and a gamification layer (XP, streaks, daily challenges, badges). Users tune their taste and dive into auto-generated queues.

## Key components

`ExploreOnboarding`, `MoodBoard`, `SwipeDeck`, `SurpriseMeButton`, `CuratedJourneys`, `LivePulse`, `CommunityDiscoveryStrip`, `ExploreFlowEntryCard`, `DiscoveryStreakBar`, `DailyChallengeCard`, `LoopCompleteModal`, `ExploreShareModal`. See [../components/explore.md](../components/explore.md).

## Data it needs and where it comes from

URL params (`useSearchParams`): `mood`, `genre`, `journey`, `mode`, `onboarding`.

| Concern | Hook | Storage / source |
|---------|------|------------------|
| Taste profile + onboarding | `useExploreTaste()` | `localStorage` (`explore-recommendations`, `explore-onboarding`) |
| XP / streaks / challenges | `useExploreProgress()` | `localStorage` (`explore-progression`) |
| Candidate pools, daily mixes, hidden gems, "because you liked" | `useExploreData()` | React Query: `getGenres`, `getTrending`, `getCharts` |
| Multi-strategy discovery feed | `useDiscoveryFeed()` | `useQueries` (only when `EXPLORE_DISCOVERY_V3_ENABLED`) |
| Community highlights | `useExploreSocial()` | only when `EXPLORE_SOCIAL_ENABLED` |
| Playback / library | `usePlayer()`, `useFavorites()`, `useFollowedArtists()`, `useSettings()` | — |

It also uses `getExploreRadio()` for surprise prefetch, `discovery-memory` (seen-track sets + artist-fatigue map, with `subscribeDiscoveryMemory`) to avoid repeats, and `surprise-random` / `explore-recommendations` queue builders.

## Feature flags

This page is heavily gated by env-driven flags (see [../environment-variables.md](../environment-variables.md)):

- `EXPLORE_V2_ENABLED`
- `EXPLORE_DISCOVERY_V3_ENABLED`
- `EXPLORE_LOOPS_ENABLED`
- `EXPLORE_SOCIAL_ENABLED`
- `EXPLORE_INFINITE_ENABLED` (enables the [Explore Flow](./explore-flow.md) entry)

> **Why flags?** Explore is the most experimental surface. Flags let the team ship sections incrementally and turn off anything unstable without a code change.

## Page-level logic

- **Deep-link auto-play**: arriving with `?mood=`, `?genre=`, or `?journey=` auto-plays the matching queue and scrolls to the relevant section. Handlers use refs to avoid double-playing.
- A `recommendationsBootstrapping` flag gates interactions until taste data is ready.
- Sharing a journey opens `ExploreShareModal`.

## Special behavior

- **Surprise** prefetches a queue with a remote timeout fallback.
- The **swipe deck** de-dupes within a session (`getDeckSeenSet`).
- A **loop-win modal** appears on new `recentWins`; `octavia.explore.loop-win-seen.v1` prevents re-showing.
- A discovery "refresh nonce" reshuffles the candidate pools on demand.

## Key things to remember

- **Most of this page is feature-flagged** — if a section is missing, check the `EXPLORE_*` flags.
- **Taste and progression are `localStorage`-only** (device-local, not synced).
- Deep links (`?mood`/`?genre`/`?journey`) **auto-play** — handle with care when testing.
