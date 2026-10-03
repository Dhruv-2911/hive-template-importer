"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ApiError, api, type ImportRun } from "@/lib/api";

import { ReportColumns } from "./report/ReportColumns";
import { ReportNotices } from "./report/ReportNotices";
import { ReportSummary } from "./report/ReportSummary";
import { LinkButton, PageMessage, RetryButton } from "./States";
import { ui } from "./styles";

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
    <main className="mx-auto w-full max-w-5xl space-y-10 px-6 py-12">
      <ReportHeader run={run} />
      {run.report ? (
        <>
          <ReportSummary report={run.report} />
          <ReportNotices notices={run.report.notices} template={template.data} />
          <ReportColumns report={run.report} />
        </>
      ) : (
        <div role="alert" className={`p-6 text-sm text-ink ${ui.card}`}>
          <p className="text-base font-bold text-danger">This file wasn&apos;t imported, and nothing was saved.</p>
          <p className="mt-1 text-muted">{run.error?.message}</p>
          <div className="mt-5">
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
        <Link href="/templates/" className={`text-sm ${ui.link}`}>
          Templates
        </Link>
        <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-ink">Import report</h1>
        <p className="mt-2 text-sm text-muted">
          {run.filename} · {date.format(new Date(run.created_at))}
        </p>
      </div>
      <div className="flex gap-4">
        {run.status === "succeeded" && (
          <button type="button" onClick={() => void api.downloadImportFile(run.id, run.filename)} className={ui.button}>
            Download original file
          </button>
        )}
        {run.template_id && (
          <Link href={`/template/?id=${run.template_id}`} className={ui.primary}>
            Open template
          </Link>
        )}
      </div>
    </header>
  );
}
