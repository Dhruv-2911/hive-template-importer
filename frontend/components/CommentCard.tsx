import type { Comment, Notice } from "@/lib/api";
import { sanitizeCommentHtml } from "@/lib/sanitize";

import { InlineName } from "./InlineName";

// The labels Spectora's own export header gives the levels: "Category (-1: Low, 0: Med, 1: High)".
const SEVERITY: Record<number, { label: string; className: string }> = {
  [-1]: { label: "Low", className: "border-zinc-300 text-zinc-700" },
  0: { label: "Medium", className: "border-zinc-300 text-zinc-700" },
  1: { label: "High", className: "border-red-300 bg-red-50 text-red-800" },
};

type Props = { comment: Comment; highlighted: boolean; notes: Notice[]; onRename: (name: string) => Promise<unknown> };

export function CommentCard({ comment, highlighted, notes, onRename }: Props) {
  const severity = comment.severity === null ? undefined : SEVERITY[comment.severity];
  // Every limitation and defect in Spectora is a tick box ("boolean"), so only an unusual answer type is shown.
  const usualAnswer = comment.comment_type !== "info" && comment.answer_type === "boolean";
  return (
    <li
      id={`row-${comment.source_row}`}
      className={`px-4 py-3 ${highlighted ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : "bg-white"}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <InlineName
          kind="comment"
          value={comment.name}
          source={comment.source_name}
          onSave={onRename}
          as="h4"
          className="font-medium text-zinc-900"
        />
        <span className="shrink-0 text-xs tabular-nums text-zinc-500" title="Row in the Spectora spreadsheet">
          Row {comment.source_row}
        </span>
      </div>

      <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
        {severity && (
          <div className="flex items-center gap-1">
            <dt className="sr-only">Severity</dt>
            <dd className={`rounded border px-1.5 py-px font-medium ${severity.className}`}>{severity.label} severity</dd>
          </div>
        )}
        {comment.answer_type && !usualAnswer && <Detail term="Answer" value={comment.answer_type} />}
        {comment.recommendation && <Detail term="Recommendation" value={comment.recommendation} />}
        {comment.default_value && <Detail term="Default" value={comment.default_value} />}
      </dl>

      {comment.text_html.trim() ? (
        <div
          className="comment-html mt-2 text-sm leading-6 text-zinc-800"
          dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.text_html) }}
        />
      ) : (
        comment.options.length === 0 && (
          <p className="mt-2 text-sm italic text-zinc-500">No text in the Spectora export.</p>
        )
      )}

      {notes.map((note) => (
        <p key={note.code} role="note" className="mt-2 border-l-2 border-amber-400 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">
          <span className="font-semibold">From the import: </span>
          {note.message}
        </p>
      ))}

      {comment.options.length > 0 && (
        <ul aria-label="Answer options" className="mt-2 flex flex-wrap gap-1.5">
          {comment.options.map((option) => (
            <li key={option} className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
              {option}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt>{term}:</dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
