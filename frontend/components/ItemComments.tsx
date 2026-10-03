import { Pencil } from "lucide-react";

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
      <header className="px-10 pb-1 pt-8">
        <InlineName
          kind="section"
          value={section.name}
          source={section.source_name}
          onSave={(name) => edits.renameSection(section.id, name)}
          as="p"
          className="text-sm font-medium text-meta"
        />
        <InlineName
          kind="item"
          value={item.name}
          source={item.source_name}
          onSave={(name) => edits.renameItem(item.id, name)}
          as="h2"
          className="text-2xl font-semibold tracking-tight text-ink"
        />
        <p className="mt-4 flex items-start gap-2.5 rounded-control bg-tint px-3.5 py-2.5 text-sm text-ink">
          <Pencil aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            Use <strong className="font-semibold">Rename</strong> on the section, the item or any comment, and{" "}
            <strong className="font-semibold">Edit text</strong> to change what a comment says: type your own words or
            click an answer choice to add it. Spectora&apos;s original is always kept, so you can compare.
          </span>
        </p>
      </header>
      {GROUPS.filter((g) => g.type !== "unknown" || byType("unknown").length > 0).map((group) => {
        const comments = byType(group.type);
        const headingId = `group-${group.type}`;
        return (
          <section key={group.type} aria-labelledby={headingId} className="px-10 pt-7">
            <h3 id={headingId} className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              {group.label} <span className="font-semibold text-meta">({comments.length})</span>
            </h3>
            {comments.length ? (
              <ol className="space-y-3">
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
              <p className={`px-4 py-3 text-sm text-muted ${ui.well}`}>{group.empty}</p>
            )}
          </section>
        );
      })}
      <div className="h-10" />
    </>
  );
}
