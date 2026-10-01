import type { ImportReport } from "@/lib/api";

import { ui } from "../styles";

/** Columns stored with each comment but not editable, and what Spectora's export never contains. */
export function ReportColumns({ report }: { report: ImportReport }) {
  const filled = report.kept_not_editable.filter((column) => column.filled_rows > 0);
  const empty = report.kept_not_editable.filter((column) => column.filled_rows === 0);
  return (
    <>
      <section aria-labelledby="kept-heading">
        <h2 id="kept-heading" className={ui.sectionHeading}>
          Kept but not editable
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Every column of the spreadsheet is stored with its comment. These can be seen but not changed here.
        </p>
        <div className={`px-2 py-1 ${ui.card}`}>
          <table className="w-full text-sm">
            <thead className={ui.tableHead}>
              <tr>
                <th scope="col" className="px-4 pb-2 pt-4">Column</th>
                <th scope="col" className="px-4 pb-2 pt-4 text-right">Rows with a value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filled.map((column) => (
                <tr key={column.header}>
                  <td className="px-4 py-2.5 text-ink">{column.header}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">{column.filled_rows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {empty.length > 0 && (
          <p className="mt-4 text-sm leading-6 text-muted">
            Empty in this file: {empty.map((column) => column.header).join(", ")}.
          </p>
        )}
      </section>

      <section aria-labelledby="missing-heading">
        <h2 id="missing-heading" className={ui.sectionHeading}>
          Not in Spectora&apos;s export
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          These are limits of the file Spectora produces, not of this importer. Nothing here could have come across.
        </p>
        <dl className={`divide-y divide-line px-2 text-sm ${ui.card}`}>
          {report.not_in_export.map((entry) => (
            <div key={entry.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr]">
              <dt className="font-semibold text-ink">{entry.label}</dt>
              <dd className="text-muted">{entry.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
