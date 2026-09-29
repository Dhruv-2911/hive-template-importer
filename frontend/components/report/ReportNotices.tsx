import Link from "next/link";

import type { Notice, TemplateTree } from "@/lib/api";
import { groupNotices, noticeKind } from "@/lib/notices";

type Props = { notices: Notice[]; template: TemplateTree | undefined };

/** Row-level notices, grouped by kind. Each row links to its comment in the template. */
export function ReportNotices({ notices, template }: Props) {
  const where = locations(template);
  return (
    <section aria-labelledby="notices-heading">
      <h2 id="notices-heading" className="mb-2 font-semibold text-zinc-900">
        Needs a look <span className="font-normal text-zinc-500">({notices.length})</span>
      </h2>
      {notices.length === 0 ? (
        <p className="text-sm text-zinc-600">Nothing. Every row came in as it was.</p>
      ) : (
        <div className="space-y-4">
          {groupNotices(notices).map(({ code, notices: group }) => {
            // When every row says the same thing, say it once in the header instead of on each row.
            const shared = group.every((n) => n.message === group[0].message) ? group[0].message : undefined;
            return (
            <div key={code} className="rounded-md border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-4 py-2">
                <h3 className="text-sm font-semibold text-zinc-900">
                  {noticeKind(code).title} <span className="font-normal text-zinc-500">({group.length})</span>
                </h3>
                <p className="text-sm text-zinc-600">{shared ?? noticeKind(code).explanation}</p>
              </div>
              <ul className="divide-y divide-zinc-100 text-sm">
                {group.map((notice) => (
                  <li key={`${code}-${notice.row}`} className="px-4 py-2">
                    {template ? (
                      <Link
                        href={`/template/?id=${template.id}&row=${notice.row}`}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        Row {notice.row}
                        {where.get(notice.row) && <span className="font-normal"> · {where.get(notice.row)}</span>}
                      </Link>
                    ) : (
                      <span className="font-medium">Row {notice.row}</span>
                    )}
                    {!shared && <p className="text-zinc-600">{notice.message}</p>}
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function locations(template: TemplateTree | undefined): Map<number, string> {
  const map = new Map<number, string>();
  for (const section of template?.sections ?? []) {
    for (const item of section.items) {
      for (const comment of item.comments) {
        map.set(comment.source_row, `${section.name} › ${item.name} › ${comment.name.trim() || "(no name)"}`);
      }
    }
  }
  return map;
}
