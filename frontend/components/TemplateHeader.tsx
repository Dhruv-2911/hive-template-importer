"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, type TemplateTree } from "@/lib/api";
import type { TemplateEdits } from "@/lib/useTemplateEdits";

import { InlineName } from "./InlineName";
import { ui } from "./styles";

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
    <header className="flex items-center justify-between gap-6 px-6 pb-5 pt-4">
      <div className="min-w-0">
        <Link href="/templates/" className={`text-sm ${ui.link}`}>
          Templates
        </Link>
        <div className="mt-0.5 flex items-center gap-2">
          <InlineName
            kind="template"
            value={template.name}
            source={template.source_name}
            onSave={edits.renameTemplate}
            as="h1"
            className="text-xl font-bold tracking-tight text-ink"
          />
          {template.is_sample && <Badge>Sample</Badge>}
          {template.copied_from_id && <Badge>Copy</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          Imported from Spectora · {template.sections.length} sections · {items.length} items · {comments} comments
          {template.copied_from_id && (
            <>
              {" · "}
              <Link href={`/template/?id=${template.copied_from_id}`} className={ui.link}>
                Open the original
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {duplicate.isError && (
          <p role="alert" className="text-sm font-medium text-danger">
            {duplicate.error.message}
          </p>
        )}
        <button type="button" className={ui.button} disabled={duplicate.isPending} onClick={() => duplicate.mutate()}>
          {duplicate.isPending ? "Duplicating…" : "Duplicate"}
        </button>
        {template.import_run_id && (
          <Link href={`/import/?id=${template.import_run_id}`} className={ui.button}>
            Import report
          </Link>
        )}
      </div>
    </header>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className={`${ui.badge} text-muted`}>{children}</span>
  );
}
