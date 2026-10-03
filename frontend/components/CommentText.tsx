"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { ApiError, type Comment } from "@/lib/api";
import { fitsRichEditor } from "@/lib/editable";
import { sanitizeCommentHtml } from "@/lib/sanitize";

import { AnswerChoices } from "./editor/AnswerChoices";
import { HtmlEditor } from "./editor/HtmlEditor";
import { RichEditor } from "./editor/RichEditor";
import { ui } from "./styles";

type Props = { comment: Comment; onSave: (html: string) => Promise<unknown> };

/** A comment's text: shown sanitized, edited in place, with the imported original one click away. */
export function CommentText({ comment, onSave }: Props) {
  const [mode, setMode] = useState<"view" | "rich" | "html">("view");
  // An answer choice clicked while reading: the editor opens with it added at the end.
  const [firstChoice, setFirstChoice] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [showOriginal, setShowOriginal] = useState(false);
  const edited = comment.text_html !== comment.source_text_html;
  const hasText = comment.text_html.trim() !== "";

  function open(choice?: string) {
    setFirstChoice(choice);
    setMode(fitsRichEditor(comment.text_html) ? "rich" : "html");
  }

  function close() {
    setMode("view");
    setError(undefined);
  }

  // `undefined` means nothing changed: close without sending anything.
  async function save(html: string | undefined) {
    if (html === undefined) return close();
    setSaving(true);
    try {
      await onSave(html);
      close();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save the text. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (mode !== "view") {
    const Editor = mode === "rich" ? RichEditor : HtmlEditor;
    return (
      <Editor
        html={comment.text_html}
        choices={comment.options}
        firstChoice={firstChoice}
        save={save}
        saving={saving}
        error={error}
        onCancel={close}
      />
    );
  }
  return (
    <>
      {hasText ? (
        <div
          className="comment-html mt-3 text-sm leading-6 text-ink"
          dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.text_html) }}
        />
      ) : (
        comment.options.length === 0 && (
          <p className="mt-3 text-sm italic text-meta">
            {edited ? "No text." : "No text in the Spectora export."}
          </p>
        )
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <button
          type="button"
          onClick={() => open()}
          className={ui.edit}
        >
          {hasText ? <Pencil aria-hidden className="size-3" /> : <Plus aria-hidden className="size-3" />}
          {hasText ? "Edit text" : "Add text"}
        </button>
        {edited && (
          <>
            <span className={`${ui.badge} text-accent`}>Text edited</span>
            <button
              type="button"
              aria-expanded={showOriginal}
              onClick={() => setShowOriginal((shown) => !shown)}
              className={ui.quiet}
            >
              {showOriginal ? "Hide original text" : "Show original text"}
            </button>
          </>
        )}
      </div>
      {edited && showOriginal && (
        <div className={`mt-3 px-4 py-3 ${ui.well}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-meta">Imported text</p>
          {comment.source_text_html.trim() ? (
            <div
              className="comment-html mt-1 text-sm leading-6 text-muted"
              dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.source_text_html) }}
            />
          ) : (
            <p className="mt-1 text-sm italic text-meta">No text in the Spectora export.</p>
          )}
        </div>
      )}
      <AnswerChoices choices={comment.options} onPick={open} className="mt-4" />
    </>
  );
}
