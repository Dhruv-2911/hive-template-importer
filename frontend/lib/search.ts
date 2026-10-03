import type { TemplateTree } from "./api";

// Search within one template, in the browser (SPEC.md US9). No API call: the whole tree is already loaded.

export type Hit = {
  key: string;
  kind: "section" | "item" | "comment";
  label: string; // the name that was searched
  where: string; // Section › Item, for context
  itemId: string; // what opens when it's chosen
  row?: number; // a comment's spreadsheet row, highlighted when it opens
  excerpt?: string; // the matching text, when the match is in a comment's text rather than its name
};

type Entry = Omit<Hit, "excerpt"> & { name: string; text: string };

export const MIN_QUERY = 2;
export const MAX_HITS = 50;

/** Comment HTML as plain text. DOMParser builds an inert document, so nothing in it runs or loads. */
function plainText(html: string): string {
  if (!html) return "";
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
  return text.replace(/\s+/g, " ").trim();
}

/** Everything searchable in a template, in its own order. */
export function searchIndex(template: TemplateTree): Entry[] {
  const entries: Entry[] = [];
  for (const section of template.sections) {
    const first = section.items[0];
    if (first) {
      entries.push({ key: `s-${section.id}`, kind: "section", label: section.name, name: section.name, text: "", where: "Section", itemId: first.id });
    }
    for (const item of section.items) {
      entries.push({ key: `i-${item.id}`, kind: "item", label: item.name, name: item.name, text: "", where: section.name, itemId: item.id });
      for (const comment of item.comments) {
        entries.push({
          key: `c-${comment.id}`,
          kind: "comment",
          label: comment.name.trim() || "(no name)",
          name: comment.name,
          text: plainText(comment.text_html),
          where: `${section.name} › ${item.name}`,
          itemId: item.id,
          row: comment.source_row,
        });
      }
    }
  }
  return entries;
}

/** Hits for a query, in template order: those whose name or text contains it, ignoring case. */
export function search(entries: Entry[], query: string): { hits: Hit[]; total: number } {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < MIN_QUERY) return { hits: [], total: 0 };
  const hits: Hit[] = [];
  let total = 0;
  for (const entry of entries) {
    const inName = entry.name.toLocaleLowerCase().includes(needle);
    const at = inName ? -1 : entry.text.toLocaleLowerCase().indexOf(needle);
    if (!inName && at < 0) continue;
    total += 1;
    if (hits.length < MAX_HITS) {
      const { key, kind, label, where, itemId, row } = entry;
      hits.push({ key, kind, label, where, itemId, row, excerpt: at < 0 ? undefined : excerpt(entry.text, at, needle.length) });
    }
  }
  return { hits, total };
}

/** About a line of text around the match, cut at word boundaries. */
function excerpt(text: string, at: number, length: number): string {
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - 40)) + 1);
  const endSpace = text.indexOf(" ", Math.min(text.length, at + length + 60));
  const end = endSpace < 0 ? text.length : endSpace;
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}
