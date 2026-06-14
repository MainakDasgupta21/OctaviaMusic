# Settings Page (`/settings`)

> **What you'll learn here:** the preferences page, its anchored sections, how settings persist, and export/import/reset.

| | |
|--|--|
| **Route** | `/settings` |
| **Access** | **Protected** · inside `MainLayout` |
| **File** | `src/pages/SettingsPage.jsx` |

## What it does

App preferences, grouped into seven anchored sections: **playback**, **appearance**, **shortcuts reference**, **notifications**, **account shortcuts**, and **about**. Users change theme/accent/text size, toggle playback options, edit their display name/email inline, and export/import/reset settings.

## Key components

Internal `SectionCard`, `AvatarField`, `EditableField`, plus `Switch`, `Slider`, `Kbd`, and theme/accent pickers.

## Data it needs and where it comes from

- **`useSettings()`** — `settings`, `updateSetting`, `resetSettings`, `importSettings`. For signed-in users these persist to the server (`PATCH /api/me/settings`); the context handles syncing. See [../state-management.md](../state-management.md).
- **`useAuth()`** — `user`, `updateProfile` (for inline display-name/email edits).
- A DOM `IntersectionObserver` on `#main-content` powers a scroll-spy that highlights the current section in the sticky nav.

## Page-level logic

- Sticky section nav with a `layoutId` sliding pill; clicking scrolls to the section.
- **Export** strips identity fields before producing the JSON.
- **Import** validates the JSON before applying.
- `EditableField` saves asynchronously and shows toast errors on failure.

## Special behavior

- Seven anchored sections (`set-playback` … `set-about`).
- Theme previews mirror the real CSS `data-theme` looks; accent offers presets plus a `DYNAMIC_ACCENT` (art-following) option.
- Deep edits like password/avatar link out to the [Account page](./account.md).

## Key things to remember

- For signed-in users, settings **sync to the server**; the appearance settings are also applied globally by `SettingsEffects`.
- Theme uses **`data-theme`** attributes, not a CSS class — see [../styling-guide.md](../styling-guide.md).
