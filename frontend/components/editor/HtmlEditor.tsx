"use client";

import { useState } from "react";

import { EditorFrame } from "./EditorFrame";

type Props = { html: string; save: (html: string | undefined) => Promise<void>; saving: boolean; error?: string; onCancel: () => void };

/** For comments whose markup the rich editor would drop (e.g. the export's empty video placeholder). */
export function HtmlEditor({ html, save, saving, error, onCancel }: Props) {
  const [draft, setDraft] = useState(html);
  return (
    <>
      <p role="note" className="mt-2 border-l-2 border-amber-400 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">
        This comment contains formatting the editor can&apos;t show, so you&apos;re editing its HTML directly. All of
        its text is kept; when you save, markup outside the allowed formatting (such as this placeholder&apos;s
        styling) is removed.
      </p>
      <EditorFrame saving={saving} error={error} onSave={() => save(draft === html ? undefined : draft)} onCancel={onCancel}>
        <textarea
          aria-label="Comment HTML"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
          className="block w-full resize-y rounded-t-md px-3 py-2 font-mono text-xs leading-5 text-zinc-800 outline-none"
        />
      </EditorFrame>
    </>
  );
}
