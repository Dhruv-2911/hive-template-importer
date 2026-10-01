"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, type TemplateTree } from "@/lib/api";
import type { TemplateEdits } from "@/lib/useTemplateEdits";

import { InlineName } from "./InlineName";

const BUTTON =
  "shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60";

export function TemplateHeader({ template, edits }: { template: TemplateTree; edits: TemplateEdits }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const duplicate = useMutation({
    mutationFn: () => api.duplicateTemplate(template.id),
    onSuccess: ({ template_id }) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/template/?id=${template_id}`);
    },
  });
  const items = template.sections.flatMap((section) => section.items);
  const comments = items.reduce((total, item) => total + item.comments.length, 0);

  return (
    <header className="flex items-center justify-between gap-6 border-b border-zinc-200 bg-white px-6 py-4">
      <div className="min-w-0">
        <Link href="/templates/" className="text-sm text-teal-700 hover:underline">
          Templates
        </Link>
        <div className="flex items-center gap-2">
          <InlineName
            kind="template"
            value={template.name}
            source={template.source_name}
            onSave={edits.renameTemplate}
            as="h1"
            className="text-lg font-semibold text-zinc-900"
          />
          {template.is_sample && <Badge>Sample</Badge>}
          {template.copied_from_id && <Badge>Copy</Badge>}
        </div>
        <p className="text-sm text-zinc-500">
          Imported from Spectora · {template.sections.length} sections · {items.length} items · {comments} comments
          {template.copied_from_id && (
            <>
              {" · "}
              <Link href={`/template/?id=${template.copied_from_id}`} className="text-teal-700 hover:underline">
                Open the original
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {duplicate.isError && (
          <p role="alert" className="text-sm text-red-700">
            {duplicate.error.message}
          </p>
        )}
        <button type="button" className={BUTTON} disabled={duplicate.isPending} onClick={() => duplicate.mutate()}>
          {duplicate.isPending ? "Duplicating…" : "Duplicate"}
        </button>
        {template.import_run_id && (
          <Link href={`/import/?id=${template.import_run_id}`} className={BUTTON}>
            Import report
          </Link>
        )}
      </div>
    </header>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded border border-zinc-300 px-1.5 py-px text-xs font-medium text-zinc-600">{children}</span>
  );
}
