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
        <p className="font-semibold text-danger">The templates couldn&apos;t be loaded.</p>
        <p className="mt-1 text-muted">{query.error.message}</p>
        <div className="mt-4">
          <RetryButton onRetry={() => query.refetch()} />
        </div>
      </div>
    );
  }
  if (query.data.length === 0) {
    return (
      <p className={`px-5 py-8 text-center text-sm text-muted ${ui.card}`}>
        No templates yet. Use <strong>Import from Spectora</strong> to bring one across.
      </p>
    );
  }
  return (
    <div className={`overflow-hidden ${ui.card}`}>
      <table className="w-full text-sm">
        <thead className={`border-b border-line bg-page ${ui.tableHead}`}>
          <tr>
            <th scope="col" className="px-5 py-2.5">Template</th>
            <th scope="col" className="px-5 py-2.5">Contents</th>
            <th scope="col" className="px-5 py-2.5">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {query.data.map((template) => (
            <tr key={template.id} className="hover:bg-page">
              <td className="px-5 py-3.5">
                <Link href={`/template/?id=${template.id}`} className={ui.link}>
                  {template.name}
                </Link>
                {template.is_sample && <Tag>Sample</Tag>}
                {template.copied_from_id && <Tag>Copy</Tag>}
              </td>
              <td className="px-5 py-3.5 tabular-nums text-muted">
                {template.counts.sections} sections · {template.counts.items} items · {template.counts.comments} comments
              </td>
              <td className="px-5 py-3.5 text-muted">{date.format(new Date(template.created_at))}</td>
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
