# Visual design: Hive's layout, flat look

**Decided 2026-10-03.** This replaces the soft-UI (neumorphism) style of 2026-10-01. The user asked for the layout and
flat look of Hive's own template screen, so the importer feels like part of the product it feeds. We borrow the
structure, not the brand: no Hive name, logo or copy appears in the app.

## Layout

| Screen | Structure |
|---|---|
| **App shell** (every page except sign-in) | A left rail: the app mark and name, then **Templates** and **Import from Spectora**, and the signed-in email with **Sign out** at the bottom. Pages sit on a faint page background to its right. |
| **Template** (`/template/?id=`) | Top row: **Search this template** on the left, **Import report** and **Duplicate** on the right. Below it, a left panel with **← Back to Templates**, the template name, an **Overview** entry, then sections that expand to show their items, with comment counts. The right side shows the Overview or the open item's comments. |
| **Overview** (where the app opens) | Eyebrow *Template overview*, the name, one stat strip (sections, items, comments), the comment types, an *Import* card (file, date, the verification result, links to the report and the original file), a *Template settings* card (rename) and a *Sections* card. |
| **Templates** (`/templates/`) | Title, then one card listing the templates. **Import from Spectora** is the primary action. |
| **Import from Spectora** (`/upload/`) | The how-to-export steps and the file chooser. A refusal says what to do next. |
| **Import report** (`/import/?id=`) | Unchanged in content; restyled as cards. |
| **Sign in** (`/login/`) | No shell: one centered card with *Sign in* / *Create account*. |

Only real destinations appear. Hive's placeholders that this app doesn't have (Calendar, Inspections, drag handles,
⋮ menus for reordering or deleting) are left out. ADR-007 keeps add, delete and reorder out of scope.

## Look

- **Surfaces:** white cards with a 1px `line` border, a 12px radius and a faint shadow, on the page background
  `#f6f7fb`. The left rail and the template's section panel are white with a right border.
- **Accent:** blue `#3d55d8` for primary buttons, links, the current navigation entry and focus. Primary buttons are
  solid with white text and an icon. Secondary buttons are white with a border.
- **Selection:** the open tree entry (Overview or an item) is solid accent with white text, like Hive's. The current
  rail entry is accent text on a light tint.
- **Icons:** `lucide-react` line icons, always beside a text label or given an `aria-label`. Icons alone are `aria-hidden`.
- **Type:** the platform's own UI font. Manrope and Plus Jakarta Sans rendered with uneven spacing on Linux Chrome at
  12–14px (tried 2026-10-01), and the walkthrough is recorded on Linux.
- **Radius scale:** 8px for controls, 12px for cards. **Spacing:** Tailwind's 4px scale.

## Accessibility guard rails

| Use | Colour | Contrast |
|---|---|---|
| Body text (ink) | `#111827` | 17.7:1 on white, 16.6:1 on the page |
| Secondary text (muted) | `#4b5563` | 7.6:1 on white |
| Meta text (row numbers, counts) | `#6b7280` | 4.8:1 on white, 4.5:1 on the page. Never on the tint. |
| Links and accent text | `#3d55d8` | 6.0:1 on white, 5.3:1 on the tint |
| White on the accent (primary button, selected entry) | `#ffffff` on `#3d55d8` | 6.0:1 |
| Danger / success / note | `#b42318` / `#067647` / `#b45309` | 6.6 / 5.7 / 5.0:1 on white |
| Text-field borders | `#868fa1` | 3.3:1 on white (the WCAG 1.4.11 minimum for controls is 3:1) |

- **Focus:** a 2px accent outline with a 2px offset on every control, drawn inset inside scrolling panels so it isn't
  clipped.
- **State is never colour alone:** the open entry also has `aria-current`, sections have `aria-expanded`, and the search
  results are an ARIA combobox and listbox.
- **Motion:** only colour transitions, and none under `prefers-reduced-motion: reduce`.

## Tokens

They're defined once in `frontend/app/globals.css` (`@theme`) and used by name: `bg-page`, `bg-surface`, `bg-tint`,
`text-ink`, `text-muted`, `text-meta`, `text-accent`, `border-line`, `border-field`. Shared class strings live in
`frontend/components/styles.ts`. Components don't use raw hex values.

## Rejected

- **Neumorphism** (2026-10-01 to 2026-10-03): replaced at the user's request.
- **Copying Hive's brand:** its logo, name and exact colours.
- **Placeholder navigation and controls** for features this app doesn't have.
- **Dark mode:** the app is light only.
