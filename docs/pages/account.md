# Account Page (`/account`)

> **What you'll learn here:** the full account-management page, including the avatar, profile form, and password change that forces re-login.

| | |
|--|--|
| **Route** | `/account` |
| **Access** | **Protected** · inside `MainLayout` |
| **File** | `src/features/auth/pages/AccountPage.jsx` |

## What it does

Full account management: upload/crop an avatar, edit profile details, and change the password. It's the deeper counterpart to the quick edits on the [Settings page](./settings.md).

## Key components

`AvatarField`, `Input`, `Button`. Forms use **`react-hook-form`** with **`zod`** validation.

## Data it needs and where it comes from

- `useAuth()` — `user`, `updateProfile`, `logout`.
- `api.post('/auth/change-password', …)` for the password change.
- Zod schemas: `profileSchema`, `passwordSchema`.

## Page-level logic

- The profile form resets when the `user` object changes.
- Errors are mapped to friendly messages (server 5xx internals are hidden).
- **On a successful password change, the user is logged out** (`logout()`) — because changing the password revokes all sessions server-side. See [../authentication.md](../authentication.md).

## Special behavior

- The password section is intentionally separate from the inline edits in Settings, to keep sensitive changes deliberate.

## Key things to remember

- Changing the password **logs you out everywhere** by design.
- Avatar uploads are size-limited (base64 data URLs capped around 400 KB) — see [../known-issues.md](../known-issues.md).
