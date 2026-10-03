// Shared classes for the flat, Hive-like look (docs/design.md). Components use these and the theme tokens in
// app/globals.css, never raw colours.

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// For a group whose focused part can't show its own outline (a file input, the editor's text area).
const focusWithin = "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent";
const control =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control font-semibold " +
  "transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60";

export const ui = {
  focus,
  focusWithin,
  card: "rounded-card border border-line bg-surface shadow-card",
  // A read-only area set into a card: the imported original, an empty group.
  well: "rounded-control border border-line bg-page",
  button: `${control} border border-line bg-surface px-3.5 py-2 text-sm text-ink hover:bg-page ${focus}`,
  primary: `${control} bg-accent px-3.5 py-2 text-sm text-white hover:bg-accent-strong ${focus}`,
  smallButton: `${control} border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:bg-page ${focus}`,
  smallPrimary: `${control} bg-accent px-2.5 py-1 text-xs text-white hover:bg-accent-strong ${focus}`,
  link: `rounded-sm font-semibold text-accent underline-offset-2 hover:underline ${focus}`,
  // Rename and Edit text: always visible, so an inspector can see what can be changed.
  edit: `${control} border border-accent/30 bg-surface px-2.5 py-1 text-xs text-accent hover:bg-tint ${focus}`,
  // Secondary actions that sit next to an edit (Show original): quiet until hovered.
  quiet: `rounded-sm text-xs font-medium text-meta underline-offset-2 hover:text-accent hover:underline ${focus}`,
  badge: "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-page px-2 py-0.5 text-xs font-semibold",
  // An answer choice: clicking it adds the choice to the comment's text.
  choice:
    "inline-flex cursor-pointer items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs " +
    `font-medium text-ink transition-colors hover:border-accent/40 hover:bg-tint hover:text-accent motion-reduce:transition-none ${focus}`,
  input:
    "rounded-control border border-field bg-surface px-3 py-2 text-sm text-ink placeholder:text-meta " +
    "focus:border-accent focus:outline-2 focus:outline-offset-0 focus:outline-accent",
  eyebrow: "text-xs font-semibold uppercase tracking-wider text-accent",
  pageTitle: "text-2xl font-semibold tracking-tight text-ink",
  sectionHeading: "text-base font-semibold text-ink",
  tableHead: "text-left text-xs font-semibold uppercase tracking-wide text-meta",
};
