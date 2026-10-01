import type { Section } from "@/lib/api";

import { ui } from "./styles";

const ITEM = "flex w-full items-baseline justify-between gap-3 rounded-control px-3 py-2 text-left text-sm";
// Inside a scrolling panel an outer outline would be clipped, so this one is drawn inset.
const ITEM_FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

type Props = {
  sections: Section[];
  selectedItemId: string | undefined;
  onSelect: (itemId: string) => void;
};

/** Sections and their items in the template's own order, as the inspector knows them from Spectora. */
export function SectionTree({ sections, selectedItemId, onSelect }: Props) {
  return (
    <nav aria-label="Sections and items" className={`scrollbar-soft w-80 shrink-0 overflow-y-auto px-3 py-2 ${ui.card}`}>
      <ol>
        {sections.map((section) => (
          <li key={section.id} className="pb-1">
            <h2 className="px-3 pb-1.5 pt-4 text-xs font-bold uppercase tracking-wider text-meta">
              {section.name}
            </h2>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const selected = item.id === selectedItemId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`${ITEM} ${ITEM_FOCUS} ${
                        selected ? "font-semibold text-accent neu-pressed-sm" : "text-ink hover:text-accent"
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className={`shrink-0 text-xs tabular-nums ${selected ? "text-accent" : "text-meta"}`}>
                        {item.comments.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </nav>
  );
}
