"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ApiError, api, type ImportRun } from "@/lib/api";

import { ReportColumns } from "./report/ReportColumns";
import { ReportNotices } from "./report/ReportNotices";
import { ReportSummary } from "./report/ReportSummary";
import { LinkButton, PageMessage, RetryButton } from "./States";

const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function ImportScreen() {
  const id = useSearchParams().get("id");
  const query = useQuery({ queryKey: ["import", id], queryFn: () => api.getImport(id!), enabled: !!id });
  const templateId = query.data?.template_id ?? undefined;
  // Shares its cache with the template screen, so opening the template afterwards is instant.
  const template = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => api.getTemplate(templateId!),
    enabled: !!templateId,
  });

  if (!id || (query.error instanceof ApiError && query.error.code === "NOT_FOUND")) {
    return (
      <PageMessage title="This import doesn't exist" action={<LinkButton href="/templates/">See all templates</LinkButton>}>
        It may have been deleted, or the link is incomplete.
      </PageMessage>
    );
  }
  if (query.isPending) return <PageMessage title="Loading the import report…">One moment.</PageMessage>;
  if (query.isError) {
    return (
      <PageMessage title="The import report couldn't be loaded" action={<RetryButton onRetry={() => query.refetch()} />}>
        {query.error.message}
      </PageMessage>
    );
  }

  const run = query.data;
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <ReportHeader run={run} />
      {run.report ? (
        <>
          <ReportSummary report={run.report} />
          <ReportNotices notices={run.report.notices} template={template.data} />
          <ReportColumns report={run.report} />
        </>
      ) : (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">This file wasn&apos;t imported, and nothing was saved.</p>
          <p className="mt-1">{run.error?.message}</p>
          <div className="mt-3">
            <LinkButton href="/templates/">Import another file</LinkButton>
          </div>
        </div>
      )}
    </main>
  );
}

function ReportHeader({ run }: { run: ImportRun }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/templates/" className="text-sm text-teal-700 hover:underline">
          Templates
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Import report</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {run.filename} · {date.format(new Date(run.created_at))}
        </p>
      </div>
      <div className="flex gap-3">
        {run.status === "succeeded" && (
          <a href={api.importFileUrl(run.id)} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
            Download original file
          </a>
        )}
        {run.template_id && (
          <Link
            href={`/template/?id=${run.template_id}`}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            Open template
          </Link>
        )}
      </div>
    </header>
  );
}
