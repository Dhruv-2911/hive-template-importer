"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { ApiError, api, type Notice, type TemplateTree } from "@/lib/api";
import { useTemplateEdits } from "@/lib/useTemplateEdits";

import { ItemComments } from "./ItemComments";
import { SectionTree } from "./SectionTree";
import { TemplateHeader } from "./TemplateHeader";
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
  const edits = useTemplateEdits(id ?? "");
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
      <TemplateHeader template={template} edits={edits} />
      <div className="flex min-h-0 flex-1">
        <SectionTree sections={template.sections} selectedItemId={selection?.item.id} onSelect={openItem} />
        <main ref={main} className="relative min-w-0 flex-1 overflow-y-auto bg-white">
          {selection && (
            <ItemComments
              section={selection.section}
              item={selection.item}
              highlightedRow={row}
              notesByRow={notesByRow}
              edits={edits}
            />
          )}
        </main>
      </div>
    </div>
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
