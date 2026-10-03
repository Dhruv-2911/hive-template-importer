import type { ReactNode } from "react";

import { ui } from "../styles";

type Props = { children: ReactNode; saving: boolean; error: string | undefined; onSave: () => void; onCancel: () => void };

/** Save / Cancel and any refusal, shared by the rich-text and HTML editors. */
export function EditorFrame({ children, saving, error, onSave, onCancel }: Props) {
  return (
    <div className={`mt-3 rounded-control border border-field bg-surface ${ui.focusWithin}`}>
      {children}
      <div className="flex items-center gap-2 border-t border-line bg-page px-2.5 py-2">
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
