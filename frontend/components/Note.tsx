import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** An amber callout: a note from the import, or a warning before editing HTML. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="mt-3 flex gap-2.5 rounded-control border border-note/25 bg-note-tint px-3.5 py-2.5 text-xs leading-5 text-ink">
      <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-note" />
      <span>{children}</span>
    </p>
  );
}
