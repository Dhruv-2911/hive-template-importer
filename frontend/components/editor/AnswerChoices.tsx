import { Plus } from "lucide-react";
import { useId } from "react";

import { ui } from "../styles";

type Props = {
  choices: string[];
  onPick: (choice: string) => void;
  // Inside an editor: a mouse click leaves focus (and the cursor) in the text, so typing carries on where it was.
  keepEditorFocus?: boolean;
  className?: string;
};

/** Spectora's multiple-choice answers. Clicking one adds it to the comment's text; typing works as well. */
export function AnswerChoices({ choices, onPick, keepEditorFocus = false, className }: Props) {
  const label = useId();
  if (choices.length === 0) return null;
  return (
    <div className={className}>
      <p id={label} className="text-xs font-semibold text-muted">
        Answer choices <span className="font-normal text-meta">· click one to add it to the text</span>
      </p>
      <div role="group" aria-labelledby={label} className="mt-1.5 flex flex-wrap gap-2">
        {choices.map((choice, index) => (
          <button
            key={`${index}-${choice}`}
            type="button"
            aria-label={`Add “${choice}” to the text`}
            onMouseDown={keepEditorFocus ? (event) => event.preventDefault() : undefined}
            onClick={() => onPick(choice)}
            className={ui.choice}
          >
            <Plus aria-hidden className="size-3 text-meta" />
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
