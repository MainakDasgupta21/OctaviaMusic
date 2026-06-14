# Known Issues & Limitations

> **What you'll learn here:** an honest accounting of what's currently broken, partially built, or worth knowing about — bugs, limitations, performance notes, technical debt, and compatibility caveats. Knowing these saves you from "is this a bug or intended?" confusion.

---

## How to read this

Items are grouped by severity/type. Each notes the **area**, what you'd observe, and (where known) the cause or workaround. This reflects the state of the code at the time of writing — verify against the latest source and `git log` before acting.

---

## Known bugs

### Explore page tests fail in the suite
- **Area:** frontend tests (`src/pages/ExplorePage.test.jsx`, `ExploreFlowPage.test.jsx`).
- **Symptom:** `npm run test:run` reports failures with `usePlaylists must be used within a PlaylistProvider` (≈ 7 tests).
- **Cause:** a **test-harness setup issue** — the Explore tests don't wrap the component in the full provider tree. This is *not* a product bug; the page works in the running app.
- **Reference:** noted in `UX_VALIDATION.md` (last run 2026-06-09). Until fixed, run focused test files or treat these as known-failing.

### Lyrics controller passes a second cache TTL that's ignored
- **Area:** backend (`server/src/controllers/lyrics.controller.js` + `server/src/utils/cache.js`).
- **Symptom:** the lyrics controller calls `setCacheHeaders(res, missTtl, hitTtl)` intending different HTTP cache durations for found vs not-found lyrics, but `setCacheHeaders` only accepts **one** TTL argument — the extra is silently ignored.
- **Impact:** cosmetic; the in-memory cache TTLs still differ correctly. Just don't assume the HTTP `Cache-Control` differs for hits vs misses.

---

## Partially implemented features

### Forgot password is a placeholder
- **Area:** `/forgot-password` (`src/features/auth/pages/ForgotPasswordPage.jsx`).
- **State:** the page renders a "coming soon" message with links back to login/register. **There is no password-reset flow** (no email sending, no reset token endpoint). Users who forget their password currently can't self-recover.

### `useServerHealth` is built but not wired in
- **Area:** `src/hooks/use-server-health.js`.
- **State:** a hook that polls `GET /health` every 60s to show an offline banner exists and works, but it isn't yet consumed by the TopBar. The offline detection currently relies on per-request error states instead.

### `optionalAuth` middleware is exported but unused
- **Area:** `server/src/middleware/auth.js`.
- **State:** `optionalAuth` (auth-if-present, guest-otherwise) is implemented and exported but not attached to any route. It's available for future endpoints that want to personalize for logged-in users without requiring auth.

---

## Limitations (intended, but good to know)

### The audio visualizer is "fake"
- **Area:** `src/components/player/Visualizer.jsx`.
- **Why:** audio plays through a **YouTube iframe**, which the app cannot tap into with the Web Audio API (cross-origin). So the visualizer renders **deterministic, seeded noise** rather than a real frequency analysis. It looks reactive but isn't analyzing actual audio. This is a fundamental consequence of streaming from YouTube — not fixable without a different audio source.

### No real audio control beyond what YouTube exposes
- True gapless playback, precise crossfade between arbitrary tracks, and waveform scrubbing are limited by the YouTube embed. Crossfade is approximated via gain ramping (`src/lib/audio.js`).

### Catalog data is best-effort
- All catalog data depends on **unofficial/free** sources (`ytmusic-api`, Last.fm). These occasionally rate-limit or change shape. The app mitigates this with caching + a static fallback catalog, but results can vary and the fallback catalog is small.

### Charts need a Last.fm key for full fidelity
- Without `LASTFM_API_KEY`, charts degrade to a YouTube Music playlist source (or fail) rather than the full Last.fm + MusicBrainz pipeline. See [third-party-services.md](./third-party-services.md).

### Notifications are device-local
- The in-app notifications feed (`NotificationsContext`) is stored in `localStorage` only — it doesn't sync across devices and there's no push/email.

### In-memory cache isn't shared across instances
- The backend cache lives in process memory. If you run **multiple** backend instances behind a load balancer, each warms its own cache (and there's no shared invalidation). Fine for a single instance; consider Redis if you scale horizontally.

---

## Performance notes

- **Cold-cache latency:** the *first* request to a cold cache (after boot or TTL expiry) hits a live upstream and can take several seconds — which is why `api.js` uses a generous 25s timeout and the server warms up on boot. Subsequent requests are fast.
- **Large search ranking** is offloaded to a Web Worker only at ≥ 50 candidates; smaller sets rank on the main thread.
- **Scroll jank mitigation:** heavy effects (grain overlay, `backdrop-filter`, hover) are disabled during active scroll via the `data-scrolling` flag. If you add expensive visual effects, respect that guard or you may reintroduce jank — especially on large screens.
- **Avatar uploads** are base64 data URLs capped at ~400 KB (validator) within a 1 MB JSON body limit. Very large images are rejected client- and server-side.

---

## Technical debt

- **`features/*/pages/` re-export indirection:** most route files are thin re-exports of `src/pages/*`. This dual structure (a half-finished migration toward a feature-folder layout) can confuse newcomers about where the "real" code is. See [folder-structure.md](./folder-structure.md).
- **`@tailwindcss/typography` is installed but not registered** in `tailwind.config.ts`; prose typography is hand-rolled in `index.css`. The dependency is effectively unused.
- **`darkMode: ["class"]` in Tailwind config is misleading** — themes actually use `data-theme` attributes, not a `.dark` class. The config line is vestigial.
- **Package/folder naming drift:** the repo is `harmony-hub`, the frontend package is `vite_react_shadcn_ts`, and the product is `Octavia`. Cosmetic but worth knowing.
- **Two `catalog.js` copies** exist (`server/data/catalog.js` and `server/src/data/catalog.js`) plus client re-exports — some duplication around the fallback catalog.
- **`index.css` is very large** (~2,500 lines). It's well-organized but monolithic; splitting it would help maintainability.

---

## Browser / device compatibility

- **JavaScript required:** the app is a pure SPA; `index.html` shows a no-JS notice. There's no server-side rendering.
- **Web Speech API (voice search):** `VoiceSearchButton` hides itself where the Web Speech API is unsupported (notably Firefox), so voice search is Chrome/Edge/Safari-mostly.
- **View Transitions API:** route morph animations use the View Transitions API where supported; elsewhere navigation still works, just without the morph.
- **`backdrop-filter`:** frosted-glass surfaces depend on `backdrop-filter`; very old browsers fall back to a more opaque surface.
- **`prefers-reduced-transparency` / `prefers-reduced-motion`:** honored with dedicated fallbacks.

---

## Key things to remember

- **Failing Explore tests are a known harness issue, not a product bug.**
- **Forgot-password is not implemented** — don't assume self-service password reset exists.
- **The visualizer is intentionally fake** because audio comes from a YouTube iframe.
- **Charts need `LASTFM_API_KEY`** for full data.
- **The in-memory cache doesn't scale across multiple instances** without extra work.
- A few items (`useServerHealth`, `optionalAuth`) are **built but not yet wired in** — they're intentional groundwork, not dead code to delete.
