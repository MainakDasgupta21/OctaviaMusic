# Auth Pages — Login, Register, Forgot Password

> **What you'll learn here:** the three authentication pages that render outside the main app shell, their shared form stack, and the post-login redirect.

These three routes render **outside `MainLayout`** (no sidebar, top bar, or player) — they're standalone full-screen forms. For the underlying auth mechanics, see [../authentication.md](../authentication.md).

---

## Login (`/login`)

| | |
|--|--|
| **Route** | `/login` (e.g. `/login?redirect=/library`) |
| **Access** | Public · no shell |
| **File** | `src/features/auth/pages/LoginPage.jsx` |

**What it does:** sign in with email + password, then redirect to the intended page.

**Form stack:** `Input`, `Button`, `react-hook-form` + `zod` (`loginSchema`).

**Data/logic:**
- `useAuth()` — `login`, `status`.
- `useSearchParams()` — `redirect` (defaults to `/library`).
- On success: `navigate(redirect, { replace: true })`.
- Shows a loading state while submitting or while `status === 'loading'`.
- Friendly handling of a `503` (auth service / database unavailable).
- Links to `/register` and `/forgot-password`.

> **Why `?redirect=`?** When a `ProtectedRoute` bounces a signed-out user, it appends the page they wanted as `?redirect=`. After login, they land back where they intended.

---

## Register (`/register`)

| | |
|--|--|
| **Route** | `/register` (e.g. `/register?redirect=/library`) |
| **Access** | Public · no shell |
| **File** | `src/features/auth/pages/RegisterPage.jsx` |

**What it does:** create an account with email, username, display name, and password.

**Form stack:** same as Login.

**Data/logic:**
- `useAuth()` — `register` (aliased `registerAccount`), `status`.
- `useSearchParams()` — `redirect` (defaults to `/library`).
- Zod validation includes a **username regex** and a **password-match** refine.
- On success: navigate to `redirect`.
- Same `503`/error mapping as Login.

---

## Forgot Password (`/forgot-password`)

| | |
|--|--|
| **Route** | `/forgot-password` |
| **Access** | Public · no shell |
| **File** | `src/features/auth/pages/ForgotPasswordPage.jsx` |

**What it does:** **placeholder only.** It renders a "coming soon" message with links back to `/login` and `/register`.

> ⚠️ There is **no password-reset flow** implemented — no email sending, no reset token endpoint. Users who forget their password cannot currently self-recover. See [../known-issues.md](../known-issues.md).

---

## Key things to remember

- These pages have **no app chrome** (they render outside `MainLayout`).
- `?redirect=` carries the user back to their intended page after login/register.
- **Forgot-password is a stub** — don't assume it works.
