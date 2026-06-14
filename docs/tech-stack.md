# Tech Stack

> **What you'll learn here:** every technology, library, and tool used in Octavia — what it is, why this project uses it, where it's used in the codebase, and a link to its docs. Grouped by category.

---

## How to read this

Each entry follows the same shape:
- **What it is** — a one-sentence plain explanation (assume you've never heard of it).
- **Why we use it** — the job it does *here*.
- **Where** — files/folders that use it.
- **Docs** — official documentation link.

Versions come from `package.json` (frontend) and `server/package.json` (backend) at the time of writing. Always check those files for the exact current versions.

---

## Frontend — Core framework

### React 18 (`react`, `react-dom`)
- **What:** A library for building user interfaces out of reusable components.
- **Why:** It's the foundation of the entire UI; the component model fits a music app's many small, repeated pieces (track rows, tiles, rails).
- **Where:** Everything under `src/`.
- **Docs:** https://react.dev

### Vite (`vite`, `@vitejs/plugin-react-swc`)
- **What:** A fast build tool and dev server for modern web apps.
- **Why:** Near-instant dev startup and hot-module-reload, plus a fast production build. The SWC React plugin compiles JSX quickly.
- **Where:** `vite.config.ts`; powers `npm run dev` / `npm run build`.
- **Docs:** https://vite.dev

### react-router-dom v6 (`react-router-dom`)
- **What:** Client-side routing for React (maps URLs to components without page reloads).
- **Why:** Octavia is a single-page app; this handles navigation, route params (`/artist/:slug`), and nested/protected routes.
- **Where:** `src/app/App.jsx` (route definitions), `src/components/auth/*` (guards).
- **Docs:** https://reactrouter.com

---

## Frontend — UI libraries & components

### Tailwind CSS (`tailwindcss`, `tailwindcss-animate`, `autoprefixer`, `postcss`)
- **What:** A utility-first CSS framework (style with classes like `flex p-4 text-ink`).
- **Why:** Fast, consistent styling driven by design tokens; `tailwindcss-animate` adds enter/exit animations.
- **Where:** `tailwind.config.ts`, `postcss.config.js`, classes throughout `src/`, tokens in `src/index.css`.
- **Docs:** https://tailwindcss.com

### shadcn/ui + Radix UI (`@radix-ui/react-*`)
- **What:** shadcn/ui is a pattern for copying accessible component source into your project; Radix provides the unstyled, accessible primitives underneath (dialogs, dropdowns, sliders, etc.).
- **Why:** Gives fully accessible building blocks (focus trapping, keyboard nav, ARIA) that we style to match the brand.
- **Where:** `src/components/ui/` (the primitives), `components.json` (config). ~25 Radix packages are used (accordion, dialog, dropdown-menu, popover, select, slider, switch, tabs, toast, tooltip, etc.).
- **Docs:** https://ui.shadcn.com and https://www.radix-ui.com

### Framer Motion (`framer-motion`)
- **What:** An animation library for React.
- **Why:** Smooth, physics-based transitions (player controls, route morphs, hero animations) that feel premium.
- **Where:** Player components, home rails, transitions; tokens in `src/design/motion.js`.
- **Docs:** https://www.framer.com/motion

### lucide-react (`lucide-react`)
- **What:** A large open-source icon set as React components.
- **Why:** Consistent, lightweight icons across the whole UI.
- **Where:** Everywhere icons appear.
- **Docs:** https://lucide.dev

### class-variance-authority, clsx, tailwind-merge
- **What:** Utilities for composing class names. `clsx` joins conditional classes; `tailwind-merge` resolves conflicting Tailwind classes; `cva` defines variant-based class sets.
- **Why:** Powers the `cn()` helper (`src/lib/utils.js`) and the variant system in `ui-v2/Button.jsx`.
- **Docs:** https://cva.style / https://github.com/lukeed/clsx / https://github.com/dcastil/tailwind-merge

### cmdk (`cmdk`)
- **What:** A command-menu (⌘K palette) component.
- **Why:** Powers the global command palette (`src/components/CommandPalette.jsx`).
- **Docs:** https://cmdk.paco.me

### @dnd-kit (`@dnd-kit/core`, `/sortable`, `/utilities`)
- **What:** A modern drag-and-drop toolkit for React.
- **Why:** Reordering playlist tracks, the play queue, and pinned sidebar playlists.
- **Where:** `PlaylistPage`, `QueuePanel`, `Sidebar`.
- **Docs:** https://dndkit.com

### Lenis (`lenis`)
- **What:** A smooth-scrolling library.
- **Why:** Gives the app buttery, controlled scrolling on the main content area.
- **Where:** `src/hooks/use-lenis-scroll.js`, `MainLayout`.
- **Docs:** https://github.com/darkroomengineering/lenis

### react-helmet-async (`react-helmet-async`)
- **What:** Manages the document `<head>` (title, meta) from inside React.
- **Why:** Per-route page titles and Open Graph/Twitter tags for SEO and sharing.
- **Where:** `src/components/RouteHead.jsx`, wrapped by `HelmetProvider` in `providers.jsx`.
- **Docs:** https://github.com/staylor/react-helmet-async

### sonner (`sonner`)
- **What:** A toast (transient notification) library.
- **Why:** Success/error/info toasts (e.g. "Added to playlist", "Sign in required").
- **Where:** `src/lib/notify.js`, mounted in `App.jsx`.
- **Docs:** https://sonner.emilkowal.ski

---

## Frontend — State & data fetching

### TanStack Query / React Query (`@tanstack/react-query`)
- **What:** A library for fetching, caching, and synchronizing *server* data.
- **Why:** Removes manual loading/error/cache code; dedupes requests; enables optimistic updates for the library. This is Octavia's "server state" layer.
- **Where:** `src/app/providers.jsx` (client config), every data hook, library contexts.
- **Docs:** https://tanstack.com/query

### React Context (built into React)
- **What:** React's built-in mechanism for sharing state across components.
- **Why:** Holds "client state" — current track, auth, settings, queue. See [state-management.md](./state-management.md).
- **Where:** `src/contexts/`.

### axios (`axios`)
- **What:** A promise-based HTTP client.
- **Why:** The single configured instance in `src/lib/api.js` adds the base URL, cookies (`withCredentials`), CSRF headers, and automatic token-refresh-on-401 via interceptors.
- **Docs:** https://axios-http.com

---

## Frontend — Forms & validation

### react-hook-form (`react-hook-form`) + @hookform/resolvers
- **What:** A performant form-state library; the resolver bridges it to schema validators.
- **Why:** Powers the auth forms (login, register, account, change password) with minimal re-renders.
- **Where:** `src/features/auth/pages/*`.
- **Docs:** https://react-hook-form.com

### Zod (`zod`)
- **What:** A TypeScript-first schema validation library.
- **Why:** Validates form inputs on the frontend **and** every request on the backend (shared validation philosophy).
- **Where:** Frontend forms + `server/src/validators/`.
- **Docs:** https://zod.dev

---

## Frontend — Media & misc

### react-player (`react-player`)
- **What:** A React component that plays media from many sources (YouTube, etc.).
- **Why:** **The heart of playback** — it embeds a hidden YouTube player and streams audio directly from YouTube.
- **Where:** `src/components/layout/FooterPlayer.jsx` (lazy-loaded).
- **Docs:** https://github.com/cookpete/react-player

### date-fns (`date-fns`)
- **What:** A modern date utility library.
- **Why:** Formatting dates/times (editorial mastheads, "this day in music", relative times).
- **Docs:** https://date-fns.org

---

## Backend — Core

### Node.js + Express (`express`)
- **What:** Node.js is the JavaScript server runtime; Express is a minimal web framework on top of it.
- **Why:** Serves the REST API. Express's middleware model maps cleanly to Octavia's layered design.
- **Where:** `server/src/app.js`, `server/src/routes/`.
- **Docs:** https://expressjs.com

### MongoDB + Mongoose (`mongoose`)
- **What:** MongoDB is a document (NoSQL) database; Mongoose is an Object-Document Mapper that adds schemas/validation.
- **Why:** Stores user-owned data (accounts, playlists, favorites). Document shape fits playlists-with-embedded-tracks. See [database.md](./database.md).
- **Where:** `server/src/models/`, `server/src/db/connect.js`.
- **Docs:** https://www.mongodb.com / https://mongoosejs.com

---

## Backend — Auth & security

### jsonwebtoken (`jsonwebtoken`)
- **What:** Creates and verifies JSON Web Tokens (signed tokens proving identity).
- **Why:** Access + refresh token authentication. See [authentication.md](./authentication.md).
- **Where:** `server/src/utils/auth.js`, `server/src/services/auth.service.js`.
- **Docs:** https://github.com/auth0/node-jsonwebtoken

### bcrypt (`bcrypt`)
- **What:** A password-hashing function (slow by design to resist brute force).
- **Why:** Securely hashes user passwords (cost ≥ 12 rounds).
- **Where:** `server/src/models/User.js` (pre-save hook), `auth.service.js`.
- **Docs:** https://github.com/kelektiv/node.bcrypt.js

### helmet (`helmet`)
- **What:** Express middleware that sets security-related HTTP headers.
- **Why:** Hardens responses (XSS, clickjacking, etc.) with sensible defaults.
- **Where:** `server/src/app.js`.
- **Docs:** https://helmetjs.github.io

### cors (`cors`)
- **What:** Middleware to configure Cross-Origin Resource Sharing.
- **Why:** Allows the frontend origin (and localhost) to call the API with cookies.
- **Where:** `server/src/middleware/cors.js`.
- **Docs:** https://github.com/expressjs/cors

### cookie-parser (`cookie-parser`)
- **What:** Parses the `Cookie` header into `req.cookies`.
- **Why:** Reads the auth cookies (`accessToken`, `refreshToken`, `csrfToken`).
- **Where:** `server/src/app.js`, `server/src/middleware/auth.js`.

### express-rate-limit (`express-rate-limit`)
- **What:** Rate-limiting middleware.
- **Why:** Protects auth and catalog endpoints from abuse/upstream bans.
- **Where:** `server/src/middleware/rate-limiters.js`.
- **Docs:** https://github.com/express-rate-limit/express-rate-limit

### compression (`compression`)
- **What:** gzip/deflate response compression middleware.
- **Why:** Shrinks JSON payloads (>1 KB) to speed up responses.
- **Where:** `server/src/app.js`.

---

## Backend — External data clients

### ytmusic-api (`ytmusic-api`)
- **What:** An unofficial in-process client for YouTube Music (no API key).
- **Why:** The primary catalog source — search, albums, artists, charts, trending, genres, thumbnails, `videoId`s.
- **Where:** `server/lib/ytmusic.js`.
- **Docs:** https://www.npmjs.com/package/ytmusic-api

### Last.fm API (via `fetch`, no SDK)
- **What:** A music-data web API (rankings, play counts, similar tracks, tags).
- **Why:** Powers real charts and "similar tracks" for discovery. Requires `LASTFM_API_KEY`.
- **Where:** `server/lib/lastfm.js`.
- **Docs:** https://www.last.fm/api

### MusicBrainz API (via `fetch`, no SDK)
- **What:** An open music encyclopedia API.
- **Why:** Enriches charts with artist country and recording release dates. No key required (rate-limited to 1 req/sec).
- **Where:** `server/lib/musicbrainz.js`.
- **Docs:** https://musicbrainz.org/doc/MusicBrainz_API

### LRCLib (via `fetch`, no SDK)
- **What:** A free synced-lyrics database.
- **Why:** Provides (time-synced) lyrics for the player. No key required.
- **Where:** `server/lib/lyrics.js`.
- **Docs:** https://lrclib.net/docs

See [third-party-services.md](./third-party-services.md) for the integration details and failure behavior of each.

---

## Tooling — Build, lint, test

### ESLint (`eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`, `globals`)
- **What:** A linter that catches code problems and enforces style.
- **Why:** Keeps code consistent and catches hook-rule violations.
- **Where:** `eslint.config.js`; run with `npm run lint`.
- **Docs:** https://eslint.org

### Vitest (`vitest`) + Testing Library (`@testing-library/react`, `/jest-dom`, `/user-event`) + jsdom
- **What:** Vitest is a Vite-native test runner; Testing Library tests components the way users interact; jsdom simulates a browser DOM in Node.
- **Why:** Fast unit/component tests for both frontend and backend.
- **Where:** `vitest.config.js`, `server/vitest.config.js`, `*.test.js(x)` files. See [testing-and-quality.md](./testing-and-quality.md).
- **Docs:** https://vitest.dev / https://testing-library.com

### TypeScript (`typescript`, `@types/*`)
- **What:** A typed superset of JavaScript.
- **Why:** Used loosely here — mostly for editor hints and the Vite config. The app code is `.jsx` with `allowJs`.
- **Where:** `tsconfig*.json`, `vite.config.ts`.
- **Docs:** https://www.typescriptlang.org

### vite-plugin-compression2 (`vite-plugin-compression2`)
- **What:** Emits pre-compressed `.gz`/`.br` asset siblings at build time.
- **Why:** Lets static hosts serve compressed files with zero runtime CPU.
- **Where:** `vite.config.ts` (production only).

### lovable-tagger (`lovable-tagger`)
- **What:** A dev-only plugin from the Lovable platform that tags components.
- **Why:** Dev tooling; active only in development mode.
- **Where:** `vite.config.ts`.

### @tailwindcss/typography (devDependency)
- **What:** A Tailwind plugin for prose styling.
- **Why:** Present in `package.json` but **not currently registered** in `tailwind.config.ts` (typography is hand-rolled in `index.css`). Noted so you're not surprised. See [known-issues.md](./known-issues.md).

---

## Category summary

| Category | Technologies |
|----------|--------------|
| Core framework | React 18, Vite, react-router-dom |
| UI / components | Tailwind, shadcn/ui + Radix, Framer Motion, lucide-react, cmdk, @dnd-kit, Lenis, react-helmet-async, sonner |
| State / data | TanStack Query, React Context, axios |
| Forms / validation | react-hook-form, Zod |
| Media / misc | react-player, date-fns, cva/clsx/tailwind-merge |
| Backend core | Node.js, Express, MongoDB, Mongoose |
| Auth / security | jsonwebtoken, bcrypt, helmet, cors, cookie-parser, express-rate-limit, compression |
| External data | ytmusic-api, Last.fm, MusicBrainz, LRCLib |
| Tooling | ESLint, Vitest, Testing Library, jsdom, TypeScript, vite-plugin-compression2, lovable-tagger |

---

## Key things to remember

- **React Query handles server data; React Context handles client/session state.** Knowing which is which is the single most useful mental model for this codebase.
- **react-player is the playback engine** and streams from YouTube directly.
- **Zod is used on both sides** — frontend forms and backend request validation.
- **Only Last.fm needs an API key.** YouTube Music, MusicBrainz, and LRCLib need none.
- Versions live in `package.json` and `server/package.json` — treat those as the source of truth.
