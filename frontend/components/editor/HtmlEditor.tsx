"use client";

import { useRef, useState } from "react";

import { choiceInsertion, escapeHtml } from "@/lib/editable";

import { Note } from "../Note";
import { AnswerChoices } from "./AnswerChoices";
import { EditorFrame } from "./EditorFrame";

export type EditorProps = {
  html: string;
  choices: string[];
  firstChoice?: string; // added at the end when the editor opens
  save: (html: string | undefined) => Promise<void>;
  saving: boolean;
  error?: string;
  onCancel: () => void;
};

/** For comments whose markup the rich editor would drop (e.g. the export's empty video placeholder). */
export function HtmlEditor({ html, choices, firstChoice, save, saving, error, onCancel }: EditorProps) {
  const [draft, setDraft] = useState(() =>
    firstChoice ? html + escapeHtml(choiceInsertion(html, firstChoice, choices)) : html,
  );
  const area = useRef<HTMLTextAreaElement>(null);

  // Inserts an answer choice at the cursor, escaped, since this editor holds the comment's HTML.
  function insertChoice(choice: string) {
    const start = area.current?.selectionStart ?? draft.length;
    const end = area.current?.selectionEnd ?? draft.length;
    const text = escapeHtml(choiceInsertion(draft.slice(0, start), choice, choices));
    setDraft(draft.slice(0, start) + text + draft.slice(end));
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  return (
    <>
      <Note>
        This comment contains formatting the editor can&apos;t show, so you&apos;re editing its HTML directly. All of
        its text is kept; when you save, markup outside the allowed formatting (such as this placeholder&apos;s
        styling) is removed.
      </Note>
      <EditorFrame saving={saving} error={error} onSave={() => save(draft === html ? undefined : draft)} onCancel={onCancel}>
        <textarea
          ref={area}
          aria-label="Comment HTML"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
          className="block w-full resize-y bg-transparent px-3 py-2 font-mono text-xs leading-5 text-ink outline-hidden"
        />
        <AnswerChoices choices={choices} onPick={insertChoice} keepEditorFocus className="border-t border-line px-3 py-2.5" />
      </EditorFrame>
    </>
  );
}
