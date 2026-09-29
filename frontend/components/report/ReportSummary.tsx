import type { ImportReport } from "@/lib/api";

const TYPES: [string, string][] = [
  ["defect", "Defects"],
  ["info", "Information"],
  ["limit", "Limitations"],
  ["unknown", "Unclassified"],
];

export function ReportSummary({ report }: { report: ImportReport }) {
  const { reconciliation: r, verification: v } = report;
  const allMatch = v.matched === v.checked && r.comments_imported === r.source_rows;
  return (
    <>
      <div
        role="status"
        className={`rounded-md border p-4 ${allMatch ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-red-300 bg-red-50 text-red-900"}`}
      >
        <p className="font-semibold">
          {allMatch
            ? `All ${v.checked} comments were saved and match the file.`
            : `${v.matched} of ${v.checked} comments match the file.`}
        </p>
        <p className="mt-1 text-sm">
          Before anything was kept, every saved comment was read back from the database and compared with the
          spreadsheet: its text, name, type, place in the template and every other column.
        </p>
      </div>

      <section aria-labelledby="counts-heading">
        <h2 id="counts-heading" className="mb-2 font-semibold text-zinc-900">
          What came in
        </h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 sm:grid-cols-4">
          <Stat term="Rows in the file" value={r.source_rows} />
          <Stat term="Comments imported" value={r.comments_imported} />
          <Stat term="Sections" value={r.sections} />
          <Stat term="Items" value={r.items} />
        </dl>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600">
          {TYPES.filter(([type]) => type !== "unknown" || r.by_type.unknown).map(([type, label]) => (
            <div key={type} className="flex gap-1.5">
              <dt>{label}</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">{r.by_type[type] ?? 0}</dd>
            </div>
          ))}
        </dl>
        {r.blank_rows.length > 0 && (
          <p className="mt-2 text-sm text-zinc-600">
            Empty rows skipped: {r.blank_rows.join(", ")}. They had no value in any column.
          </p>
        )}
        {r.sheets_not_read.length > 0 && (
          <p className="mt-2 text-sm text-zinc-600">
            Only the first sheet was read. Not read: {r.sheets_not_read.join(", ")}.
          </p>
        )}
      </section>
    </>
  );
}

function Stat({ term, value }: { term: string; value: number }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs text-zinc-500">{term}</dt>
      <dd className="text-xl font-semibold tabular-nums text-zinc-900">{value}</dd>
    </div>
  );
}
