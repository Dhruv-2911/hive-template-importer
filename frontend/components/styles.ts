// Shared classes for the soft-UI style (docs/design.md). Depth has one meaning each: raised is a container or
// something to press, pressed is an input, the current choice or a read-only value.

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// For a group whose focused part can't show its own outline (a file input, the editor's text area).
const focusWithin = "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent";
// A button sinks while held down, like a key.
const press = "motion-safe:transition-shadow motion-safe:duration-150 active:neu-pressed-sm disabled:opacity-60";
const control = `inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control font-semibold neu-raised-sm ${press}`;

export const ui = {
  focus,
  focusWithin,
  card: "rounded-card bg-base neu-raised",
  well: "rounded-control bg-base neu-pressed",
  button: `${control} bg-base px-4 py-2 text-sm text-ink hover:text-accent ${focus}`,
  primary: `${control} bg-accent px-4 py-2 text-sm text-white hover:bg-accent-strong ${focus}`,
  smallButton: `${control} bg-base px-3 py-1 text-xs text-ink hover:text-accent ${focus}`,
  smallPrimary: `${control} bg-accent px-3 py-1 text-xs text-white hover:bg-accent-strong ${focus}`,
  link: `rounded-sm font-semibold text-accent underline-offset-2 hover:underline ${focus}`,
  // Secondary actions that sit next to a name (Rename, Show original): quiet until hovered.
  quiet: `rounded-sm text-xs font-medium text-meta underline-offset-2 hover:text-accent hover:underline ${focus}`,
  badge: "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-base px-2.5 py-0.5 text-xs font-semibold neu-pressed-sm",
  // A read-only value, such as an answer option.
  chip: "rounded-full bg-base px-3 py-1 text-xs font-medium text-muted neu-pressed-sm",
  input:
    "rounded-control bg-base px-2.5 py-1 text-ink neu-pressed focus:outline-2 focus:outline-offset-2 focus:outline-accent",
  sectionHeading: "text-lg font-bold tracking-tight text-ink",
  tableHead: "text-left text-xs font-bold uppercase tracking-wider text-meta",
};
