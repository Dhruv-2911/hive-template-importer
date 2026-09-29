"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { ApiError, api, type Notice, type TemplateTree } from "@/lib/api";

import { ItemComments } from "./ItemComments";
import { SectionTree } from "./SectionTree";
import { LinkButton, PageMessage, RetryButton, TemplateSkeleton } from "./States";

export function TemplateScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const row = Number(params.get("row")) || undefined;
  const query = useQuery({ queryKey: ["template", id], queryFn: () => api.getTemplate(id!), enabled: !!id });
  const selection = query.data ? select(query.data, params.get("item"), row) : undefined;
  // The import report's notices, shown on the comments they're about (SPEC.md US3). A copy shares its original's.
  const runId = query.data?.import_run_id ?? undefined;
  const report = useQuery({ queryKey: ["import", runId], queryFn: () => api.getImport(runId!), enabled: !!runId });
  const notesByRow = notesFor(report.data?.report?.notices ?? []);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    // Scroll the comments pane only; scrollIntoView would also scroll the page and hide the header.
    const comment = row ? document.getElementById(`row-${row}`) : null;
    if (main.current && comment) main.current.scrollTo({ top: comment.offsetTop - main.current.clientHeight / 3 });
  }, [row, selection?.item.id]);

  if (!id) {
    return (
      <PageMessage title="No template chosen" action={<LinkButton href="/templates/">See all templates</LinkButton>}>
        Pick a template from the list.
      </PageMessage>
    );
  }
  if (query.isPending) return <TemplateSkeleton />;
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.code === "NOT_FOUND";
    return (
      <PageMessage
        title={notFound ? "This template doesn't exist" : "The template couldn't be loaded"}
        action={
          <>
            {!notFound && <RetryButton onRetry={() => query.refetch()} />}
            <LinkButton href="/templates/">See all templates</LinkButton>
          </>
        }
      >
        {notFound ? "It may have been deleted, or the link is incomplete." : query.error.message}
      </PageMessage>
    );
  }

  const template = query.data;
  const openItem = (itemId: string) => router.replace(`/template/?id=${id}&item=${itemId}`, { scroll: false });
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TemplateHeader template={template} />
      <div className="flex min-h-0 flex-1">
        <SectionTree sections={template.sections} selectedItemId={selection?.item.id} onSelect={openItem} />
        <main ref={main} className="relative min-w-0 flex-1 overflow-y-auto bg-white">
          {selection && (
            <ItemComments
              section={selection.section}
              item={selection.item}
              highlightedRow={row}
              notesByRow={notesByRow}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function TemplateHeader({ template }: { template: TemplateTree }) {
  const items = template.sections.flatMap((s) => s.items);
  const comments = items.reduce((total, item) => total + item.comments.length, 0);
  return (
    <header className="flex items-center justify-between gap-6 border-b border-zinc-200 bg-white px-6 py-4">
      <div className="min-w-0">
        <Link href="/templates/" className="text-sm text-teal-700 hover:underline">
          Templates
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-semibold text-zinc-900">{template.name}</h1>
          {template.is_sample && <Badge>Sample</Badge>}
          {template.copied_from_id && <Badge>Copy</Badge>}
        </div>
        <p className="text-sm text-zinc-500">
          Imported from Spectora · {template.sections.length} sections · {items.length} items · {comments} comments
        </p>
      </div>
      {template.import_run_id && (
        <Link
          href={`/import/?id=${template.import_run_id}`}
          className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Import report
        </Link>
      )}
    </header>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded border border-zinc-300 px-1.5 py-px text-xs font-medium text-zinc-600">{children}</span>
  );
}

function notesFor(notices: Notice[]): Map<number, Notice[]> {
  const byRow = new Map<number, Notice[]>();
  for (const notice of notices) byRow.set(notice.row, [...(byRow.get(notice.row) ?? []), notice]);
  return byRow;
}

/** The item to show: the one in the URL, else the one holding the linked row, else the first. */
function select(template: TemplateTree, itemId: string | null, row: number | undefined) {
  const pairs = template.sections.flatMap((section) => section.items.map((item) => ({ section, item })));
  return (
    pairs.find(({ item }) => item.id === itemId) ??
    (row ? pairs.find(({ item }) => item.comments.some((c) => c.source_row === row)) : undefined) ??
    pairs[0]
  );
}
