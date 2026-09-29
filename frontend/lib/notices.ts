import type { Notice } from "./api";

// How each kind of import notice is introduced to the inspector. The per-row message comes from the server.
export const NOTICE_KINDS: Record<string, { title: string; explanation: string }> = {
  EMBED_STRIPPED: {
    title: "Video not included in the export",
    explanation: "These comments had an embedded video in Spectora. The export keeps only an empty placeholder.",
  },
  DUPLICATE_NAME_IN_ITEM: {
    title: "Same name used twice in one item",
    explanation: "More than one comment in the item has this name. All of them were kept; check both are wanted.",
  },
  NO_TEXT_IN_SOURCE: {
    title: "No text in the export",
    explanation: "These comments have no wording in Spectora's file, so they were imported empty.",
  },
  UNKNOWN_TYPE: {
    title: "Comment type not recognised",
    explanation: "The type wasn't info, limit or defect. These comments were kept under Unclassified.",
  },
  BLANK_SECTION: { title: "Missing section name", explanation: "Kept under “(blank section)”." },
  BLANK_ITEM: { title: "Missing item name", explanation: "Kept under “(blank item)”." },
  VALUE_NOT_UNDERSTOOD: {
    title: "Value not understood",
    explanation: "A value wasn't in the expected form. It's shown as empty and kept as written.",
  },
  UNMODELLED_VALUE: {
    title: "Kept but not shown",
    explanation: "These rows have values in columns the editor doesn't show. The values are stored with the comment.",
  },
};

export function noticeKind(code: string) {
  return NOTICE_KINDS[code] ?? { title: code, explanation: "" };
}

/** Notices grouped by kind, most important kinds first (the order of NOTICE_KINDS). */
export function groupNotices(notices: Notice[]): { code: string; notices: Notice[] }[] {
  const order = Object.keys(NOTICE_KINDS);
  const codes = [...new Set(notices.map((n) => n.code))];
  codes.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  return codes.map((code) => ({ code, notices: notices.filter((n) => n.code === code) }));
}
