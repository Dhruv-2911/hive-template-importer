import { CircleCheck, CircleX } from "lucide-react";

import type { ImportReport } from "@/lib/api";

import { ui } from "../styles";

const TYPES: [string, string][] = [
  ["defect", "Defects"],
  ["info", "Information"],
  ["limit", "Limitations"],
  ["unknown", "Unclassified"],
];

export function ReportSummary({ report }: { report: ImportReport }) {
  const { reconciliation: r, verification: v } = report;
  const allMatch = v.matched === v.checked && r.comments_imported === r.source_rows;
  const tone = allMatch ? "text-success" : "text-danger";
  return (
    <>
      <div role="status" className={`flex items-start gap-4 p-5 ${ui.card}`}>
        <span
          aria-hidden
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${allMatch ? "bg-success-tint" : "bg-danger-tint"} ${tone}`}
        >
          {allMatch ? <CircleCheck className="size-5" /> : <CircleX className="size-5" />}
        </span>
        <div>
          <p className={`text-base font-semibold ${tone}`}>
            {allMatch
              ? `All ${v.checked} comments were saved and match the file.`
              : `${v.matched} of ${v.checked} comments match the file.`}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Before anything was kept, every saved comment was read back from the database and compared with the
            spreadsheet: its text, name, type, place in the template and every other column.
          </p>
        </div>
      </div>

      <section aria-labelledby="counts-heading">
        <h2 id="counts-heading" className={`mb-4 ${ui.sectionHeading}`}>
          What came in
        </h2>
        <dl className={`grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x ${ui.card}`}>
          <Stat term="Rows in the file" value={r.source_rows} />
          <Stat term="Comments imported" value={r.comments_imported} />
          <Stat term="Sections" value={r.sections} />
          <Stat term="Items" value={r.items} />
        </dl>
        <dl className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
          {TYPES.filter(([type]) => type !== "unknown" || r.by_type.unknown).map(([type, label]) => (
            <div key={type} className="flex gap-1.5 rounded-full border border-line bg-surface px-3 py-1">
              <dt>{label}</dt>
              <dd className="font-semibold tabular-nums text-ink">{r.by_type[type] ?? 0}</dd>
            </div>
          ))}
        </dl>
        {r.blank_rows.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Empty rows skipped: {r.blank_rows.join(", ")}. They had no value in any column.
          </p>
        )}
        {r.sheets_not_read.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Only the first sheet was read. Not read: {r.sheets_not_read.join(", ")}.
          </p>
        )}
      </section>
    </>
  );
}

function Stat({ term, value }: { term: string; value: number }) {
  return (
    // The number reads first on screen; the term still comes first for screen readers, as a <dl> requires.
    <div className="flex flex-col-reverse px-5 py-4">
      <dt className="mt-0.5 text-xs text-meta">{term}</dt>
      <dd className="text-2xl font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
