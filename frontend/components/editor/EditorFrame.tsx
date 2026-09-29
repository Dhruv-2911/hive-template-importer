import type { ReactNode } from "react";

type Props = { children: ReactNode; saving: boolean; error: string | undefined; onSave: () => void; onCancel: () => void };

/** Save / Cancel and any refusal, shared by the rich-text and HTML editors. */
export function EditorFrame({ children, saving, error, onSave, onCancel }: Props) {
  return (
    <div className="mt-2 rounded-md border border-teal-600 bg-white ring-2 ring-teal-100">
      {children}
      <div className="flex items-center gap-2 border-t border-zinc-200 px-2 py-1.5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label="Save text"
          className="rounded bg-teal-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
