"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";

import { ui } from "./styles";

/** Upload a Spectora export. On success, open its import report; on refusal, say why and what to do. */
export function UploadExport() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: api.importFile,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      router.push(`/import/?id=${created.import_run_id}`);
    },
  });
  const error = upload.error instanceof ApiError ? upload.error : undefined;
  const missing = (error?.details.missing_headers as string[] | undefined) ?? [];

  return (
    <section aria-labelledby="upload-heading" className={`p-6 ${ui.card}`}>
      <h2 id="upload-heading" className={ui.sectionHeading}>
        Import from Spectora
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
        In Spectora, open the template and choose <strong>Export to spreadsheet → Export HTML Text</strong>. Then
        choose the file it downloads. Nothing is saved unless every comment checks out.
      </p>
      <div className="mt-5 flex items-center gap-4">
        <label className={`${ui.primary} ${ui.focusWithin} has-disabled:cursor-wait has-disabled:opacity-60`}>
          Choose export file…
          <input
            type="file"
            accept=".xls,.xlsx"
            aria-label="Choose a Spectora export"
            className="sr-only"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = ""; // choosing the same file again should upload it again
              if (file) upload.mutate(file);
            }}
          />
        </label>
        {upload.isPending && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-accent" />
            Importing and checking every comment…
          </p>
        )}
      </div>
      {upload.isError && (
        <div role="alert" className={`mt-5 px-5 py-4 text-sm text-ink ${ui.well}`}>
          <p className="font-bold text-danger">This file wasn&apos;t imported.</p>
          <p className="mt-1">{upload.error.message}</p>
          {missing.length > 0 && <p className="mt-1">Missing columns: {missing.join(", ")}.</p>}
        </div>
      )}
    </section>
  );
}
