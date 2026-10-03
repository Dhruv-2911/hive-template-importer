"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { api, type TemplateTree } from "@/lib/api";

import { ui } from "./styles";

/** The bar above a template: search on the left, the template's actions on the right. */
export function TemplateHeader({ template, search }: { template: TemplateTree; search: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const duplicate = useMutation({
    mutationFn: () => api.duplicateTemplate(template.id),
    onSuccess: ({ template_id }) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/template/?id=${template_id}`);
    },
  });

  return (
    <header className="flex items-center justify-between gap-6 border-b border-line bg-surface px-6 py-3">
      <div className="min-w-0 max-w-xl flex-1">{search}</div>
      <div className="flex shrink-0 items-center gap-3">
        {duplicate.isError && (
          <p role="alert" className="text-sm font-medium text-danger">
            {duplicate.error.message}
          </p>
        )}
        {template.import_run_id && (
          <Link href={`/import/?id=${template.import_run_id}`} className={ui.button}>
            <ClipboardCheck aria-hidden className="size-4" />
            Import report
          </Link>
        )}
        <button type="button" className={ui.primary} disabled={duplicate.isPending} onClick={() => duplicate.mutate()}>
          <Copy aria-hidden className="size-4" />
          {duplicate.isPending ? "Duplicating…" : "Duplicate"}
        </button>
      </div>
    </header>
  );
}
