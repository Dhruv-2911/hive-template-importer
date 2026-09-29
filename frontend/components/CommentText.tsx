"use client";

import { useState } from "react";

import { ApiError, type Comment } from "@/lib/api";
import { fitsRichEditor } from "@/lib/editable";
import { sanitizeCommentHtml } from "@/lib/sanitize";

import { HtmlEditor } from "./editor/HtmlEditor";
import { RichEditor } from "./editor/RichEditor";

type Props = { comment: Comment; onSave: (html: string) => Promise<unknown> };

/** A comment's text: shown sanitized, edited in place, with the imported original one click away. */
export function CommentText({ comment, onSave }: Props) {
  const [mode, setMode] = useState<"view" | "rich" | "html">("view");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [showOriginal, setShowOriginal] = useState(false);
  const edited = comment.text_html !== comment.source_text_html;
  const hasText = comment.text_html.trim() !== "";

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
    return <Editor html={comment.text_html} save={save} saving={saving} error={error} onCancel={close} />;
  }
  return (
    <>
      {hasText ? (
        <div
          className="comment-html mt-2 text-sm leading-6 text-zinc-800"
          dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.text_html) }}
        />
      ) : (
        comment.options.length === 0 && (
          <p className="mt-2 text-sm italic text-zinc-500">
            {edited ? "No text." : "No text in the Spectora export."}
          </p>
        )
      )}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-xs">
        <button
          type="button"
          onClick={() => setMode(fitsRichEditor(comment.text_html) ? "rich" : "html")}
          className="text-zinc-500 underline-offset-2 hover:text-teal-700 hover:underline"
        >
          {hasText ? "Edit text" : "Add text"}
        </button>
        {edited && (
          <>
            <span className="rounded border border-teal-200 bg-teal-50 px-1.5 font-medium text-teal-800">Text edited</span>
            <button
              type="button"
              aria-expanded={showOriginal}
              onClick={() => setShowOriginal((shown) => !shown)}
              className="text-zinc-500 underline-offset-2 hover:text-teal-700 hover:underline"
            >
              {showOriginal ? "Hide original text" : "Show original text"}
            </button>
          </>
        )}
      </div>
      {edited && showOriginal && (
        <div className="mt-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-xs font-medium text-zinc-500">Imported text</p>
          {comment.source_text_html.trim() ? (
            <div
              className="comment-html text-sm leading-6 text-zinc-700"
              dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.source_text_html) }}
            />
          ) : (
            <p className="text-sm italic text-zinc-500">No text in the Spectora export.</p>
          )}
        </div>
      )}
    </>
  );
}
