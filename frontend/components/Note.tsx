import type { ReactNode } from "react";

/** A callout pressed into the card, marked with an amber bar: an import note, or a warning before editing HTML. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="mt-3 flex gap-3 rounded-control bg-base px-4 py-2.5 text-xs leading-5 text-ink neu-pressed-sm">
      <span aria-hidden className="w-1 shrink-0 rounded-full bg-note" />
      <span>{children}</span>
    </p>
  );
}
