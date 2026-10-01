"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { api } from "@/lib/api";

import { RetryButton } from "./States";
import { ui } from "./styles";

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function TemplateList() {
  const query = useQuery({ queryKey: ["templates"], queryFn: api.listTemplates });

  if (query.isPending) {
    return <div aria-busy="true" aria-label="Loading templates" className={`h-32 animate-pulse ${ui.card}`} />;
  }
  if (query.isError) {
    return (
      <div role="alert" className={`p-5 text-sm ${ui.card}`}>
        <p className="font-semibold text-danger">{query.error.message}</p>
        <div className="mt-4">
          <RetryButton onRetry={() => query.refetch()} />
        </div>
      </div>
    );
  }
  if (query.data.length === 0) {
    return <p className={`px-5 py-4 text-sm text-muted ${ui.well}`}>No templates yet. Import one from Spectora above.</p>;
  }
  return (
    <div className={`px-2 py-1 ${ui.card}`}>
      <table className="w-full text-sm">
        <thead className={ui.tableHead}>
          <tr>
            <th scope="col" className="px-4 pb-2 pt-4">Template</th>
            <th scope="col" className="px-4 pb-2 pt-4">Contents</th>
            <th scope="col" className="px-4 pb-2 pt-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {query.data.map((template) => (
            <tr key={template.id}>
              <td className="px-4 py-3.5">
                <Link href={`/template/?id=${template.id}`} className={ui.link}>
                  {template.name}
                </Link>
                {template.is_sample && <Tag>Sample</Tag>}
                {template.copied_from_id && <Tag>Copy</Tag>}
              </td>
              <td className="px-4 py-3.5 tabular-nums text-muted">
                {template.counts.sections} sections · {template.counts.items} items · {template.counts.comments} comments
              </td>
              <td className="px-4 py-3.5 text-muted">{date.format(new Date(template.created_at))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className={`ml-2 ${ui.badge} text-muted`}>{children}</span>
  );
}
