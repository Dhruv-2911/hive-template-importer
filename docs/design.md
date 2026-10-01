# Visual design: soft UI (neumorphism)

Decided 2026-10-01 at the user's request: the app uses a neumorphic ("soft UI") style. It's a restyle only. Every
screen, label, role and behaviour stays the same, so the e2e tests (which select by role, text and `#row-N`) still
apply unchanged.

## The idea

There's one surface colour. Everything is either part of the page, **raised** off it, or **pressed** into it, using two
soft shadows (light from the top left, dark to the bottom right). Depth carries meaning, and only these meanings:

| Depth | Used for |
|---|---|
| **Raised** | Containers (the section navigator, comment cards, report panels) and things you can press (buttons). |
| **Pressed** (inset) | Where you type (inputs, the editor), the current choice (the selected item, an active toolbar button), and read-only values (badges, answer options, the imported original). |
| A button being pressed | Raised at rest, pressed while held down, so it sinks like a physical key. |

There are two elevations (`raised`, `raised-sm`) and two insets (`pressed`, `pressed-sm`), and nothing else. Borders and
shadows are never combined.

## Where neumorphism usually fails, and the guard rails

Soft UI's known weaknesses are grey-on-grey text, controls you can only find by their shadow, and invisible focus.
These rules prevent them:

- **Text contrast is at least 4.5:1** on the base `#e6ebf1`: ink `#1e2a38` (12.1:1), muted `#4a5668` (6.2:1), meta
  `#566376` (5.1:1), links `#0d6b61` (5.3:1), danger `#b42318` (5.5:1). No text is lighter than the meta colour.
- **The main action on each screen is filled teal** (white text, 6.4:1): *Choose export file…*, *Open template*, *Save*.
  It doesn't rely on depth to be found.
- **Focus is a solid 2px teal outline** with an offset on every control. It's never removed, and it uses `outline`, so
  it can't be lost among the shadows.
- **Selection is never shown by depth alone.** The selected item is also teal and semibold with `aria-current`, and an
  active toolbar button is also teal with `aria-pressed`.
- **The linked comment** (from a report row) gets a 2px amber-700 outline (4.2:1 against the base) as well as its import
  note.
- **Motion:** shadows animate only under `prefers-reduced-motion: no-preference`.

## Tokens

They're defined once in `frontend/app/globals.css` (`@theme` colours plus `@utility` shadows) and used by name
(`bg-base`, `text-ink`, `text-muted`, `text-meta`, `text-accent`, `neu-raised`, `neu-pressed`). Components don't use raw
hex values or one-off shadows.

- **Type:** the platform's own UI font (San Francisco, Segoe UI, Roboto or Ubuntu), with tabular figures for counts
  and row numbers. Manrope and Plus Jakarta Sans were tried first, and both rendered with uneven letter and word
  spacing on Linux Chrome at 12–14px. The system font is hinted for its screen and needs no download.
- **Radius scale:** 10px for controls, 16px for cards and panels, and fully round for pills and badges.
- **Spacing:** Tailwind's 4px scale, unchanged.

## Rejected

Gradients on surfaces, glows, coloured shadows, glassmorphism, more than two elevations, and shadow-only primary
actions. Dark mode is also out: the app was light-only before and stays light-only.
