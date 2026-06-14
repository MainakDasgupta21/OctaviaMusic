# Components · Auth Route Guards

> **What you'll learn here:** the two wrapper components that protect routes on the frontend.

**Folder:** `src/components/auth/`

These are **route guards** used in `src/app/App.jsx` to gate access. They complement (but don't replace) the backend's auth — the server independently enforces auth on protected endpoints. See [../authentication.md](../authentication.md).

---

## `ProtectedRoute`

Gates routes that require a signed-in user.

- **Props:** `children` (optional; otherwise renders `<Outlet />`).
- **Reads:** `useAuth` (`user`, `status`).
- **Behavior:**
  - `status === 'loading'` → shows a spinner (waits for session hydration).
  - no `user` → redirects to `/login?redirect=<current path + search>`.
  - otherwise → renders the protected content.
- **Used by:** `/favorites`, `/library`, `/playlist/:id`, `/settings`, `/account` in `App.jsx`; also wrapped by `RoleRoute`.

> **Why preserve the path in `?redirect=`?** So that after logging in, the user is returned to exactly the page (and query string) they were trying to reach. The [Login page](../pages/auth.md) reads this param.

---

## `RoleRoute`

Requires authentication **and** a specific role.

- **Props:** `role` (default `admin`), `children` (optional; otherwise `<Outlet />`).
- **Reads:** `useAuth`.
- **Behavior:** first applies the `ProtectedRoute` auth gate; then, if `user.role !== role`, redirects to `/`.
- **Used by:** `/admin` (`role="admin"`).

## Key things to remember

- These guards are **UX convenience**, not security — the **backend** is the real enforcement layer (`requireAuth`, `requireRole`).
- `ProtectedRoute` carries the intended destination in `?redirect=` for a smooth post-login return.
