import type { Comment, Notice } from "@/lib/api";
import { CommentText } from "./CommentText";
import { InlineName } from "./InlineName";
import { Note } from "./Note";
import { ui } from "./styles";

// The labels Spectora's own export header gives the levels: "Category (-1: Low, 0: Med, 1: High)".
const QUIET = "border-line bg-page text-muted";
const SEVERITY: Record<number, { label: string; className: string }> = {
  [-1]: { label: "Low", className: QUIET },
  0: { label: "Medium", className: QUIET },
  1: { label: "High", className: "border-danger/30 bg-danger-tint text-danger" },
};

type Props = {
  comment: Comment;
  highlighted: boolean;
  notes: Notice[];
  onRename: (name: string) => Promise<unknown>;
  onSaveText: (html: string) => Promise<unknown>;
};

export function CommentCard({ comment, highlighted, notes, onRename, onSaveText }: Props) {
  const severity = comment.severity === null ? undefined : SEVERITY[comment.severity];
  // Every limitation and defect in Spectora is a tick box ("boolean"), so only an unusual answer type is shown.
  const usualAnswer = comment.comment_type !== "info" && comment.answer_type === "boolean";
  return (
    <li
      id={`row-${comment.source_row}`}
      className={`px-5 py-4 ${ui.card} ${highlighted ? "outline-2 outline-offset-2 outline-note" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <InlineName
          kind="comment"
          value={comment.name}
          source={comment.source_name}
          onSave={onRename}
          as="h4"
          className="font-semibold text-ink"
        />
        <span className={`${ui.badge} tabular-nums text-meta`} title="Row in the Spectora spreadsheet">
          Row {comment.source_row}
        </span>
      </div>

      <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        {severity && (
          <div className="flex items-center gap-1">
            <dt className="sr-only">Severity</dt>
            <dd
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${severity.className}`}
            >
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              {severity.label} severity
            </dd>
          </div>
        )}
        {comment.answer_type && !usualAnswer && <Detail term="Answer" value={comment.answer_type} />}
        {comment.recommendation && <Detail term="Recommendation" value={comment.recommendation} />}
        {comment.default_value && <Detail term="Default" value={comment.default_value} />}
      </dl>

      <CommentText comment={comment} onSave={onSaveText} />

      {notes.map((note) => (
        <Note key={note.code}>
          <span className="font-bold">From the import: </span>
          {note.message}
        </Note>
      ))}

      {comment.options.length > 0 && (
        <ul aria-label="Answer options" className="mt-3 flex flex-wrap gap-2">
          {comment.options.map((option) => (
            <li key={option} className={ui.chip}>
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
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
