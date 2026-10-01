import Link from "next/link";

import type { Notice, TemplateTree } from "@/lib/api";
import { groupNotices, noticeKind } from "@/lib/notices";

import { ui } from "../styles";

type Props = { notices: Notice[]; template: TemplateTree | undefined };

/** Row-level notices, grouped by kind. Each row links to its comment in the template. */
export function ReportNotices({ notices, template }: Props) {
  const where = locations(template);
  return (
    <section aria-labelledby="notices-heading">
      <h2 id="notices-heading" className={`mb-4 ${ui.sectionHeading}`}>
        Needs a look <span className="font-semibold text-meta">({notices.length})</span>
      </h2>
      {notices.length === 0 ? (
        <p className={`px-5 py-4 text-sm text-muted ${ui.well}`}>Nothing. Every row came in as it was.</p>
      ) : (
        <div className="space-y-6">
          {groupNotices(notices).map(({ code, notices: group }) => {
            // When every row says the same thing, say it once in the header instead of on each row.
            const shared = group.every((n) => n.message === group[0].message) ? group[0].message : undefined;
            return (
            <div key={code} className={ui.card}>
              <div className="px-6 pb-3 pt-5">
                <h3 className="font-bold text-ink">
                  {noticeKind(code).title} <span className="font-semibold text-meta">({group.length})</span>
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">{shared ?? noticeKind(code).explanation}</p>
              </div>
              <ul className="mx-3 mb-3 divide-y divide-line rounded-control px-3 text-sm neu-pressed-sm">
                {group.map((notice) => (
                  <li key={`${code}-${notice.row}`} className="px-1 py-2.5">
                    {template ? (
                      <Link
                        href={`/template/?id=${template.id}&row=${notice.row}`}
                        className={ui.link}
                      >
                        Row {notice.row}
                        {where.get(notice.row) && <span className="font-normal"> · {where.get(notice.row)}</span>}
                      </Link>
                    ) : (
                      <span className="font-medium">Row {notice.row}</span>
                    )}
                    {!shared && <p className="mt-0.5 text-muted">{notice.message}</p>}
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
