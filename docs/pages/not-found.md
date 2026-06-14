# Not Found Page (`*`)

> **What you'll learn here:** the 404 catch-all route and its playful interactive element.

| | |
|--|--|
| **Route** | `*` (any unmatched path) |
| **Access** | Public · **outside `MainLayout`** |
| **File** | `src/pages/NotFound.jsx` (imported via `src/app/pages/NotFoundPage.jsx`) |

## What it does

The 404 experience for any route that doesn't match. Offers buttons to go Home or to Search.

## Key components

`LogoMark`, `Button`, and a draggable vinyl `motion.div`.

## Data it needs and where it comes from

- `useLocation()` — the `pathname` (shown in the message; logged via `console.warn` in dev only).
- No data fetching.

## Page-level logic

- `navigate('/')` or `navigate('/search')` from the action buttons.

## Special behavior

- An interactive **draggable, spinning vinyl record** built with Framer Motion (`useMotionValue` + `useSpring`) — a small delight on an otherwise dead-end page.

## Key things to remember

- This is the **catch-all** (`*`) route and renders without the app shell.
- It only reads the current path; there's no API involved.
