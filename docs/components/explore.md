# Components · Explore (Discovery)

> **What you'll learn here:** the discovery components — swipe deck, mood board, journeys, the infinite-flow shell, the gamification bar, and the various modals.

**Folder:** `src/components/explore/`

These build the [Explore page](../pages/explore.md) and [Explore Flow page](../pages/explore-flow.md). Many are feature-flagged at the page level.

---

## `SwipeDeck`

A Tinder-style card stack — swipe/drag to save vs skip.

- **Props:** `tracks`, `deckSignature`, `moodLabel`, `onTrackEnter`, `onSave`, `onSkip`, `onShuffle`.
- **State:** `index`, `audioReady` (gates autoplay preview until audio is unlocked).
- **Actions:** 120 px swipe threshold; button-based advance; `onTrackEnter` once audio is unlocked.
- **Children:** `SmartImage`, `Button`, a framer-motion drag card.
- **Quirks:** resets the index when `deckSignature`/`listSignature` changes; shows a "shuffle" CTA when the deck empties.

---

## `MoodBoard`

A grid of mood tiles (focus, morning, workout, …).

- **Props:** `moods`, `activeMoodId`, `onMoodSelect`, `disabled`, `onDisabledSelect`.
- **Actions:** `onMoodSelect(mood)` or `onDisabledSelect` while disabled.
- **Children:** gradient cards using a `MOOD_ICONS` map.

---

## `CuratedJourneys`

Three editorial "journey" cards with a play CTA.

- **Props:** `journeys`, `onPlayJourney`, `ordinal`.
- **Children:** `SectionHeader`.

---

## `ExploreFlowShell`

The `/explore/flow` page layout: a stats header + the deck.

- **Props:** `mood`, `genre`, `stats`, `deck`, `isLoading`, `onPlay`, `onSave`, `onSkip`, `onLoadMore`.
- **Children:** `ExploreFlowDeck` (with `activeTrack = deck[0]`).

---

## `ExploreFlowDeck`

The single-card discovery UI with Play/Save/Skip/More.

- **Props:** `track`, `queueCount`, `isLoading`, `onPlay`, `onSave`, `onSkip`, `onLoadMore`.
- **Children:** `SmartImage`, ui-v2 `Button`.
- **Quirks:** delegates all logic to parent callbacks (purely presentational).

---

## `LivePulse`

A "what the world is listening to" stats strip.

- **Props:** `trendingCount`, `leadTrack`, `lastUpdated`. (Display-only.)

---

## `ExploreOnboarding`

A full-screen multi-step mood/energy/activity quiz overlay.

- **Props:** `open`, `onComplete(answers)`, `onSkip`.
- **State:** `stepIndex`, `answers` `{ moodId, energyId, activityId }`.
- **Children:** `Button`; steps from `EXPLORE_ONBOARDING_STEPS`.
- **Quirks:** resets on `open`; clicking the backdrop = skip.

---

## `SurpriseMeButton`

A large "Surprise Me" CTA showing the last-picked status.

- **Props:** `onSurprise`, `disabled`, `isLoading`, `lastPickedTitle`.

---

## `DiscoveryStreakBar`

The gamification bar (streak, level, XP, badges, daily challenge progress).

- **Props:** `streakDays`, `level`, `xp`, `xpToNextLevel`, `progressToNext`, `badgesCount`, `challenge`. (Presentational.)

---

## `LoopCompleteModal`

A reward modal shown when a daily discovery loop completes.

- **Props:** `open`, `win` (`{ title, rewardXp }`), `onClose`.
- **Quirks:** Escape / backdrop / continue all close it; focuses the continue button.

---

## `ExploreShareModal`

Shares a discovery-journey link.

- **Props:** `open`, `onOpenChange`, `payload` (`{ title, text, url }`).
- **Actions:** `shareJourneyArtifact`, clipboard copy.
- **Children:** shadcn `Dialog`, ui-v2 `Button`.

## Key things to remember

- Most of these are **presentational** — the Explore page owns the data, taste, and progression state.
- `SwipeDeck` and the flow deck rely on **session seen-sets** (`discovery-memory`) to avoid repeats.
- Whether a given component renders depends on the `EXPLORE_*` feature flags — see [../environment-variables.md](../environment-variables.md).
