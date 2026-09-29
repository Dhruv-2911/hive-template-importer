import type { Section } from "@/lib/api";

type Props = {
  sections: Section[];
  selectedItemId: string | undefined;
  onSelect: (itemId: string) => void;
};

/** Sections and their items in the template's own order, as the inspector knows them from Spectora. */
export function SectionTree({ sections, selectedItemId, onSelect }: Props) {
  return (
    <nav aria-label="Sections and items" className="w-80 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50">
      <ol className="py-2">
        {sections.map((section) => (
          <li key={section.id} className="pb-2">
            <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {section.name}
            </h2>
            <ul>
              {section.items.map((item) => {
                const selected = item.id === selectedItemId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`flex w-full items-baseline justify-between gap-3 px-4 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-700 ${
                        selected
                          ? "border-l-2 border-teal-700 bg-white font-medium text-zinc-900"
                          : "border-l-2 border-transparent text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">{item.comments.length}</span>
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
