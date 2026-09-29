import type { ImportReport } from "@/lib/api";

/** Columns stored with each comment but not editable, and what Spectora's export never contains. */
export function ReportColumns({ report }: { report: ImportReport }) {
  const filled = report.kept_not_editable.filter((column) => column.filled_rows > 0);
  const empty = report.kept_not_editable.filter((column) => column.filled_rows === 0);
  return (
    <>
      <section aria-labelledby="kept-heading">
        <h2 id="kept-heading" className="font-semibold text-zinc-900">
          Kept but not editable
        </h2>
        <p className="mb-2 text-sm text-zinc-600">
          Every column of the spreadsheet is stored with its comment. These can be seen but not changed here.
        </p>
        <table className="w-full overflow-hidden rounded-md border border-zinc-200 bg-white text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">Column</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Rows with a value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filled.map((column) => (
              <tr key={column.header}>
                <td className="px-4 py-1.5 text-zinc-800">{column.header}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-zinc-800">{column.filled_rows}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {empty.length > 0 && (
          <p className="mt-2 text-sm text-zinc-600">
            Empty in this file: {empty.map((column) => column.header).join(", ")}.
          </p>
        )}
      </section>

      <section aria-labelledby="missing-heading">
        <h2 id="missing-heading" className="font-semibold text-zinc-900">
          Not in Spectora&apos;s export
        </h2>
        <p className="mb-2 text-sm text-zinc-600">
          These are limits of the file Spectora produces, not of this importer. Nothing here could have come across.
        </p>
        <dl className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white text-sm">
          {report.not_in_export.map((entry) => (
            <div key={entry.key} className="grid gap-1 px-4 py-2 sm:grid-cols-[14rem_1fr]">
              <dt className="font-medium text-zinc-900">{entry.label}</dt>
              <dd className="text-zinc-600">{entry.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
