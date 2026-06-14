# Admin Page (`/admin`)

> **What you'll learn here:** the admin-only user-management page and how the role gate works.

| | |
|--|--|
| **Route** | `/admin` |
| **Access** | **Admin only** (`RoleRoute role="admin"`, which requires auth first) · inside `MainLayout` |
| **File** | `src/features/admin/pages/AdminPage.jsx` |

## What it does

An admin user table: list all users, promote/demote between `user` and `admin` roles, and delete users (which also deletes all their library data).

## Key components

Just `Button` (it's a simple table-driven page).

## Data it needs and where it comes from

- `useQuery` keyed `ADMIN_USERS_QUERY_KEY = ['admin','users']` → `api.get('/admin/users')`.
- `useMutation` for `api.patch('/admin/users/:id/role')` and `api.delete('/admin/users/:id')`.
- `useQueryClient` invalidates the users query on success.

See [../api/admin.md](../api/admin.md).

## Page-level logic

- Loading / error / empty states for the table.
- Delete confirms before firing.
- `sonner` toasts on success/failure.

## Special behavior

- Non-admins who reach this route are redirected to `/` (after the auth check passes). The backend independently enforces `requireRole('admin')`, so the gate is defense-in-depth.

## Key things to remember

- **Two layers of protection**: the frontend `RoleRoute` and the backend `requireRole('admin')`.
- Deleting a user **cascades** — it removes their favorites, albums, artists, playlists, history, and searches.
