import type { Comment, Item, Section } from "@/lib/api";

import { CommentCard } from "./CommentCard";

// Spectora's three comment types, in its own order, plus a group for rows whose type couldn't be read.
const GROUPS: { type: string; label: string; empty: string }[] = [
  { type: "info", label: "Information", empty: "No information comments in this item." },
  { type: "limit", label: "Limitations", empty: "No limitations in this item." },
  { type: "defect", label: "Defects", empty: "No defects in this item." },
  { type: "unknown", label: "Unclassified", empty: "" },
];

type Props = { section: Section; item: Item; highlightedRow: number | undefined };

export function ItemComments({ section, item, highlightedRow }: Props) {
  const byType = (type: string): Comment[] => item.comments.filter((c) => c.comment_type === type);
  return (
    <>
      <header className="border-b border-zinc-200 px-8 py-5">
        <p className="text-sm text-zinc-500">{section.name}</p>
        <h2 className="text-xl font-semibold text-zinc-900">{item.name}</h2>
      </header>
      {GROUPS.filter((g) => g.type !== "unknown" || byType("unknown").length > 0).map((group) => {
        const comments = byType(group.type);
        const headingId = `group-${group.type}`;
        return (
          <section key={group.type} aria-labelledby={headingId} className="px-8 pt-6">
            <h3 id={headingId} className="mb-2 text-sm font-semibold text-zinc-700">
              {group.label} <span className="font-normal text-zinc-500">({comments.length})</span>
            </h3>
            {comments.length ? (
              <ol className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200">
                {comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} highlighted={comment.source_row === highlightedRow} />
                ))}
              </ol>
            ) : (
              <p className="text-sm text-zinc-500">{group.empty}</p>
            )}
          </section>
        );
      })}
      <div className="h-8" />
    </>
  );
}
