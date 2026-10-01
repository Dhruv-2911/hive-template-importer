import type { Comment, Item, Notice, Section } from "@/lib/api";
import type { TemplateEdits } from "@/lib/useTemplateEdits";

import { CommentCard } from "./CommentCard";
import { InlineName } from "./InlineName";
import { ui } from "./styles";

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
      <header className="px-8 pb-1 pt-6">
        <InlineName
          kind="section"
          value={section.name}
          source={section.source_name}
          onSave={(name) => edits.renameSection(section.id, name)}
          as="p"
          className="text-sm font-semibold text-meta"
        />
        <InlineName
          kind="item"
          value={item.name}
          source={item.source_name}
          onSave={(name) => edits.renameItem(item.id, name)}
          as="h2"
          className="text-2xl font-bold tracking-tight text-ink"
        />
      </header>
      {GROUPS.filter((g) => g.type !== "unknown" || byType("unknown").length > 0).map((group) => {
        const comments = byType(group.type);
        const headingId = `group-${group.type}`;
        return (
          <section key={group.type} aria-labelledby={headingId} className="px-8 pt-8">
            <h3 id={headingId} className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">
              {group.label} <span className="font-semibold text-meta">({comments.length})</span>
            </h3>
            {comments.length ? (
              <ol className="space-y-5">
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
              <p className={`px-5 py-4 text-sm text-muted ${ui.well}`}>{group.empty}</p>
            )}
          </section>
        );
      })}
      <div className="h-10" />
    </>
  );
}
