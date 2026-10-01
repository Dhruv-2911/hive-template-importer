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
      <div role="status" className={`flex items-start gap-5 p-6 ${ui.card}`}>
        <span aria-hidden className={`flex size-12 shrink-0 items-center justify-center rounded-full neu-pressed ${tone}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-6">
            {allMatch ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7L7 17" />}
          </svg>
        </span>
        <div>
          <p className={`text-lg font-bold tracking-tight ${tone}`}>
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
        <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat term="Rows in the file" value={r.source_rows} />
          <Stat term="Comments imported" value={r.comments_imported} />
          <Stat term="Sections" value={r.sections} />
          <Stat term="Items" value={r.items} />
        </dl>
        <dl className="mt-5 flex flex-wrap gap-3 text-sm text-muted">
          {TYPES.filter(([type]) => type !== "unknown" || r.by_type.unknown).map(([type, label]) => (
            <div key={type} className="flex gap-1.5 rounded-full bg-base px-4 py-1.5 neu-pressed-sm">
              <dt>{label}</dt>
              <dd className="font-bold tabular-nums text-ink">{r.by_type[type] ?? 0}</dd>
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
    <div className={`px-5 py-4 ${ui.card}`}>
      <dt className="text-xs font-bold uppercase tracking-wider text-meta">{term}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-ink">{value}</dd>
    </div>
  );
}
