import type { ReactNode } from "react";

import { ui } from "../styles";

type Props = { children: ReactNode; saving: boolean; error: string | undefined; onSave: () => void; onCancel: () => void };

/** Save / Cancel and any refusal, shared by the rich-text and HTML editors. */
export function EditorFrame({ children, saving, error, onSave, onCancel }: Props) {
  return (
    <div className={`mt-3 rounded-card bg-base p-2 neu-pressed ${ui.focusWithin}`}>
      {children}
      <div className="flex items-center gap-3 px-2 pb-1.5 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          aria-label="Save text"
          className={ui.smallPrimary}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={ui.smallButton}
        >
          Cancel
        </button>
        {error && (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
