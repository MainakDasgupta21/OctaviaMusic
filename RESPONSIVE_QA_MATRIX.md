# Responsive QA Matrix

This matrix is the acceptance contract for responsive behavior across the app.
Breakpoints align with `tailwind.config.ts` and spacing tokens in `src/index.css`.

## Breakpoint Bands

- `phone-sm`: `<480`
- `phone`: `480-639` (`xs`)
- `phone-lg`: `640-767` (`sm`)
- `tablet`: `768-1023` (`md`)
- `desktop`: `1024-1279` (`lg`)
- `desktop-wide`: `>=1280` (`xl+`)

## Representative Devices

- `phone-sm`: iPhone SE
- `phone`: iPhone 12 Pro / Pixel 7
- `phone-lg`: iPhone 14 Pro Max / Samsung Galaxy S20 Ultra
- `tablet`: iPad Mini (portrait), Surface Duo (single pane)
- `desktop`: iPad Pro landscape / Surface Pro 7 landscape / small laptop
- `desktop-wide`: 1280+ desktop viewport

## Global Acceptance Checks (All Routes)

- No page-level horizontal scroll.
- Fixed chrome does not hide actionable content.
- Tap targets remain reachable and visually clear on touch devices.
- Popovers/dialogs stay within viewport with safe side padding.
- Key data rows are readable without clipping/overlap.
- Scroll behavior is single-responsibility (no double-scroll traps).

## Route Checklist

| Route | Primary checks |
| --- | --- |
| `/` Home | Hero, rails, and cards remain readable; no clipped decorative layers. |
| `/search` | Filter rail scroll works intentionally; result rows stay aligned. |
| `/explore` | Deck/cards do not overflow in portrait or landscape. |
| `/trending` | Track list columns collapse cleanly by breakpoint. |
| `/genres` | Decorative typography does not force horizontal overflow. |
| `/charts` | Header and row columns remain synchronized at `md` and `lg`. |
| `/favorites` | Saved track/album lists avoid clipping in tablet band. |
| `/library` | Tab rail is usable on phones; card grids are not cramped. |
| `/playlist/:id` | Hero + tracks stack cleanly on narrow and tablet viewports. |
| `/album/:id` | Metadata and controls wrap without overlap. |
| `/artist/:id` | Hero + sticky context remain usable in both orientations. |
| `/player` | Controls, queue, and lyrics are accessible without double scroll. |
| `/settings` | Form controls and grouped cards stay within viewport bounds. |

## Validation Workflow

1. Verify global shell behavior first (`MainLayout`, `FooterPlayer`, `TopBar`).
2. Verify dense list/grid surfaces (`charts`, track lists).
3. Verify player route scroll and panel behavior.
4. Verify route-level polish and decorative overflow safeguards.
5. Re-run lint on touched files and complete spot checks across representative devices.
