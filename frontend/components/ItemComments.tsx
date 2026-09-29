import type { Comment, Item, Notice, Section } from "@/lib/api";
import type { TemplateEdits } from "@/lib/useTemplateEdits";

import { CommentCard } from "./CommentCard";
import { InlineName } from "./InlineName";

// Spectora's three comment types, in its own order, plus a group for rows whose type couldn't be read.
const GROUPS: { type: string; label: string; empty: string }[] = [
  { type: "info", label: "Information", empty: "No information comments in this item." },
  { type: "limit", label: "Limitations", empty: "No limitations in this item." },
  { type: "defect", label: "Defects", empty: "No defects in this item." },
  { type: "unknown", label: "Unclassified", empty: "" },
];

type Props = {
  section: Section;
  item: Item;
  highlightedRow: number | undefined;
  notesByRow: Map<number, Notice[]>;
  edits: TemplateEdits;
};

export function ItemComments({ section, item, highlightedRow, notesByRow, edits }: Props) {
  const byType = (type: string): Comment[] => item.comments.filter((c) => c.comment_type === type);
  return (
    <>
      <header className="border-b border-zinc-200 px-8 py-5">
        <InlineName
          kind="section"
          value={section.name}
          source={section.source_name}
          onSave={(name) => edits.renameSection(section.id, name)}
          as="p"
          className="text-sm text-zinc-500"
        />
        <InlineName
          kind="item"
          value={item.name}
          source={item.source_name}
          onSave={(name) => edits.renameItem(item.id, name)}
          as="h2"
          className="text-xl font-semibold text-zinc-900"
        />
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
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    highlighted={comment.source_row === highlightedRow}
                    notes={notesByRow.get(comment.source_row) ?? []}
                    onRename={(name) => edits.editComment(comment.id, { name })}
                    onSaveText={(text_html) => edits.editComment(comment.id, { text_html })}
                  />
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
