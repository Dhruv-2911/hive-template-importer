import { ChevronRight, CircleCheck, CircleX, ClipboardCheck, Download } from "lucide-react";
import Link from "next/link";

import { api, type ImportRun, type TemplateTree } from "@/lib/api";
import type { TemplateEdits } from "@/lib/useTemplateEdits";

import { InlineName } from "./InlineName";
import { ui } from "./styles";

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
// Spectora's own order of comment types.
const TYPES: [string, string][] = [
  ["info", "Information"],
  ["limit", "Limitations"],
  ["defect", "Defects"],
  ["unknown", "Unclassified"],
];

type Props = {
  template: TemplateTree;
  run: ImportRun | undefined;
  edits: TemplateEdits;
  onOpenItem: (itemId: string) => void;
};

/** Where a template opens: what it holds, whether the import checked out, and its settings (SPEC.md US3). */
export function TemplateOverview({ template, run, edits, onOpenItem }: Props) {
  const items = template.sections.flatMap((section) => section.items);
  const comments = items.flatMap((item) => item.comments);
  const byType = (type: string) => comments.filter((c) => c.comment_type === type).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-10 py-8">
      <p className={ui.eyebrow}>Template overview</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{template.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {template.copied_from_id
          ? `A copy made ${date.format(new Date(template.created_at))}. It's edited separately from the original.`
          : `Imported from Spectora ${date.format(new Date(template.created_at))}.`}
      </p>

      <dl className={`mt-6 grid grid-cols-3 divide-x divide-line ${ui.card}`}>
        <Stat term="Sections" value={template.sections.length} />
        <Stat term="Items" value={items.length} />
        <Stat term="Comments" value={comments.length} />
      </dl>
      <dl className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
        {TYPES.filter(([type]) => type !== "unknown" || byType(type)).map(([type, label]) => (
          <div key={type} className="flex gap-1.5 rounded-full border border-line bg-surface px-3 py-1">
            <dt>{label}</dt>
            <dd className="font-semibold tabular-nums text-ink">{byType(type)}</dd>
          </div>
        ))}
      </dl>

      <Card title="Import check" description="Every comment was read back from the database and compared with the file before it was kept.">
        <ImportCheck run={run} />
      </Card>

      <Card title="Template settings" description="The name your team sees in the template list.">
        <p className="mb-1.5 text-sm font-semibold text-ink">Template name</p>
        <div className={`px-3 py-2.5 ${ui.well}`}>
          <InlineName
            kind="template"
            value={template.name}
            source={template.source_name}
            onSave={edits.renameTemplate}
            as="p"
            className="text-sm font-medium text-ink"
          />
        </div>
        {!template.copied_from_id && (
          <p className="mt-2 text-xs text-meta">
            Spectora&apos;s export doesn&apos;t include the template&apos;s name, so it was taken from the file name.
          </p>
        )}
      </Card>

      <Card title={`Sections (${template.sections.length})`} description="In the same order as in Spectora. Open one to see its comments.">
        <ol className="-mx-5 -mb-5 divide-y divide-line border-t border-line">
          {template.sections.map((section) => {
            const count = section.items.reduce((total, item) => total + item.comments.length, 0);
            const first = section.items[0];
            return (
              <li key={section.id}>
                <button
                  type="button"
                  disabled={!first}
                  onClick={() => first && onOpenItem(first.id)}
                  className={`flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-page ${ui.focus}`}
                >
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink">{section.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-meta">
                    {section.items.length} items · {count} comments
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-meta" />
                </button>
              </li>
            );
          })}
        </ol>
      </Card>
      <div className="h-6" />
    </div>
  );
}

function Stat({ term, value }: { term: string; value: number }) {
  // The number reads first on screen; the term still comes first for screen readers, as a <dl> requires.
  return (
    <div className="flex flex-col-reverse px-6 py-4">
      <dt className="mt-0.5 text-xs text-meta">{term}</dt>
      <dd className="text-2xl font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const id = `card-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`mt-6 overflow-hidden p-5 ${ui.card}`}>
      <h3 id={id} className={ui.sectionHeading}>
        {title}
      </h3>
      <p className="mb-4 mt-0.5 text-sm text-muted">{description}</p>
      {children}
    </section>
  );
}

function ImportCheck({ run }: { run: ImportRun | undefined }) {
  const report = run?.report;
  if (!run || !report) return <p className="text-sm text-muted">Loading the import report…</p>;
  const { verification: v, reconciliation: r } = report;
  const allMatch = v.matched === v.checked && r.comments_imported === r.source_rows;
  const notices = new Set(report.notices.map((notice) => notice.row)).size;
  return (
    <>
      <p className={`flex items-center gap-2 text-sm font-semibold ${allMatch ? "text-success" : "text-danger"}`}>
        {allMatch ? <CircleCheck aria-hidden className="size-4" /> : <CircleX aria-hidden className="size-4" />}
        {allMatch ? `All ${v.checked} comments were saved and match the file.` : `${v.matched} of ${v.checked} comments match the file.`}
      </p>
      <p className="mt-1 text-sm text-muted">
        From {run.filename}.{" "}
        {notices === 0
          ? "Nothing needed a second look."
          : `${notices} ${notices === 1 ? "comment needs" : "comments need"} a look, and each is marked where it lives.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/import/?id=${run.id}`} className={ui.button}>
          <ClipboardCheck aria-hidden className="size-4" />
          View the report
        </Link>
        <button type="button" onClick={() => void api.downloadImportFile(run.id, run.filename)} className={ui.button}>
          <Download aria-hidden className="size-4" />
          Download original file
        </button>
      </div>
    </>
  );
}
