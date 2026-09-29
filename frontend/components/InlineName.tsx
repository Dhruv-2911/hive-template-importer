"use client";

import { useRef, useState, type ElementType } from "react";

import { ApiError } from "@/lib/api";

type Props = {
  kind: "template" | "section" | "item" | "comment";
  value: string;
  source: string; // the imported value, kept unchanged
  onSave: (name: string) => Promise<unknown>;
  as?: ElementType;
  className?: string;
};

/** A name that can be renamed in place: Enter or clicking away saves, Escape cancels. */
export function InlineName({ kind, value, source, onSave, as: Tag = "span", className }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const cancelled = useRef(false);
  const label = `${kind[0].toUpperCase()}${kind.slice(1)} name`;

  async function save() {
    if (cancelled.current || saving) return;
    if (draft === value) return close(); // nothing changed: nothing is sent
    setSaving(true);
    try {
      await onSave(draft);
      close();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save the name. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setEditing(false);
    setError(undefined);
  }

  if (editing) {
    return (
      <div className="flex-1">
        <input
          aria-label={label}
          value={draft}
          autoFocus
          disabled={saving}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") {
              cancelled.current = true; // the blur that follows must not save
              close();
            }
          }}
          className={`w-full rounded border border-teal-600 bg-white px-1.5 py-0.5 outline-none ring-2 ring-teal-100 ${className ?? ""}`}
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  const edited = value !== source;
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <Tag className={className}>{value.trim() || <em className="text-zinc-500">(no name)</em>}</Tag>
      {edited && (
        <span className="rounded border border-teal-200 bg-teal-50 px-1.5 text-xs font-medium text-teal-800">Edited</span>
      )}
      <button
        type="button"
        aria-label={`Rename ${kind} “${value}”`}
        onClick={() => {
          cancelled.current = false;
          setDraft(value);
          setEditing(true);
        }}
        className="text-xs text-zinc-500 underline-offset-2 hover:text-teal-700 hover:underline"
      >
        Rename
      </button>
      {edited && (
        <button
          type="button"
          aria-expanded={showOriginal}
          onClick={() => setShowOriginal((shown) => !shown)}
          className="text-xs text-zinc-500 underline-offset-2 hover:text-teal-700 hover:underline"
        >
          {showOriginal ? "Hide original" : "Show original"}
        </button>
      )}
      {edited && showOriginal && <span className="w-full text-xs text-zinc-600">Imported as “{source}”</span>}
    </div>
  );
}
