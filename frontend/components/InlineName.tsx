"use client";

import { Pencil } from "lucide-react";
import { useRef, useState, type ElementType } from "react";

import { ApiError } from "@/lib/api";

import { ui } from "./styles";

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
          className={`w-full ${ui.input} ${className ?? ""}`}
        />
        {error && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const edited = value !== source;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      <Tag className={className}>{value.trim() || <em className="text-meta">(no name)</em>}</Tag>
      {edited && (
        <span className={`${ui.badge} self-center text-accent`}>Edited</span>
      )}
      <button
        type="button"
        aria-label={`Rename ${kind} “${value}”`}
        onClick={() => {
          cancelled.current = false;
          setDraft(value);
          setEditing(true);
        }}
        className={ui.edit}
      >
        <Pencil aria-hidden className="size-3" />
        Rename
      </button>
      {edited && (
        <button
          type="button"
          aria-expanded={showOriginal}
          onClick={() => setShowOriginal((shown) => !shown)}
          className={ui.quiet}
        >
          {showOriginal ? "Hide original" : "Show original"}
        </button>
      )}
      {edited && showOriginal && <span className="w-full text-xs text-muted">Imported as “{source}”</span>}
    </div>
  );
}
