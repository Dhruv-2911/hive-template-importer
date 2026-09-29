"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { api } from "@/lib/api";

import { RetryButton } from "./States";

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function TemplateList() {
  const query = useQuery({ queryKey: ["templates"], queryFn: api.listTemplates });

  if (query.isPending) {
    return <div aria-busy="true" aria-label="Loading templates" className="h-32 animate-pulse rounded-md bg-zinc-100" />;
  }
  if (query.isError) {
    return (
      <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        <p>{query.error.message}</p>
        <div className="mt-3">
          <RetryButton onRetry={() => query.refetch()} />
        </div>
      </div>
    );
  }
  if (query.data.length === 0) {
    return <p className="text-sm text-zinc-600">No templates yet. Import one from Spectora above.</p>;
  }
  return (
    <table className="w-full overflow-hidden rounded-md border border-zinc-200 bg-white text-sm">
      <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
        <tr>
          <th scope="col" className="px-4 py-2 font-semibold">Template</th>
          <th scope="col" className="px-4 py-2 font-semibold">Contents</th>
          <th scope="col" className="px-4 py-2 font-semibold">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200">
        {query.data.map((template) => (
          <tr key={template.id}>
            <td className="px-4 py-3">
              <Link href={`/template/?id=${template.id}`} className="font-medium text-teal-700 hover:underline">
                {template.name}
              </Link>
              {template.is_sample && <Tag>Sample</Tag>}
              {template.copied_from_id && <Tag>Copy</Tag>}
            </td>
            <td className="px-4 py-3 tabular-nums text-zinc-600">
              {template.counts.sections} sections · {template.counts.items} items · {template.counts.comments} comments
            </td>
            <td className="px-4 py-3 text-zinc-600">{date.format(new Date(template.created_at))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="ml-2 rounded border border-zinc-300 px-1.5 py-px text-xs font-medium text-zinc-600">{children}</span>
  );
}
